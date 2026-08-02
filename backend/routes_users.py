"""Users (CMS) domain — CRUD + password policy routes.

Extracted from server.py (behavior unchanged). Routes register on the shared
`api_router` at import time.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import HTTPException, Query, Response
from pydantic import BaseModel, Field

from server import (
    api_router, db, log_audit, _diff_changes, BulkDeleteRequest,
    DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, EMAIL_RE,
    _normalize_optionals, _next_user_id, _assert_user_unique, _validate_role_office,
    _enrich_maps, _user_public, _hash_password, _verify_password,
    DEFAULT_USER_PASSWORD, PASSWORD_EXPIRY_DAYS, PASSWORD_HISTORY_LIMIT,
)


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., pattern=EMAIL_RE)
    role_id: str = Field(..., min_length=1)
    office_id: Optional[str] = None
    user_id: Optional[int] = Field(None, ge=1)
    username: Optional[str] = None
    phone: Optional[str] = None
    alias: Optional[str] = None
    mso_code: Optional[str] = None
    collector_code: Optional[str] = None
    device_identifier: Optional[str] = None
    device_name: Optional[str] = None
    device_os: Optional[str] = None
    fcm_token: Optional[str] = None
    is_active: bool = True


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    email: Optional[str] = Field(None, pattern=EMAIL_RE)
    role_id: Optional[str] = Field(None, min_length=1)
    office_id: Optional[str] = Field(None, min_length=1)
    user_id: Optional[int] = Field(None, ge=1)
    username: Optional[str] = None
    phone: Optional[str] = None
    alias: Optional[str] = None
    mso_code: Optional[str] = None
    collector_code: Optional[str] = None
    device_identifier: Optional[str] = None
    device_name: Optional[str] = None
    device_os: Optional[str] = None
    fcm_token: Optional[str] = None
    is_active: Optional[bool] = None


class ChangePasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=128)


class ResetPasswordRequest(BaseModel):
    new_password: Optional[str] = Field(None, min_length=6, max_length=128)


@api_router.post("/users", status_code=201, tags=["Users"], summary="Create user")
async def create_user(payload: UserCreate):
    """Create a user with the system default password (must be changed on first login)."""
    data = _normalize_optionals(payload.model_dump())
    if data.get("user_id") is None:
        data["user_id"] = await _next_user_id()
    await _assert_user_unique(data)
    await _validate_role_office(data["role_id"], data.get("office_id"))
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    pw_hash = _hash_password(DEFAULT_USER_PASSWORD)
    doc = {
        "id": str(uuid.uuid4()),
        **data,
        "password": pw_hash,
        "password_history": [pw_hash],
        "password_changed_at": now_iso,
        "password_expires_at": (now + timedelta(days=PASSWORD_EXPIRY_DAYS)).isoformat(),
        "must_change_password": True,
        "deleted_at": None,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    await db.users.insert_one(doc)
    roles, offices = await _enrich_maps([doc])
    await log_audit(
        "create", "user", entity_id=doc["id"],
        entity_label=f"{doc['name']} <{doc['email']}>",
        summary=f"Created user {doc['name']} <{doc['email']}>",
        method="POST", path="/api/users", status_code=201,
        request=data, response={"id": doc["id"]},
    )
    return _user_public(doc, roles, offices)


@api_router.get("/users", tags=["Users"], summary="List users (paginated, excludes deleted)")
async def list_users(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
):
    """List active (non-deleted) users, newest first, enriched with role/office names."""
    q = {"deleted_at": None}
    total = await db.users.count_documents(q)
    response.headers["X-Total-Count"] = str(total)
    docs = (
        await db.users.find(q, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    )
    if not docs:
        return []
    roles, offices = await _enrich_maps(docs)
    return [_user_public(d, roles, offices) for d in docs]


@api_router.post("/users/bulk-delete", tags=["Users"], summary="Bulk soft-delete users")
async def bulk_delete_users(payload: BulkDeleteRequest):
    """Soft-delete multiple users by id."""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.users.update_many(
        {"id": {"$in": payload.ids}, "deleted_at": None},
        {"$set": {"deleted_at": now, "updated_at": now}},
    )
    await log_audit(
        "bulk_delete", "user",
        summary=f"Bulk soft-deleted {result.modified_count} user(s)",
        method="POST", path="/api/users/bulk-delete", status_code=200,
        request={"ids": payload.ids}, response={"deleted": result.modified_count},
        metadata={"count": result.modified_count},
    )
    return {"success": True, "deleted": result.modified_count}


@api_router.get("/users/{user_id}", tags=["Users"], summary="Get user")
async def get_user(user_id: str):
    """Fetch a single active user by id (404 if not found or deleted)."""
    doc = await db.users.find_one({"id": user_id, "deleted_at": None}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    roles, offices = await _enrich_maps([doc])
    return _user_public(doc, roles, offices)


@api_router.put("/users/{user_id}", tags=["Users"], summary="Update user (non-password fields)")
async def update_user(user_id: str, payload: UserUpdate):
    """Update user profile fields. Returns 404 if missing, 409 on unique conflict."""
    doc = await db.users.find_one({"id": user_id, "deleted_at": None}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    updates = _normalize_optionals(payload.model_dump(exclude_unset=True))
    if "user_id" in updates and updates["user_id"] is None:
        updates.pop("user_id")  # user_id cannot be cleared
    if updates:
        await _assert_user_unique({**doc, **updates}, exclude_id=user_id)
        await _validate_role_office(updates.get("role_id"), updates.get("office_id"))
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        changes = _diff_changes(doc, updates)
        await db.users.update_one({"id": user_id}, {"$set": updates})
        doc.update(updates)
        await log_audit(
            "update", "user", entity_id=user_id,
            entity_label=f"{doc['name']} <{doc['email']}>",
            summary=f"Updated user {doc['name']} <{doc['email']}>",
            method="PUT", path=f"/api/users/{user_id}", status_code=200,
            request=payload.model_dump(exclude_unset=True), response={"id": user_id},
            changes=changes,
        )
    roles, offices = await _enrich_maps([doc])
    return _user_public(doc, roles, offices)


@api_router.post("/users/{user_id}/change-password", tags=["Users"], summary="Change password")
async def change_password(user_id: str, payload: ChangePasswordRequest):
    """Change a user's password. Rejects reuse of the last N passwords and resets expiry."""
    doc = await db.users.find_one({"id": user_id, "deleted_at": None}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    history = doc.get("password_history") or []
    recent = history if doc.get("password") in history else [doc.get("password"), *history]
    recent = [h for h in recent if h]
    for h in recent[:PASSWORD_HISTORY_LIMIT]:
        if _verify_password(payload.new_password, h):
            raise HTTPException(
                status_code=400,
                detail=f"New password must differ from the last {PASSWORD_HISTORY_LIMIT} passwords",
            )
    new_hash = _hash_password(payload.new_password)
    new_history = [new_hash, *recent][:PASSWORD_HISTORY_LIMIT]
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "password": new_hash,
            "password_history": new_history,
            "password_changed_at": now_iso,
            "password_expires_at": (now + timedelta(days=PASSWORD_EXPIRY_DAYS)).isoformat(),
            "must_change_password": False,
            "updated_at": now_iso,
        }},
    )
    await log_audit(
        "change_password", "user", entity_id=user_id,
        entity_label=f"{doc['name']} <{doc['email']}>",
        summary=f"Changed password for {doc['name']} <{doc['email']}>",
        method="POST", path=f"/api/users/{user_id}/change-password", status_code=200,
        request={"new_password": "«redacted»"}, response={"success": True},
    )
    return {"success": True}


