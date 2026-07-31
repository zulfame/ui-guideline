from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


# ---------------------------------------------------------------------------
# Offices (CMS) — FastAPI + MongoDB CRUD
# ---------------------------------------------------------------------------
class Office(BaseModel):
    model_config = ConfigDict(extra="ignore")

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


class BulkDeleteRequest(BaseModel):
    ids: List[str]


def _office_to_doc(office: Office) -> dict:
    doc = office.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    return doc


async def _assert_unique(code: str, name: str, exclude_id: Optional[str] = None):
    """Enforce unique code & name (2a)."""
    query = {"$or": [{"code": code}, {"name": name}]}
    if exclude_id:
        query = {"$and": [{"id": {"$ne": exclude_id}}, query]}
    existing = await db.offices.find_one(query, {"_id": 0})
    if existing:
        field = "code" if existing.get("code") == code else "name"
        raise HTTPException(status_code=409, detail=f"Office {field} already exists")


@api_router.post("/offices", response_model=Office, status_code=201)
async def create_office(payload: OfficeCreate):
    await _assert_unique(payload.code, payload.name)
    office = Office(**payload.model_dump())
    await db.offices.insert_one(_office_to_doc(office))
    return office


@api_router.get("/offices", response_model=List[Office])
async def list_offices():
    docs = await db.offices.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Office(**d) for d in docs]


@api_router.post("/offices/bulk-delete")
async def bulk_delete_offices(payload: BulkDeleteRequest):
    result = await db.offices.delete_many({"id": {"$in": payload.ids}})
    return {"success": True, "deleted": result.deleted_count}


@api_router.get("/offices/{office_id}", response_model=Office)
async def get_office(office_id: str):
    doc = await db.offices.find_one({"id": office_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Office not found")
    return Office(**doc)


@api_router.put("/offices/{office_id}", response_model=Office)
async def update_office(office_id: str, payload: OfficeUpdate):
    doc = await db.offices.find_one({"id": office_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Office not found")
    updates = payload.model_dump(exclude_unset=True)
    new_code = updates.get("code", doc["code"])
    new_name = updates.get("name", doc["name"])
    if "code" in updates or "name" in updates:
        await _assert_unique(new_code, new_name, exclude_id=office_id)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.offices.update_one({"id": office_id}, {"$set": updates})
    doc.update(updates)
    return Office(**doc)


@api_router.delete("/offices/{office_id}")
async def delete_office(office_id: str):
    result = await db.offices.delete_one({"id": office_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Office not found")
    return {"success": True}


# ---------------------------------------------------------------------------
# Roles / Jabatan (CMS) — hierarchical tree via parent_id
# ---------------------------------------------------------------------------
class Role(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    parent_id: Optional[str] = None
    dotted_parent_id: Optional[str] = None
    level: Optional[int] = None
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RoleCreate(BaseModel):
    name: str = Field(..., min_length=1)
    parent_id: Optional[str] = None
    dotted_parent_id: Optional[str] = None
    level: Optional[int] = Field(None, ge=1)
    order: int = 0


class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    parent_id: Optional[str] = None
    dotted_parent_id: Optional[str] = None
    level: Optional[int] = Field(None, ge=1)
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


@api_router.post("/roles", response_model=Role, status_code=201)
async def create_role(payload: RoleCreate):
    await _assert_role_name_unique(payload.name)
    await _validate_parent(payload.parent_id)
    role = Role(**payload.model_dump())
    await db.roles.insert_one(_role_to_doc(role))
    return role


@api_router.get("/roles", response_model=List[Role])
async def list_roles():
    docs = await db.roles.find({}, {"_id": 0}).sort("name", 1).to_list(10000)
    return [Role(**d) for d in docs]


@api_router.post("/roles/bulk-delete")
async def bulk_delete_roles(payload: BulkDeleteRequest):
    deleted_set = set(payload.ids)
    pmap = await _role_parent_map()
    result = await db.roles.delete_many({"id": {"$in": payload.ids}})
    # Promote orphaned children to their nearest surviving ancestor.
    now = datetime.now(timezone.utc).isoformat()
    for rid, parent in pmap.items():
        if rid in deleted_set or parent not in deleted_set:
            continue
        p = parent
        while p is not None and p in deleted_set:
            p = pmap.get(p)
        await db.roles.update_one(
            {"id": rid}, {"$set": {"parent_id": p, "updated_at": now}}
        )
    return {"success": True, "deleted": result.deleted_count}


@api_router.get("/roles/{role_id}", response_model=Role)
async def get_role(role_id: str):
    doc = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Role not found")
    return Role(**doc)


@api_router.put("/roles/{role_id}", response_model=Role)
async def update_role(role_id: str, payload: RoleUpdate):
    doc = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Role not found")
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        await _assert_role_name_unique(updates["name"], exclude_id=role_id)
    if "parent_id" in updates:
        await _validate_parent(updates["parent_id"], role_id=role_id)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.roles.update_one({"id": role_id}, {"$set": updates})
    doc.update(updates)
    return Role(**doc)


@api_router.delete("/roles/{role_id}")
async def delete_role(role_id: str):
    doc = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Role not found")
    # Promote direct children up to this role's parent, then delete.
    now = datetime.now(timezone.utc).isoformat()
    await db.roles.delete_one({"id": role_id})
    await db.roles.update_many(
        {"parent_id": role_id},
        {"$set": {"parent_id": doc.get("parent_id"), "updated_at": now}},
    )
    return {"success": True}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def ensure_indexes():
    # DB-level integrity for Offices unique fields (complements app-level check).
    await db.offices.create_index("code", unique=True)
    await db.offices.create_index("name", unique=True)
    await db.roles.create_index("name", unique=True)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()