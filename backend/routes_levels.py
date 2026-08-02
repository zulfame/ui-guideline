"""Levels / Tingkatan (CMS) domain — org-chart swimlanes CRUD.

Extracted from server.py (behavior unchanged). Routes register on the shared
`api_router` at import time.
"""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, Query, Response
from pydantic import BaseModel, Field, ConfigDict

from server import (
    api_router, db, log_audit, _diff_changes,
    DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE,
)


class Level(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    order: int = 0
    color: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LevelCreate(BaseModel):
    name: str = Field(..., min_length=1)
    order: int = 0
    color: Optional[str] = None


class LevelUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    order: Optional[int] = None
    color: Optional[str] = None


# ---------------------------------------------------------------------------
# Levels CRUD
# ---------------------------------------------------------------------------
def _level_to_doc(level: Level) -> dict:
    doc = level.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    return doc


async def _assert_level_name_unique(name: str, exclude_id: Optional[str] = None):
    query = {"name": name}
    if exclude_id:
        query = {"$and": [{"id": {"$ne": exclude_id}}, {"name": name}]}
    if await db.levels.find_one(query, {"_id": 0}):
        raise HTTPException(status_code=409, detail="Level name already exists")


@api_router.post("/levels", response_model=Level, status_code=201, tags=["Levels"], summary="Create level")
async def create_level(payload: LevelCreate):
    """Create a level (409 if the name already exists)."""
    await _assert_level_name_unique(payload.name)
    level = Level(**payload.model_dump())
    await db.levels.insert_one(_level_to_doc(level))
    await log_audit(
        "create", "level", entity_id=level.id, entity_label=level.name,
        summary=f"Created level {level.name}",
        method="POST", path="/api/levels", status_code=201,
        request=payload.model_dump(), response={"id": level.id},
    )
    return level


@api_router.get("/levels", response_model=List[Level], tags=["Levels"], summary="List levels (paginated)")
async def list_levels(
    response: Response,
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Max records to return"),
):
    """List levels ordered by `order`. Bounded by `limit` (max 500); total in `X-Total-Count`."""
    total = await db.levels.count_documents({})
    response.headers["X-Total-Count"] = str(total)
    docs = (
        await db.levels.find({}, {"_id": 0})
        .sort("order", 1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return [Level(**d) for d in docs]


@api_router.put("/levels/{level_id}", response_model=Level, tags=["Levels"], summary="Update level")
async def update_level(level_id: str, payload: LevelUpdate):
    """Update a level (404 if missing, 409 on name conflict)."""
    doc = await db.levels.find_one({"id": level_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Level not found")
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        await _assert_level_name_unique(updates["name"], exclude_id=level_id)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    changes = _diff_changes(doc, updates)
    await db.levels.update_one({"id": level_id}, {"$set": updates})
    doc.update(updates)
    await log_audit(
        "update", "level", entity_id=level_id, entity_label=doc["name"],
        summary=f"Updated level {doc['name']}",
        method="PUT", path=f"/api/levels/{level_id}", status_code=200,
        request=payload.model_dump(exclude_unset=True), response={"id": level_id},
        changes=changes,
    )
    return Level(**doc)


@api_router.delete("/levels/{level_id}", tags=["Levels"], summary="Delete level")
async def delete_level(level_id: str):
    """Delete a level and detach it from any roles referencing it."""
    doc = await db.levels.find_one({"id": level_id}, {"_id": 0, "name": 1})
    result = await db.levels.delete_one({"id": level_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Level not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.roles.update_many(
        {"level_id": level_id},
        {"$set": {"level_id": None, "updated_at": now}},
    )
    await log_audit(
        "delete", "level", entity_id=level_id,
        entity_label=doc.get("name") if doc else level_id,
        summary=f"Deleted level {doc.get('name') if doc else level_id}",
        method="DELETE", path=f"/api/levels/{level_id}", status_code=200,
        response={"success": True},
    )
    return {"success": True}
