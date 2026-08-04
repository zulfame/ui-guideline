"""Roles / Jabatan (CMS) domain — hierarchical tree CRUD.

Extracted from server.py (behavior unchanged). Routes register on the shared
`api_router` at import time.
"""
import io
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from pydantic import BaseModel, Field, ConfigDict
from pymongo import UpdateOne

from server import (
    api_router, db, log_audit, _diff_changes, BulkDeleteRequest,
    DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE,
)

# Roles that grant full access and must never be deleted (match by name,
# case-insensitive). Protects against accidental removal of the admin role.
PROTECTED_ROLE_NAMES = {"super admin"}


def _is_protected_role(name: Optional[str]) -> bool:
    return bool(name) and name.strip().lower() in PROTECTED_ROLE_NAMES


# ---------------------------------------------------------------------------
# Roles / Jabatan (CMS) — hierarchical tree via parent_id
# ---------------------------------------------------------------------------
class Role(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    parent_id: Optional[str] = None
    dotted_parent_id: Optional[str] = None
    level_id: Optional[str] = None
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RoleCreate(BaseModel):
    name: str = Field(..., min_length=1)
    parent_id: Optional[str] = None
    dotted_parent_id: Optional[str] = None
    level_id: Optional[str] = None
    order: int = 0


class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    parent_id: Optional[str] = None
    dotted_parent_id: Optional[str] = None
    level_id: Optional[str] = None
    order: Optional[int] = None


def _role_to_doc(role: Role) -> dict:
    doc = role.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    return doc


async def _assert_role_name_unique(name: str, exclude_id: Optional[str] = None):
    query = {"name": name}
    if exclude_id:
        query = {"$and": [{"id": {"$ne": exclude_id}}, {"name": name}]}
    if await db.roles.find_one(query, {"_id": 0}):
        raise HTTPException(status_code=409, detail="Role name already exists")


async def _role_parent_map() -> dict:
    docs = await db.roles.find({}, {"_id": 0, "id": 1, "parent_id": 1}).to_list(10000)
    return {d["id"]: d.get("parent_id") for d in docs}


def _ancestors(pmap: dict, rid: str) -> list:
    chain, seen = [], set()
    p = pmap.get(rid)
    while p is not None and p not in seen:
        seen.add(p)
        chain.append(p)
        p = pmap.get(p)
    return chain


async def _validate_parent(parent_id: Optional[str], role_id: Optional[str] = None):
    """Parent must exist; setting it must not create a cycle."""
    if parent_id is None:
        return
    if parent_id == role_id:
        raise HTTPException(status_code=400, detail="A role cannot be its own parent")
    if not await db.roles.find_one({"id": parent_id}, {"_id": 0, "id": 1}):
        raise HTTPException(status_code=400, detail="Parent role not found")
    if role_id is not None:
        pmap = await _role_parent_map()
        if role_id in _ancestors(pmap, parent_id):
            raise HTTPException(
                status_code=400,
                detail="Cannot set parent to a descendant (would create a cycle)",
            )


async def _validate_dotted_parent(dotted_parent_id: Optional[str], role_id: Optional[str] = None):
    """Dotted-line superior must exist and cannot be the role itself."""
    if dotted_parent_id is None:
        return
    if dotted_parent_id == role_id:
        raise HTTPException(
            status_code=400, detail="A role cannot be its own dotted-line superior"
        )
    if not await db.roles.find_one({"id": dotted_parent_id}, {"_id": 0, "id": 1}):
        raise HTTPException(status_code=400, detail="Dotted-line superior not found")


async def _validate_level(level_id: Optional[str]):
    if level_id is None:
        return
    if not await db.levels.find_one({"id": level_id}, {"_id": 0, "id": 1}):
        raise HTTPException(status_code=400, detail="Level not found")


@api_router.post("/roles", response_model=Role, status_code=201, tags=["Roles"], summary="Create role")
async def create_role(payload: RoleCreate):
    """Create a role. Validates unique name, parent/dotted-parent/level existence & cycles."""
    await _assert_role_name_unique(payload.name)
    await _validate_parent(payload.parent_id)
    await _validate_dotted_parent(payload.dotted_parent_id)
    await _validate_level(payload.level_id)
    role = Role(**payload.model_dump())
    await db.roles.insert_one(_role_to_doc(role))
    await log_audit(
        "create", "role", entity_id=role.id, entity_label=role.name,
        summary=f"Created role {role.name}",
        method="POST", path="/api/roles", status_code=201,
        request=payload.model_dump(), response={"id": role.id},
    )
    return role


@api_router.get("/roles", response_model=List[Role], tags=["Roles"], summary="List roles (paginated)")
async def list_roles(
    response: Response,
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Max records to return"),
):
    """List roles by name. Bounded by `limit` (max 500); total count in `X-Total-Count`.

    The org-chart consumer requests the full set (up to the cap) via `?limit=500`.
    """
    total = await db.roles.count_documents({})
    response.headers["X-Total-Count"] = str(total)
    docs = (
        await db.roles.find({}, {"_id": 0})
        .sort("name", 1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return [Role(**d) for d in docs]


@api_router.post("/roles/bulk-delete", tags=["Roles"], summary="Bulk delete roles")
async def bulk_delete_roles(payload: BulkDeleteRequest):
    """Delete roles and promote orphaned children to their nearest surviving ancestor.

    Child promotions are applied via a single batched `bulk_write` (Guideline:
    Batch Processing) to reduce round-trips and the partial-failure window.
    """
    deleted_set = set(payload.ids)
    protected = await db.roles.find(
        {"id": {"$in": payload.ids}}, {"_id": 0, "name": 1}
    ).to_list(len(payload.ids) or 1)
    if any(_is_protected_role(r.get("name")) for r in protected):
        raise HTTPException(
            status_code=409,
            detail="The 'Super Admin' role is protected and cannot be deleted.",
        )
    in_use = await db.users.distinct(
        "role_id", {"role_id": {"$in": payload.ids}, "deleted_at": None}
    )
    if in_use:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot delete: {len(in_use)} of the selected roles are still "
                "assigned to active users. Reassign those users first."
            ),
        )
    pmap = await _role_parent_map()
    result = await db.roles.delete_many({"id": {"$in": payload.ids}})
    now = datetime.now(timezone.utc).isoformat()
    ops = []
    for rid, parent in pmap.items():
        if rid in deleted_set or parent not in deleted_set:
            continue
        p = parent
        while p is not None and p in deleted_set:
            p = pmap.get(p)
        ops.append(UpdateOne({"id": rid}, {"$set": {"parent_id": p, "updated_at": now}}))
    if ops:
        await db.roles.bulk_write(ops, ordered=False)
    await log_audit(
        "bulk_delete", "role",
        summary=f"Bulk-deleted {result.deleted_count} role(s)",
        method="POST", path="/api/roles/bulk-delete", status_code=200,
        request={"ids": payload.ids}, response={"deleted": result.deleted_count},
        metadata={"count": result.deleted_count, "children_promoted": len(ops)},
    )
    return {"success": True, "deleted": result.deleted_count}


@api_router.get("/roles/export", tags=["Roles"], summary="Export roles (CSV/Excel)")
async def export_roles(format: str = Query("xlsx", description="csv | xlsx")):
    """Stream all roles as a CSV or Excel file with parent / dotted-superior / level
    resolved to their names. Registered BEFORE /roles/{role_id} so 'export' isn't
    captured as a role id."""
    docs = await db.roles.find({}, {"_id": 0}).sort("name", 1).to_list(10000)
    role_names = {d["id"]: d.get("name") for d in docs}
    level_ids = [d.get("level_id") for d in docs if d.get("level_id")]
    level_names = {}
    if level_ids:
        async for lv in db.levels.find({"id": {"$in": level_ids}}, {"_id": 0, "id": 1, "name": 1}):
            level_names[lv["id"]] = lv.get("name")
    headers = ["ID", "Name", "Parent", "Parent ID", "Dotted Superior", "Dotted Superior ID", "Level", "Level ID", "Order"]
    rows = [
        [
            d.get("id"),
            d.get("name"),
            role_names.get(d.get("parent_id")) or "",
            d.get("parent_id") or "",
            role_names.get(d.get("dotted_parent_id")) or "",
            d.get("dotted_parent_id") or "",
            level_names.get(d.get("level_id")) or "",
            d.get("level_id") or "",
            d.get("order", 0),
        ]
        for d in docs
    ]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    await log_audit(
        "export", "role",
        summary=f"Exported {len(rows)} role(s) as {format}",
        method="GET", path="/api/roles/export", status_code=200,
        metadata={"count": len(rows), "format": format},
    )
    if format == "xlsx":
        wb = Workbook()
        ws = wb.active
        ws.title = "Roles"
        ws.append(headers)
        for r in rows:
            ws.append(r)
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="roles_{stamp}.xlsx"'},
        )
    import csv
    sbuf = io.StringIO()
    writer = csv.writer(sbuf)
    writer.writerow(headers)
    for r in rows:
        writer.writerow(r)
    data = sbuf.getvalue().encode("utf-8-sig")
    return StreamingResponse(
        io.BytesIO(data),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="roles_{stamp}.csv"'},
    )


