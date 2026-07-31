from fastapi import FastAPI, APIRouter, HTTPException, Query, Response
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import UpdateOne
import os
import logging
import bcrypt
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging (Guideline: Application Logging — structured, leveled).
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

# MongoDB connection (Guideline: Configuration Management — from environment only).
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Pagination bound (Guideline: Data Pagination — never return an unbounded list).
MAX_PAGE_SIZE = 500
DEFAULT_PAGE_SIZE = 100

# Auto-seed toggle (Guideline: Configuration Management) — populate sample data
# on a fresh/empty database so new deployments come pre-filled with examples.
AUTO_SEED = os.environ.get('AUTO_SEED', 'true').strip().lower() in ('1', 'true', 'yes', 'on')


async def _auto_seed_if_empty():
    """Insert sample data only when all CMS collections are empty (idempotent)."""
    counts = [
        await db.offices.count_documents({}),
        await db.roles.count_documents({}),
        await db.levels.count_documents({}),
        await db.users.count_documents({}),
    ]
    if any(counts):
        logger.info("Auto-seed skipped: existing data present.")
        return
    from seed_data import build_documents  # local import: avoids CLI deps at module load

    levels, roles, offices, users = build_documents()
    if levels:
        await db.levels.insert_many(levels)
    if roles:
        await db.roles.insert_many(roles)
    if offices:
        await db.offices.insert_many(offices)
    if users:
        await db.users.insert_many(users)
    logger.info(
        "Auto-seed: inserted %d levels, %d roles, %d offices, %d users (empty DB).",
        len(levels), len(roles), len(offices), len(users),
    )


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """App lifecycle (replaces deprecated @app.on_event).

    Startup: ensure DB-level unique indexes + query indexes, then auto-seed when
    the DB is empty and AUTO_SEED is enabled.
    Shutdown: close the Mongo client cleanly.
    """
    await db.offices.create_index("code", unique=True)
    await db.offices.create_index("name", unique=True)
    await db.offices.create_index("created_at")  # supports the list sort
    await db.roles.create_index("name", unique=True)
    await db.levels.create_index("name", unique=True)
    await db.users.create_index("created_at")
    await db.users.create_index("email")
    await db.users.create_index("role_id")
    await db.users.create_index("office_id")
    await db.users.create_index("deleted_at")
    logger.info("Startup complete: indexes ensured.")
    if AUTO_SEED:
        try:
            await _auto_seed_if_empty()
        except Exception as exc:  # pragma: no cover - non-fatal
            logger.error("Auto-seed failed (non-fatal): %s", exc)
    yield
    client.close()
    logger.info("Shutdown complete: Mongo client closed.")


app = FastAPI(
    title="UI Guidelines CMS API",
    version="1.0.0",
    description="Backend for the UI Guidelines / Design System app (Offices, Roles, Levels).",
    lifespan=lifespan,
)

# Router with the /api prefix (Guideline: API Design — ingress routing rule).
api_router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# System (Guideline: Health Monitoring)
# ---------------------------------------------------------------------------
@api_router.get("/", tags=["System"], summary="Service liveness")
async def root():
    """Simple liveness probe — the process is up."""
    return {"message": "Hello World"}