@api_router.post("/users/{user_id}/reset-password", tags=["Users"], summary="Admin reset password")
async def reset_password(user_id: str, payload: ResetPasswordRequest):
    """Admin reset to the system default (or a provided value); forces change on next login."""
    doc = await db.users.find_one({"id": user_id, "deleted_at": None}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    raw = payload.new_password or DEFAULT_USER_PASSWORD
    new_hash = _hash_password(raw)
    history = doc.get("password_history") or []
    recent = history if doc.get("password") in history else [doc.get("password"), *history]
    new_history = [new_hash, *[h for h in recent if h]][:PASSWORD_HISTORY_LIMIT]
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "password": new_hash,
            "password_history": new_history,
            "password_changed_at": now_iso,
            "password_expires_at": (now + timedelta(days=PASSWORD_EXPIRY_DAYS)).isoformat(),
            "must_change_password": True,
            "updated_at": now_iso,
        }},
    )
    await log_audit(
        "reset_password", "user", entity_id=user_id,
        entity_label=f"{doc['name']} <{doc['email']}>",
        summary=f"Admin reset password for {doc['name']} <{doc['email']}>",
        method="POST", path=f"/api/users/{user_id}/reset-password", status_code=200,
        request={"new_password": "«redacted»"},
        response={"must_change_password": True},
        metadata={"to_default": payload.new_password is None},
    )
    return {"success": True, "must_change_password": True}


@api_router.delete("/users/{user_id}", tags=["Users"], summary="Soft-delete user")
async def delete_user(user_id: str):
    """Soft-delete a user (sets deleted_at); 404 if not found or already deleted."""
    doc = await db.users.find_one({"id": user_id, "deleted_at": None}, {"_id": 0, "name": 1, "email": 1})
    now = datetime.now(timezone.utc).isoformat()
    result = await db.users.update_one(
        {"id": user_id, "deleted_at": None},
        {"$set": {"deleted_at": now, "updated_at": now}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    label = f"{doc['name']} <{doc['email']}>" if doc else user_id
    await log_audit(
        "delete", "user", entity_id=user_id, entity_label=label,
        summary=f"Soft-deleted user {label}",
        method="DELETE", path=f"/api/users/{user_id}", status_code=200,
        response={"success": True},
    )
    return {"success": True}
