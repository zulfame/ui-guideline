"""Offices (CMS) domain — FastAPI + MongoDB CRUD.

Extracted from server.py (behavior unchanged). Routes register on the shared
`api_router` at import time.
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, Query, Response
from pydantic import BaseModel, Field, ConfigDict

from server import (
    api_router, db, log_audit, _diff_changes, BulkDeleteRequest,
    DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE,
)


# ---------------------------------------------------------------------------
# Offices (CMS) — FastAPI + MongoDB CRUD
# ---------------------------------------------------------------------------
class Office(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    name: str
    address: Optional[str] = None
    telephone: Optional[str] = None
    longitude: Optional[float] = None
    latitude: Optional[float] = None
    radius: float = 100
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OfficeCreate(BaseModel):
    code: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    address: Optional[str] = None
    telephone: Optional[str] = None
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    radius: float = Field(100, ge=0)
    note: Optional[str] = None


class OfficeUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1)
    name: Optional[str] = Field(None, min_length=1)
    address: Optional[str] = None
    telephone: Optional[str] = None
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    radius: Optional[float] = Field(None, ge=0)
    note: Optional[str] = None


def _office_to_doc(office: Office) -> dict:
    doc = office.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    return doc


async def _assert_unique(code: str, name: str, exclude_id: Optional[str] = None):
    """Enforce unique code & name (app-level check complements the unique index)."""
    query = {"$or": [{"code": code}, {"name": name}]}
    if exclude_id:
        query = {"$and": [{"id": {"$ne": exclude_id}}, query]}
    existing = await db.offices.find_one(query, {"_id": 0})
    if existing:
        field = "code" if existing.get("code") == code else "name"
        raise HTTPException(status_code=409, detail=f"Office {field} already exists")


@api_router.post("/offices", response_model=Office, status_code=201, tags=["Offices"], summary="Create office")
async def create_office(payload: OfficeCreate):
    """Create an office. Returns 409 if the code or name already exists."""
    await _assert_unique(payload.code, payload.name)
    office = Office(**payload.model_dump())
    await db.offices.insert_one(_office_to_doc(office))
    await log_audit(
        "create", "office", entity_id=office.id,
        entity_label=f"{office.code} — {office.name}",
        summary=f"Created office {office.code} — {office.name}",
        method="POST", path="/api/offices", status_code=201,
        request=payload.model_dump(), response={"id": office.id},
    )
    return office


@api_router.get("/offices", response_model=List[Office], tags=["Offices"], summary="List offices (paginated)")
async def list_offices(
    response: Response,
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Max records to return"),
):
    """List offices, newest first. Bounded by `limit` (max 500); total count in `X-Total-Count`."""
    total = await db.offices.count_documents({})
    response.headers["X-Total-Count"] = str(total)
    docs = (
        await db.offices.find({}, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return [Office(**d) for d in docs]


@api_router.post("/offices/bulk-delete", tags=["Offices"], summary="Bulk delete offices")
async def bulk_delete_offices(payload: BulkDeleteRequest):
    """Delete multiple offices by id in a single operation.

    Referential integrity (RESTRICT): an office cannot be deleted while it is
    still assigned to one or more active users.
    """
    in_use = await db.users.distinct(
        "office_id", {"office_id": {"$in": payload.ids}, "deleted_at": None}
    )
    if in_use:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot delete: {len(in_use)} of the selected offices are still "
                "assigned to active users. Reassign those users first."
            ),
        )
    result = await db.offices.delete_many({"id": {"$in": payload.ids}})
    await log_audit(
        "bulk_delete", "office",
        summary=f"Bulk-deleted {result.deleted_count} office(s)",
        method="POST", path="/api/offices/bulk-delete", status_code=200,
        request={"ids": payload.ids}, response={"deleted": result.deleted_count},
        metadata={"count": result.deleted_count},
    )
    return {"success": True, "deleted": result.deleted_count}


@api_router.get("/offices/{office_id}", response_model=Office, tags=["Offices"], summary="Get office")
async def get_office(office_id: str):
    """Fetch a single office by id (404 if not found)."""
    doc = await db.offices.find_one({"id": office_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Office not found")
    return Office(**doc)


@api_router.put("/offices/{office_id}", response_model=Office, tags=["Offices"], summary="Update office")
async def update_office(office_id: str, payload: OfficeUpdate):
    """Update an office. Returns 404 if missing, 409 on code/name conflict."""
    doc = await db.offices.find_one({"id": office_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Office not found")
    updates = payload.model_dump(exclude_unset=True)
    new_code = updates.get("code", doc["code"])
    new_name = updates.get("name", doc["name"])
    if "code" in updates or "name" in updates:
        await _assert_unique(new_code, new_name, exclude_id=office_id)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    changes = _diff_changes(doc, updates)
    await db.offices.update_one({"id": office_id}, {"$set": updates})
    doc.update(updates)
    await log_audit(
        "update", "office", entity_id=office_id,
        entity_label=f"{doc['code']} — {doc['name']}",
        summary=f"Updated office {doc['code']} — {doc['name']}",
        method="PUT", path=f"/api/offices/{office_id}", status_code=200,
        request=payload.model_dump(exclude_unset=True), response={"id": office_id},
        changes=changes,
    )
    return Office(**doc)


@api_router.delete("/offices/{office_id}", tags=["Offices"], summary="Delete office")
async def delete_office(
    office_id: str,
    reassign_to: Optional[str] = Query(None, description="Office id to move linked users to before deleting"),
):
    """Delete an office by id (404 if not found).

    Referential integrity (RESTRICT): an office cannot be deleted while it is
    still assigned to active users — unless `reassign_to` is provided, in which
    case those users are moved to the target office first.
    """
    office_doc = await db.offices.find_one({"id": office_id}, {"_id": 0, "code": 1, "name": 1})
    linked = await db.users.count_documents({"office_id": office_id, "deleted_at": None})
    if linked:
        if not reassign_to:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Cannot delete: {linked} active user(s) are still assigned to this "
                    "office. Reassign or remove them first."
                ),
            )
        if reassign_to == office_id:
            raise HTTPException(status_code=400, detail="Reassign target must be a different office")
        if not await db.offices.find_one({"id": reassign_to}, {"_id": 0, "id": 1}):
            raise HTTPException(status_code=400, detail="Reassign target office not found")
        now = datetime.now(timezone.utc).isoformat()
        await db.users.update_many(
            {"office_id": office_id, "deleted_at": None},
            {"$set": {"office_id": reassign_to, "updated_at": now}},
        )
    result = await db.offices.delete_one({"id": office_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Office not found")
    reassigned = linked if reassign_to else 0
    label = f"{office_doc['code']} — {office_doc['name']}" if office_doc else office_id
    await log_audit(
        "reassign" if reassigned else "delete", "office", entity_id=office_id,
        entity_label=label,
        summary=(
            f"Reassigned {reassigned} user(s) then deleted office {label}"
            if reassigned else f"Deleted office {label}"
        ),
        method="DELETE", path=f"/api/offices/{office_id}", status_code=200,
        request={"reassign_to": reassign_to}, response={"reassigned": reassigned},
        metadata={"linked_users": linked, "reassign_to": reassign_to},
    )
    return {"success": True, "reassigned": reassigned}