@api_router.get("/roles/{role_id}", response_model=Role, tags=["Roles"], summary="Get role")
async def get_role(role_id: str):
    """Fetch a single role by id (404 if not found)."""
    doc = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Role not found")
    return Role(**doc)


@api_router.put("/roles/{role_id}", response_model=Role, tags=["Roles"], summary="Update role")
async def update_role(role_id: str, payload: RoleUpdate):
    """Update a role. Validates unique name, parent/dotted-parent/level & cycles."""
    doc = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Role not found")
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        await _assert_role_name_unique(updates["name"], exclude_id=role_id)
    if "parent_id" in updates:
        await _validate_parent(updates["parent_id"], role_id=role_id)
    if "dotted_parent_id" in updates:
        await _validate_dotted_parent(updates["dotted_parent_id"], role_id=role_id)
    if "level_id" in updates:
        await _validate_level(updates["level_id"])
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    changes = _diff_changes(doc, updates)
    await db.roles.update_one({"id": role_id}, {"$set": updates})
    doc.update(updates)
    await log_audit(
        "update", "role", entity_id=role_id, entity_label=doc["name"],
        summary=f"Updated role {doc['name']}",
        method="PUT", path=f"/api/roles/{role_id}", status_code=200,
        request=payload.model_dump(exclude_unset=True), response={"id": role_id},
        changes=changes,
    )
    return Role(**doc)