@api_router.get("/health", tags=["System"], summary="Health & readiness")
async def health():
    """Readiness probe — verifies the database connection is reachable."""
    try:
        await db.command("ping")
    except Exception as exc:  # pragma: no cover - defensive
        logger.error("Health check failed: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"status": "ok", "database": "connected"}


# ---------------------------------------------------------------------------
# Shared
# ---------------------------------------------------------------------------
class BulkDeleteRequest(BaseModel):
    ids: List[str]


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
    """Delete multiple offices by id in a single operation."""
    result = await db.offices.delete_many({"id": {"$in": payload.ids}})
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
    await db.offices.update_one({"id": office_id}, {"$set": updates})
    doc.update(updates)
    return Office(**doc)


@api_router.delete("/offices/{office_id}", tags=["Offices"], summary="Delete office")
async def delete_office(office_id: str):
    """Delete an office by id (404 if not found)."""
    result = await db.offices.delete_one({"id": office_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Office not found")
    return {"success": True}


# ---------------------------------------------------------------------------
# Levels / Tingkatan (CMS) — org-chart swimlanes (id + name + order)
# ---------------------------------------------------------------------------
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
    return {"success": True, "deleted": result.deleted_count}


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
    await db.roles.update_one({"id": role_id}, {"$set": updates})
    doc.update(updates)
    return Role(**doc)


@api_router.delete("/roles/{role_id}", tags=["Roles"], summary="Delete role")
async def delete_role(role_id: str):
    """Delete a role: promote direct children to this role's parent, clear dotted refs."""
    doc = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Role not found")
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
    return {"success": True}


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
    await db.levels.update_one({"id": level_id}, {"$set": updates})
    doc.update(updates)
    return Level(**doc)


@api_router.delete("/levels/{level_id}", tags=["Levels"], summary="Delete level")
async def delete_level(level_id: str):
    """Delete a level and detach it from any roles referencing it."""
    result = await db.levels.delete_one({"id": level_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Level not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.roles.update_many(
        {"level_id": level_id},
        {"$set": {"level_id": None, "updated_at": now}},
    )
    return {"success": True}


# ---------------------------------------------------------------------------
# Users (CMS) — with password policy (90-day expiry, no-reuse of last N)
# ---------------------------------------------------------------------------
PASSWORD_EXPIRY_DAYS = int(os.environ.get("PASSWORD_EXPIRY_DAYS", "90"))
PASSWORD_HISTORY_LIMIT = int(os.environ.get("PASSWORD_HISTORY_LIMIT", "3"))
DEFAULT_USER_PASSWORD = os.environ.get("DEFAULT_USER_PASSWORD", "bpr2026")
PASSWORD_EXPIRY_WARN_DAYS = 14
EMAIL_RE = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

# Nullable + unique business fields (enforced at the application layer so
# soft-deleted records can free their values and multiple NULLs are allowed).
UNIQUE_USER_FIELDS = ["username", "phone", "email", "alias", "mso_code", "collector_code"]
# Optional fields normalized "" -> None so blanks never collide on uniqueness.
NULLABLE_USER_FIELDS = [
    "username", "phone", "alias", "mso_code", "collector_code",
    "device_identifier", "device_name", "device_os", "fcm_token",
]


def _hash_password(raw: str) -> str:
    return bcrypt.hashpw(raw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(raw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(raw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:  # pragma: no cover - defensive
        return False


def _normalize_optionals(data: dict) -> dict:
    for f in NULLABLE_USER_FIELDS:
        if f in data and isinstance(data[f], str) and data[f].strip() == "":
            data[f] = None
    return data


def _password_status(doc: dict):
    """Return (status, expired) — status in {active, expiring, expired}."""
    exp = doc.get("password_expires_at")
    now = datetime.now(timezone.utc)
    if not exp:
        return "active", False
    exp_dt = datetime.fromisoformat(exp)
    if now >= exp_dt:
        return "expired", True
    if exp_dt - now <= timedelta(days=PASSWORD_EXPIRY_WARN_DAYS):
        return "expiring", False
    return "active", False


def _user_public(doc: dict, roles: dict = None, offices: dict = None) -> dict:
    """Serialize a user WITHOUT secrets (password / password_history)."""
    roles = roles or {}
    offices = offices or {}
    status, expired = _password_status(doc)
    return {
        "id": doc["id"],
        "name": doc.get("name"),
        "username": doc.get("username"),
        "phone": doc.get("phone"),
        "email": doc.get("email"),
        "role_id": doc.get("role_id"),
        "role_name": roles.get(doc.get("role_id")),
        "office_id": doc.get("office_id"),
        "office_name": offices.get(doc.get("office_id")),
        "alias": doc.get("alias"),
        "mso_code": doc.get("mso_code"),
        "collector_code": doc.get("collector_code"),
        "device_identifier": doc.get("device_identifier"),
        "device_name": doc.get("device_name"),
        "device_os": doc.get("device_os"),
        "fcm_token": doc.get("fcm_token"),
        "password_changed_at": doc.get("password_changed_at"),
        "password_expires_at": doc.get("password_expires_at"),
        "password_status": status,
        "password_expired": expired,
        "must_change_password": bool(doc.get("must_change_password")) or expired,
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


async def _enrich_maps(docs: list):
    role_ids = list({d["role_id"] for d in docs if d.get("role_id")})
    office_ids = list({d["office_id"] for d in docs if d.get("office_id")})
    rdocs = await db.roles.find({"id": {"$in": role_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(len(role_ids) or 1)
    odocs = await db.offices.find({"id": {"$in": office_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(len(office_ids) or 1)
    return {r["id"]: r["name"] for r in rdocs}, {o["id"]: o["name"] for o in odocs}


async def _assert_user_unique(data: dict, exclude_id: Optional[str] = None):
    """Enforce uniqueness among non-deleted users (skips NULL/empty values)."""
    for field in UNIQUE_USER_FIELDS:
        value = data.get(field)
        if value is None or value == "":
            continue
        query = {field: value, "deleted_at": None}
        if exclude_id:
            query = {"$and": [{"id": {"$ne": exclude_id}}, query]}
        if await db.users.find_one(query, {"_id": 0, "id": 1}):
            raise HTTPException(status_code=409, detail=f"User {field} already exists")


async def _validate_role_office(role_id: Optional[str], office_id: Optional[str]):
    if role_id is not None:
        if not await db.roles.find_one({"id": role_id}, {"_id": 0, "id": 1}):
            raise HTTPException(status_code=400, detail="Role not found")
    if office_id is not None:
        if not await db.offices.find_one({"id": office_id}, {"_id": 0, "id": 1}):
            raise HTTPException(status_code=400, detail="Office not found")


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., pattern=EMAIL_RE)
    role_id: str = Field(..., min_length=1)
    office_id: str = Field(..., min_length=1)
    username: Optional[str] = None
    phone: Optional[str] = None
    alias: Optional[str] = None
    mso_code: Optional[str] = None
    collector_code: Optional[str] = None
    device_identifier: Optional[str] = None
    device_name: Optional[str] = None
    device_os: Optional[str] = None
    fcm_token: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    email: Optional[str] = Field(None, pattern=EMAIL_RE)
    role_id: Optional[str] = Field(None, min_length=1)
    office_id: Optional[str] = Field(None, min_length=1)
    username: Optional[str] = None
    phone: Optional[str] = None
    alias: Optional[str] = None
    mso_code: Optional[str] = None
    collector_code: Optional[str] = None
    device_identifier: Optional[str] = None
    device_name: Optional[str] = None
    device_os: Optional[str] = None
    fcm_token: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=128)


class ResetPasswordRequest(BaseModel):
    new_password: Optional[str] = Field(None, min_length=6, max_length=128)


@api_router.post("/users", status_code=201, tags=["Users"], summary="Create user")
async def create_user(payload: UserCreate):
    """Create a user with the system default password (must be changed on first login)."""
    data = _normalize_optionals(payload.model_dump())
    await _assert_user_unique(data)
    await _validate_role_office(data["role_id"], data["office_id"])
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
    if updates:
        await _assert_user_unique({**doc, **updates}, exclude_id=user_id)
        await _validate_role_office(updates.get("role_id"), updates.get("office_id"))
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"id": user_id}, {"$set": updates})
        doc.update(updates)
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
    return {"success": True, "must_change_password": True}


@api_router.delete("/users/{user_id}", tags=["Users"], summary="Soft-delete user")
async def delete_user(user_id: str):
    """Soft-delete a user (sets deleted_at); 404 if not found or already deleted."""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.users.update_one(
        {"id": user_id, "deleted_at": None},
        {"$set": {"deleted_at": now, "updated_at": now}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True}


# Include the router in the main app.
app.include_router(api_router)

# CORS (Guideline: Security Headers) — a wildcard origin is incompatible with
# credentials, so only enable credentials when specific origins are configured.
cors_origins = [o.strip() for o in os.environ.get('CORS_ORIGINS', '*').split(',') if o.strip()]
allow_all_origins = cors_origins == ['*']
app.add_middleware(
    CORSMiddleware,
    allow_credentials=not allow_all_origins,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)