@api_router.delete("/roles/{role_id}", tags=["Roles"], summary="Delete role")
async def delete_role(
    role_id: str,
    reassign_to: Optional[str] = Query(None, description="Role id to move linked users to before deleting"),
):
    """Delete a role: promote direct children to this role's parent, clear dotted refs.

    Referential integrity (RESTRICT): a role cannot be deleted while it is still
    assigned to active users — unless `reassign_to` is provided, in which case
    those users are moved to the target role first.
    """
    doc = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Role not found")
    if _is_protected_role(doc.get("name")):
        raise HTTPException(
            status_code=409,
            detail="The 'Super Admin' role is protected and cannot be deleted.",
        )
    linked = await db.users.count_documents({"role_id": role_id, "deleted_at": None})
    if linked:
        if not reassign_to:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Cannot delete: {linked} active user(s) still have this role. "
                    "Reassign or remove them first."
                ),
            )
        if reassign_to == role_id:
            raise HTTPException(status_code=400, detail="Reassign target must be a different role")
        if not await db.roles.find_one({"id": reassign_to}, {"_id": 0, "id": 1}):
            raise HTTPException(status_code=400, detail="Reassign target role not found")
        reassign_now = datetime.now(timezone.utc).isoformat()
        await db.users.update_many(
            {"role_id": role_id, "deleted_at": None},
            {"$set": {"role_id": reassign_to, "updated_at": reassign_now}},
        )
    now = datetime.now(timezone.utc).isoformat()
    await db.roles.delete_one({"id": role_id})
    await db.roles.update_many(
        {"parent_id": role_id},
        {"$set": {"parent_id": doc.get("parent_id"), "updated_at": now}},
    )
    # Clear dotted-line references pointing to the deleted role.
    await db.roles.update_many(
        {"dotted_parent_id": role_id},
        {"$set": {"dotted_parent_id": None, "updated_at": now}},
    )
    reassigned = linked if reassign_to else 0
    await log_audit(
        "reassign" if reassigned else "delete", "role", entity_id=role_id,
        entity_label=doc.get("name"),
        summary=(
            f"Reassigned {reassigned} user(s) then deleted role {doc.get('name')}"
            if reassigned else f"Deleted role {doc.get('name')}"
        ),
        method="DELETE", path=f"/api/roles/{role_id}", status_code=200,
        request={"reassign_to": reassign_to}, response={"reassigned": reassigned},
        metadata={"linked_users": linked, "reassign_to": reassign_to},
    )
    return {"success": True}

