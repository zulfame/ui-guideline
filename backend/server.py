from fastapi import FastAPI, APIRouter, HTTPException, Query, Response, UploadFile, File, Form
from fastapi.responses import StreamingResponse, PlainTextResponse, Response
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from bson import ObjectId
from pymongo import UpdateOne, InsertOne
import os
import io
import re
import ssl
import json
import asyncio
import smtplib
from email.message import EmailMessage
import logging
import bcrypt
import httpx
from pathlib import Path
from openpyxl import Workbook, load_workbook
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
    # Ensure indexes resiliently: a single failing index (e.g. an options
    # conflict or a DuplicateKeyError on a restored DB) must NOT crash startup,
    # otherwise the whole API goes down. Try each; log & continue on failure.
    index_specs = [
        (db.offices, "code", {"unique": True}),
        (db.offices, "name", {"unique": True}),
        (db.offices, "created_at", {}),
        (db.roles, "name", {"unique": True}),
        (db.levels, "name", {"unique": True}),
        (db.users, "created_at", {}),
        (db.users, "email", {}),
        (db.users, "role_id", {}),
        (db.users, "office_id", {}),
        (db.users, "deleted_at", {}),
        (db.audit_logs, [("created_at", -1)], {}),
        (db.audit_logs, "entity_type", {}),
        (db.audit_logs, "action", {}),
        (db.broadcast_configs, "key", {"unique": True}),
        (db.branding, "key", {"unique": True}),
        (db.sitemap_urls, "path", {"unique": True}),
    ]
    for coll, keys, opts in index_specs:
        try:
            await coll.create_index(keys, **opts)
        except Exception as exc:  # pragma: no cover - non-fatal, keep the app booting
            logger.warning("Index create skipped on %s (%s): %s", coll.name, keys, exc)
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
# Audit Log (Guideline: Monitoring / Audit) — records important data changes.
# Schema is request/response-shaped so it doubles as an API activity log later.
# ---------------------------------------------------------------------------
AUDIT_ACTOR_SYSTEM = "System"  # placeholder until real auth is wired
_REDACT_KEYS = {
    "password", "new_password", "password_history", "confirm",
    "bot_token", "webhook_url", "secret", "header_value", "url",
}


def _redact(obj):
    """Recursively redact secret-bearing keys so passwords never reach the log."""
    if isinstance(obj, dict):
        return {k: ("«redacted»" if k in _REDACT_KEYS else _redact(v)) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_redact(v) for v in obj]
    return obj


def _diff_changes(before: dict, updates: dict) -> list:
    """Return [{field, from, to}] for fields whose value actually changed."""
    changes = []
    for k, new_v in updates.items():
        if k in _REDACT_KEYS or k == "updated_at":
            continue
        old_v = before.get(k)
        if old_v != new_v:
            changes.append({"field": k, "from": old_v, "to": new_v})
    return changes


async def log_audit(
    action: str,
    entity_type: str,
    *,
    entity_id: Optional[str] = None,
    entity_label: Optional[str] = None,
    summary: str = "",
    method: Optional[str] = None,
    path: Optional[str] = None,
    status_code: Optional[int] = None,
    request: Optional[dict] = None,
    response: Optional[dict] = None,
    changes: Optional[list] = None,
    metadata: Optional[dict] = None,
    actor: str = AUDIT_ACTOR_SYSTEM,
):
    """Insert one audit entry. Never raises — logging must not break the flow."""
    try:
        doc = {
            "id": str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "actor": actor,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "entity_label": entity_label,
            "summary": summary,
            "method": method,
            "path": path,
            "status_code": status_code,
            "request": _redact(request) if request is not None else None,
            "response": _redact(response) if response is not None else None,
            "changes": changes or [],
            "metadata": metadata or {},
        }
        await db.audit_logs.insert_one(doc)
    except Exception as exc:  # pragma: no cover - non-fatal
        logger.error("Audit log write failed (non-fatal): %s", exc)


AUDIT_ENTITY_TYPES = ["user", "role", "office", "level", "database", "broadcast", "branding"]
AUDIT_ACTIONS = [
    "create", "update", "delete", "bulk_delete",
    "import", "reassign", "change_password", "reset_password",
    "backup", "restore", "configure", "test", "send_test",
]


@api_router.get("/audit-logs", tags=["Audit"], summary="List audit logs (paginated, filterable)")
async def list_audit_logs(
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    entity_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    q: Optional[str] = Query(None, description="Text search on summary / entity label / actor"),
    date_from: Optional[str] = Query(None, description="ISO date/datetime lower bound (inclusive)"),
    date_to: Optional[str] = Query(None, description="ISO date/datetime upper bound (inclusive)"),
    sort_by: Optional[str] = Query("created_at", description="Sort field"),
    sort_dir: Optional[str] = Query("desc", description="asc | desc"),
):
    """Audit entries sorted server-side across the whole dataset, bounded by
    `limit`; total count in `X-Total-Count`."""
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if action:
        query["action"] = action
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"summary": rx}, {"entity_label": rx}, {"actor": rx}]
    if date_from or date_to:
        rng = {}
        if date_from:
            rng["$gte"] = date_from
        if date_to:
            # make an all-day upper bound inclusive when only a date is given
            rng["$lte"] = date_to if len(date_to) > 10 else date_to + "T23:59:59.999999+00:00"
        query["created_at"] = rng
    total = await db.audit_logs.count_documents(query)
    response.headers["X-Total-Count"] = str(total)
    _sortable = {"created_at", "actor", "action", "entity_type", "summary"}
    field = sort_by if sort_by in _sortable else "created_at"
    direction = 1 if (sort_dir or "").lower() == "asc" else -1
    docs = (
        await db.audit_logs.find(query, {"_id": 0})
        .sort(field, direction)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    # Defensive: coerce any residual BSON types (e.g. legacy nested ObjectId) to
    # JSON-safe values so a single bad legacy row can never 500 the endpoint.
    return json.loads(json.dumps(docs, default=str))


@api_router.get("/audit-logs/meta", tags=["Audit"], summary="Audit filter options")
async def audit_meta():
    """Static filter options for the Audit Log UI."""
    return {"entity_types": AUDIT_ENTITY_TYPES, "actions": AUDIT_ACTIONS}


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


# ---------------------------------------------------------------------------
# Excel Import (Offices / Roles / Users) — template download + bulk upsert.
# Policy: all-or-nothing (validate every row first; abort on any error and
# report the offending rows) with upsert on the natural key (code / name /
# email). Reference columns use human-readable names, resolved to UUIDs.
# ---------------------------------------------------------------------------
def _s(v) -> str:
    """Coerce an Excel cell to a trimmed string (ints stay clean, no '.0')."""
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip()


def _to_float(v, field, errs):
    if v is None or (isinstance(v, str) and v.strip() == ""):
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        errs.append(f"{field} must be a number")
        return None


def _to_int_or_none(v):
    """Return int, 0 for blank, or None when the value is not a whole number."""
    if v is None or (isinstance(v, str) and v.strip() == ""):
        return 0
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return None


def _read_upload(content: bytes) -> list:
    """Parse the first worksheet into a list of dicts keyed by lower-cased headers."""
    try:
        wb = load_workbook(io.BytesIO(content), data_only=True, read_only=True)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail={"message": "Could not read the file. Please upload a valid .xlsx Excel file.", "errors": []},
        )
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    if not rows:
        return []
    headers = [(_s(h).lower() if h is not None else "") for h in rows[0]]
    out = []
    for r in rows[1:]:
        if r is None or all(c is None or (isinstance(c, str) and c.strip() == "") for c in r):
            continue
        d = {}
        for idx, h in enumerate(headers):
            if not h:
                continue
            d[h] = r[idx] if idx < len(r) else None
        out.append(d)
    return out


def _xlsx_response(headers: list, example: list, filename: str) -> StreamingResponse:
    wb = Workbook()
    ws = wb.active
    ws.title = "Template"
    ws.append(headers)
    if example:
        ws.append(example)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _abort_import(errors: list):
    raise HTTPException(
        status_code=400,
        detail={
            "message": f"Import canceled: {len(errors)} row(s) have problems. Fix them and try again.",
            "errors": errors,
        },
    )


# UI-friendly cap: never stream thousands of preview rows to the browser.
PREVIEW_ROW_CAP = 300


def _preview_response(errors: list, items: list) -> dict:
    to_create = sum(1 for i in items if i["action"] == "create")
    to_update = sum(1 for i in items if i["action"] == "update")
    preview = [
        {"row": i["row"], "action": i["action"], "label": i["label"]}
        for i in items[:PREVIEW_ROW_CAP]
    ]
    return {
        "total": len(items),
        "to_create": to_create,
        "to_update": to_update,
        "errors": errors,
        "rows": preview,
        "truncated": len(items) > PREVIEW_ROW_CAP,
    }


class ImportErrorsExport(BaseModel):
    errors: List[dict] = []
    filename: Optional[str] = None


@api_router.post("/import/errors/export", tags=["Import"], summary="Export import errors to Excel")
async def export_import_errors(payload: ImportErrorsExport):
    """Return the failing rows as an .xlsx (columns: Row, Errors) for easy fixing."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Errors"
    ws.append(["Row", "Errors"])
    for e in payload.errors:
        ws.append([e.get("row"), "; ".join(e.get("errors", []))])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    fname = payload.filename or "import_errors.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


# ---- Offices ----
@api_router.get("/offices/import/template", tags=["Offices"], summary="Download offices import template")
async def offices_import_template():
    headers = ["code", "name", "address", "telephone", "longitude", "latitude", "radius", "note"]
    example = ["KP001", "Kantor Pusat", "Jl. Sudirman No. 1", "021-5550000", 106.8272, -6.2088, 100, "Catatan opsional"]
    return _xlsx_response(headers, example, "offices_import_template.xlsx")


@api_router.post("/offices/import", tags=["Offices"], summary="Import offices from Excel")
async def import_offices(file: UploadFile = File(...)):
    rows = _read_upload(await file.read())
    if not rows:
        raise HTTPException(status_code=400, detail={"message": "No data rows found in the file.", "errors": []})
    errors, items = await _prepare_offices(rows)
    if errors:
        _abort_import(errors)
    created, updated = await _apply_offices(items)
    await log_audit(
        "import", "office",
        summary=f"Imported offices: {created} created, {updated} updated",
        method="POST", path="/api/offices/import", status_code=200,
        request={"filename": file.filename, "rows": len(items)},
        response={"created": created, "updated": updated, "total": len(items)},
        metadata={"created": created, "updated": updated, "total": len(items)},
    )
    return {"success": True, "created": created, "updated": updated, "total": len(items)}


@api_router.post("/offices/import/preview", tags=["Offices"], summary="Preview offices import (dry-run)")
async def preview_offices(file: UploadFile = File(...)):
    rows = _read_upload(await file.read())
    if not rows:
        raise HTTPException(status_code=400, detail={"message": "No data rows found in the file.", "errors": []})
    errors, items = await _prepare_offices(rows)
    return _preview_response(errors, items)


async def _prepare_offices(rows: list):
    errors, parsed = [], []
    seen_code, seen_name = {}, {}
    for i, row in enumerate(rows):
        rn = i + 2
        errs = []
        code = _s(row.get("code"))
        name = _s(row.get("name"))
        if not code:
            errs.append("code is required")
        if not name:
            errs.append("name is required")
        if code:
            if code.lower() in seen_code:
                errs.append(f"duplicate code in file (row {seen_code[code.lower()]})")
            else:
                seen_code[code.lower()] = rn
        if name:
            if name.lower() in seen_name:
                errs.append(f"duplicate name in file (row {seen_name[name.lower()]})")
            else:
                seen_name[name.lower()] = rn
        lon = _to_float(row.get("longitude"), "longitude", errs)
        lat = _to_float(row.get("latitude"), "latitude", errs)
        rad = _to_float(row.get("radius"), "radius", errs)
        if lon is not None and not (-180 <= lon <= 180):
            errs.append("longitude must be between -180 and 180")
        if lat is not None and not (-90 <= lat <= 90):
            errs.append("latitude must be between -90 and 90")
        parsed.append({
            "row": rn, "code": code, "name": name,
            "address": _s(row.get("address")) or None,
            "telephone": _s(row.get("telephone")) or None,
            "longitude": lon, "latitude": lat,
            "radius": rad if rad is not None else 100,
            "note": _s(row.get("note")) or None,
        })
        if errs:
            errors.append({"row": rn, "errors": errs})
    existing = await db.offices.find({}, {"_id": 0, "id": 1, "code": 1, "name": 1}).to_list(100000)
    by_code = {o["code"].lower(): o for o in existing}
    name_owner = {o["name"].lower(): o["code"].lower() for o in existing}
    for p in parsed:
        if not p["name"] or not p["code"]:
            continue
        owner = name_owner.get(p["name"].lower())
        if owner is not None and owner != p["code"].lower():
            errors.append({"row": p["row"], "errors": [f"name already used by another office (code {owner.upper()})"]})
    items = []
    for p in parsed:
        ex = by_code.get(p["code"].lower())
        items.append({
            "row": p["row"],
            "action": "update" if ex else "create",
            "label": f"{p['code']} — {p['name']}",
            "id": ex["id"] if ex else None,
            "fields": {
                "code": p["code"], "name": p["name"], "address": p["address"],
                "telephone": p["telephone"], "longitude": p["longitude"],
                "latitude": p["latitude"], "radius": p["radius"], "note": p["note"],
            },
        })
    return errors, items


async def _apply_offices(items: list):
    now = datetime.now(timezone.utc).isoformat()
    ops, created, updated = [], 0, 0
    for it in items:
        fields = {**it["fields"], "updated_at": now}
        if it["id"]:
            ops.append(UpdateOne({"id": it["id"]}, {"$set": fields}))
            updated += 1
        else:
            ops.append(InsertOne({"id": str(uuid.uuid4()), **fields, "created_at": now}))
            created += 1
    if ops:
        await db.offices.bulk_write(ops, ordered=False)
    return created, updated


# ---- Roles ----
@api_router.get("/roles/import/template", tags=["Roles"], summary="Download roles import template")
async def roles_import_template():
    headers = ["name", "parent", "dotted_parent", "level", "order"]
    example = ["Teller", "Kepala Cabang", "", "Staff", 0]
    return _xlsx_response(headers, example, "roles_import_template.xlsx")


@api_router.post("/roles/import", tags=["Roles"], summary="Import roles from Excel")
async def import_roles(file: UploadFile = File(...)):
    rows = _read_upload(await file.read())
    if not rows:
        raise HTTPException(status_code=400, detail={"message": "No data rows found in the file.", "errors": []})
    errors, items = await _prepare_roles(rows)
    if errors:
        _abort_import(errors)
    created, updated = await _apply_roles(items)
    await log_audit(
        "import", "role",
        summary=f"Imported roles: {created} created, {updated} updated",
        method="POST", path="/api/roles/import", status_code=200,
        request={"filename": file.filename, "rows": len(items)},
        response={"created": created, "updated": updated, "total": len(items)},
        metadata={"created": created, "updated": updated, "total": len(items)},
    )
    return {"success": True, "created": created, "updated": updated, "total": len(items)}


@api_router.post("/roles/import/preview", tags=["Roles"], summary="Preview roles import (dry-run)")
async def preview_roles(file: UploadFile = File(...)):
    rows = _read_upload(await file.read())
    if not rows:
        raise HTTPException(status_code=400, detail={"message": "No data rows found in the file.", "errors": []})
    errors, items = await _prepare_roles(rows)
    return _preview_response(errors, items)


async def _prepare_roles(rows: list):
    existing = await db.roles.find({}, {"_id": 0, "id": 1, "name": 1, "parent_id": 1}).to_list(100000)
    levels = await db.levels.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100000)
    role_id_by_name = {r["name"].lower(): r["id"] for r in existing}
    level_id_by_name = {l["name"].lower(): l["id"] for l in levels}
    errors, parsed, seen_name, file_names = [], [], {}, set()
    for i, row in enumerate(rows):
        rn = i + 2
        errs = []
        name = _s(row.get("name"))
        if not name:
            errs.append("name is required")
        if name:
            if name.lower() in seen_name:
                errs.append(f"duplicate name in file (row {seen_name[name.lower()]})")
            else:
                seen_name[name.lower()] = rn
                file_names.add(name.lower())
        order = _to_int_or_none(row.get("order"))
        if order is None:
            errs.append("order must be a whole number")
            order = 0
        parsed.append({
            "row": rn, "name": name,
            "parent": _s(row.get("parent")),
            "dotted": _s(row.get("dotted_parent")),
            "level": _s(row.get("level")),
            "order": order,
        })
        if errs:
            errors.append({"row": rn, "errors": errs})
    all_names = set(role_id_by_name) | file_names
    for p in parsed:
        errs = []
        if p["parent"]:
            if p["parent"].lower() == p["name"].lower():
                errs.append("parent cannot be the role itself")
            elif p["parent"].lower() not in all_names:
                errs.append(f"parent role '{p['parent']}' not found")
        if p["dotted"]:
            if p["dotted"].lower() == p["name"].lower():
                errs.append("dotted_parent cannot be the role itself")
            elif p["dotted"].lower() not in all_names:
                errs.append(f"dotted_parent role '{p['dotted']}' not found")
        if p["level"] and p["level"].lower() not in level_id_by_name:
            errs.append(f"level '{p['level']}' not found")
        if errs:
            errors.append({"row": p["row"], "errors": errs})
    name_to_id = dict(role_id_by_name)
    for p in parsed:
        if p["name"]:
            name_to_id.setdefault(p["name"].lower(), str(uuid.uuid4()))
    final_parent = {r["id"]: r.get("parent_id") for r in existing}
    for p in parsed:
        if not p["name"]:
            continue
        rid = name_to_id[p["name"].lower()]
        final_parent[rid] = name_to_id.get(p["parent"].lower()) if p["parent"] else None

    def _has_cycle(start):
        seen, cur = set(), start
        while cur is not None:
            if cur in seen:
                return True
            seen.add(cur)
            cur = final_parent.get(cur)
        return False

    if not errors:  # cycle check only meaningful once names resolve cleanly
        cyc = [p["row"] for p in parsed if p["name"] and _has_cycle(name_to_id[p["name"].lower()])]
        for r in cyc:
            errors.append({"row": r, "errors": ["parent relationships create a cycle"]})
    existing_ids = {r["id"] for r in existing}
    items = []
    for p in parsed:
        if not p["name"]:
            continue
        rid = name_to_id[p["name"].lower()]
        items.append({
            "row": p["row"],
            "action": "update" if rid in existing_ids else "create",
            "label": p["name"],
            "id": rid,
            "is_new": rid not in existing_ids,
            "fields": {
                "name": p["name"],
                "parent_id": name_to_id.get(p["parent"].lower()) if p["parent"] else None,
                "dotted_parent_id": name_to_id.get(p["dotted"].lower()) if p["dotted"] else None,
                "level_id": level_id_by_name.get(p["level"].lower()) if p["level"] else None,
                "order": p["order"],
            },
        })
    return errors, items


async def _apply_roles(items: list):
    now = datetime.now(timezone.utc).isoformat()
    ops, created, updated = [], 0, 0
    for it in items:
        fields = {**it["fields"], "updated_at": now}
        if it["is_new"]:
            ops.append(InsertOne({"id": it["id"], **fields, "created_at": now}))
            created += 1
        else:
            ops.append(UpdateOne({"id": it["id"]}, {"$set": fields}))
            updated += 1
    if ops:
        await db.roles.bulk_write(ops, ordered=False)
    return created, updated


# ---- Users ----
_USER_IMPORT_OPTIONAL = [
    "username", "phone", "alias", "mso_code", "collector_code",
    "device_identifier", "device_name", "device_os", "fcm_token",
]


@api_router.get("/users/import/template", tags=["Users"], summary="Download users import template")
async def users_import_template():
    headers = ["name", "email", "role", "office", *_USER_IMPORT_OPTIONAL]
    example = [
        "Budi Santoso", "budi@example.com", "Teller", "Kantor Pusat",
        "budi", "08123456789", "BDS", "MSO001", "COL001", "", "", "", "",
    ]
    return _xlsx_response(headers, example, "users_import_template.xlsx")


@api_router.post("/users/import", tags=["Users"], summary="Import users from Excel")
async def import_users(file: UploadFile = File(...)):
    rows = _read_upload(await file.read())
    if not rows:
        raise HTTPException(status_code=400, detail={"message": "No data rows found in the file.", "errors": []})
    errors, items = await _prepare_users(rows)
    if errors:
        _abort_import(errors)
    created, updated = await _apply_users(items)
    await log_audit(
        "import", "user",
        summary=f"Imported users: {created} created, {updated} updated",
        method="POST", path="/api/users/import", status_code=200,
        request={"filename": file.filename, "rows": len(items)},
        response={"created": created, "updated": updated, "total": len(items)},
        metadata={"created": created, "updated": updated, "total": len(items)},
    )
    return {"success": True, "created": created, "updated": updated, "total": len(items)}


@api_router.post("/users/import/preview", tags=["Users"], summary="Preview users import (dry-run)")
async def preview_users(file: UploadFile = File(...)):
    rows = _read_upload(await file.read())
    if not rows:
        raise HTTPException(status_code=400, detail={"message": "No data rows found in the file.", "errors": []})
    errors, items = await _prepare_users(rows)
    return _preview_response(errors, items)


async def _prepare_users(rows: list):
    roles = await db.roles.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100000)
    offices = await db.offices.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100000)
    role_id_by_name = {r["name"].lower(): r["id"] for r in roles}
    office_id_by_name = {o["name"].lower(): o["id"] for o in offices}
    existing_users = await db.users.find({"deleted_at": None}, {"_id": 0}).to_list(1000000)
    user_by_email = {u["email"].lower(): u for u in existing_users if u.get("email")}
    errors, parsed = [], []
    seen = {f: {} for f in UNIQUE_USER_FIELDS}
    for i, row in enumerate(rows):
        rn = i + 2
        errs = []
        name = _s(row.get("name"))
        email = _s(row.get("email"))
        role_name = _s(row.get("role"))
        office_name = _s(row.get("office"))
        if not name:
            errs.append("name is required")
        if not email:
            errs.append("email is required")
        elif not re.match(EMAIL_RE, email):
            errs.append("email format is invalid")
        role_id = office_id = None
        if not role_name:
            errs.append("role is required")
        elif role_name.lower() not in role_id_by_name:
            errs.append(f"role '{role_name}' not found")
        else:
            role_id = role_id_by_name[role_name.lower()]
        if not office_name:
            errs.append("office is required")
        elif office_name.lower() not in office_id_by_name:
            errs.append(f"office '{office_name}' not found")
        else:
            office_id = office_id_by_name[office_name.lower()]
        rec = {"row": rn, "name": name, "email": email, "role_id": role_id, "office_id": office_id}
        for f in _USER_IMPORT_OPTIONAL:
            rec[f] = _s(row.get(f)) or None
        for f in UNIQUE_USER_FIELDS:
            val = email if f == "email" else rec.get(f)
            if val:
                key = val.lower() if f == "email" else val
                if key in seen[f]:
                    errs.append(f"duplicate {f} in file (row {seen[f][key]})")
                else:
                    seen[f][key] = rn
        parsed.append(rec)
        if errs:
            errors.append({"row": rn, "errors": errs})
    for p in parsed:
        target = user_by_email.get(p["email"].lower()) if p["email"] else None
        target_id = target["id"] if target else None
        errs = []
        for f in UNIQUE_USER_FIELDS:
            val = p["email"] if f == "email" else p.get(f)
            if not val:
                continue
            q = {f: val, "deleted_at": None}
            if target_id:
                q = {"$and": [{"id": {"$ne": target_id}}, q]}
            if await db.users.find_one(q, {"_id": 0, "id": 1}):
                errs.append(f"{f} already exists for another user")
        if errs:
            errors.append({"row": p["row"], "errors": errs})
    items = []
    for p in parsed:
        target = user_by_email.get(p["email"].lower()) if p["email"] else None
        items.append({
            "row": p["row"],
            "action": "update" if target else "create",
            "label": f"{p['name']} <{p['email']}>",
            "target_id": target["id"] if target else None,
            "fields": {
                "name": p["name"], "email": p["email"],
                "role_id": p["role_id"], "office_id": p["office_id"],
                **{f: p[f] for f in _USER_IMPORT_OPTIONAL},
            },
        })
    return errors, items


async def _apply_users(items: list):
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    created, updated = 0, 0
    for it in items:
        base = {**it["fields"], "updated_at": now_iso}
        if it["target_id"]:
            await db.users.update_one({"id": it["target_id"]}, {"$set": base})
            updated += 1
        else:
            pw = _hash_password(DEFAULT_USER_PASSWORD)
            await db.users.insert_one({
                "id": str(uuid.uuid4()), **base,
                "password": pw, "password_history": [pw],
                "password_changed_at": now_iso,
                "password_expires_at": (now + timedelta(days=PASSWORD_EXPIRY_DAYS)).isoformat(),
                "must_change_password": True, "deleted_at": None, "created_at": now_iso,
            })
            created += 1
    return created, updated


# ---------------------------------------------------------------------------
# Database Backup & Restore (Guideline: Backup/Restore).
# Full-DB JSON snapshots stored in GridFS (survives redeploys, no disk deps).
# Restore supports verify (dry-run) + two modes: update (upsert by id) / replace.
# ---------------------------------------------------------------------------
BACKUP_BUCKET = "backups"
# GridFS internal collections for the backup store itself — never dump/restore these.
_BACKUP_INTERNAL = (f"{BACKUP_BUCKET}.files", f"{BACKUP_BUCKET}.chunks")


def _backup_bucket() -> AsyncIOMotorGridFSBucket:
    return AsyncIOMotorGridFSBucket(db, bucket_name=BACKUP_BUCKET)


async def _dump_all_collections() -> tuple[dict, dict]:
    """Return ({collection: [docs...]}, {collection: count}) for every collection."""
    names = [n for n in await db.list_collection_names() if n not in _BACKUP_INTERNAL]
    collections, counts = {}, {}
    for name in sorted(names):
        docs = await db[name].find({}, {"_id": 0}).to_list(length=None)
        collections[name] = docs
        counts[name] = len(docs)
    return collections, counts


def _verify_backup(payload) -> dict:
    """Validate a backup payload's structure; return a summary for the UI."""
    errors = []
    if not isinstance(payload, dict) or not isinstance(payload.get("collections"), dict):
        return {"valid": False, "errors": ["Invalid backup file: missing 'collections' object."],
                "collections": [], "total": 0, "meta": {}}
    cols, total = [], 0
    for name, docs in payload["collections"].items():
        if not isinstance(docs, list):
            errors.append(f"Collection '{name}' is not a list.")
            continue
        cols.append({"name": name, "count": len(docs)})
        total += len(docs)
    cols.sort(key=lambda c: c["name"])
    return {"valid": not errors, "errors": errors, "collections": cols,
            "total": total, "meta": payload.get("meta", {})}


async def _apply_restore(payload: dict, mode: str) -> dict:
    """Apply a verified backup. mode='replace' wipes each collection first;
    mode='update' upserts docs by their `id` field. Backup store is never touched."""
    result = {}
    for name, docs in payload["collections"].items():
        if name in _BACKUP_INTERNAL:
            continue
        col = db[name]
        clean = [{k: v for k, v in d.items() if k != "_id"} for d in docs]
        try:
            if mode == "replace":
                await col.delete_many({})
                if clean:
                    await col.insert_many(clean, ordered=False)
                result[name] = {"mode": "replace", "restored": len(clean)}
            else:
                ops = []
                for d in clean:
                    if d.get("id") is not None:
                        ops.append(UpdateOne({"id": d["id"]}, {"$set": d}, upsert=True))
                    else:
                        ops.append(InsertOne(d))
                if ops:
                    await col.bulk_write(ops, ordered=False)
                result[name] = {"mode": "update", "upserted": len(clean)}
        except Exception as exc:  # pragma: no cover - report per-collection, keep going
            result[name] = {"mode": mode, "error": str(exc)[:200]}
            logger.error("Restore error in collection %s: %s", name, exc)
    return result


@api_router.post("/database/backup", tags=["Database"], summary="Create a full DB backup (stored on server)")
async def create_backup():
    """Snapshot every collection to a JSON file in GridFS; returns its metadata."""
    collections, counts = await _dump_all_collections()
    now = datetime.now(timezone.utc)
    payload = {
        "meta": {
            "created_at": now.isoformat(),
            "app": "UI Guidelines CMS",
            "version": "1.0.0",
            "collections": sorted(counts.keys()),
            "counts": counts,
            "total": sum(counts.values()),
        },
        "collections": collections,
    }
    data = json.dumps(payload, default=str).encode("utf-8")
    filename = f"backup_{now.strftime('%Y%m%d_%H%M%S')}.json"
    bucket = _backup_bucket()
    grid_in = bucket.open_upload_stream(
        filename,
        metadata={"created_at": now.isoformat(), "counts": counts, "total": sum(counts.values())},
    )
    await grid_in.write(data)
    await grid_in.close()
    file_id = str(grid_in._id)
    await log_audit(
        "backup", "database", entity_id=file_id, entity_label=filename,
        summary=f"Created database backup {filename} ({sum(counts.values())} docs)",
        method="POST", path="/api/database/backup", status_code=200,
        response={"id": file_id, "size": len(data)}, metadata={"counts": counts},
    )
    return {"id": file_id, "filename": filename, "size": len(data),
            "created_at": now.isoformat(), "counts": counts, "total": sum(counts.values())}


@api_router.get("/database/backups", tags=["Database"], summary="List server backups")
async def list_backups():
    bucket = _backup_bucket()
    files = await bucket.find({}).sort("uploadDate", -1).to_list(length=1000)
    out = []
    for f in files:
        meta = f.get("metadata") or {}
        upload_date = f.get("uploadDate")
        out.append({
            "id": str(f["_id"]),
            "filename": f.get("filename"),
            "size": f.get("length"),
            "created_at": meta.get("created_at")
            or (upload_date.isoformat() if hasattr(upload_date, "isoformat") else upload_date),
            "total": meta.get("total"),
            "counts": meta.get("counts", {}),
        })
    return out


@api_router.get("/database/backups/{file_id}/download", tags=["Database"], summary="Download a backup file")
async def download_backup(file_id: str):
    bucket = _backup_bucket()
    try:
        stream = await bucket.open_download_stream(ObjectId(file_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Backup not found")
    data = await stream.read()
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{stream.filename}"'},
    )


class ServerRestoreRequest(BaseModel):
    id: str
    mode: str = "update"
    dry_run: bool = False


def _parse_backup_bytes(data: bytes) -> dict:
    try:
        return json.loads(data.decode("utf-8"))
    except Exception:
        raise HTTPException(
            status_code=400,
            detail={"message": "Could not read the file. Upload a valid .json backup.", "errors": []},
        )


async def _restore_response(payload: dict, mode: str, dry_run: bool, source: str):
    summary = _verify_backup(payload)
    if not summary["valid"]:
        raise HTTPException(status_code=400, detail={"message": "Invalid backup file.", "errors": summary["errors"]})
    if dry_run:
        return {"dry_run": True, **summary}
    if mode not in ("update", "replace"):
        raise HTTPException(status_code=400, detail="mode must be 'update' or 'replace'")
    result = await _apply_restore(payload, mode)
    await log_audit(
        "restore", "database", entity_label=source,
        summary=f"Restored database ({mode}) from {source} — {summary['total']} docs across {len(summary['collections'])} collection(s)",
        method="POST", path="/api/database/restore", status_code=200,
        request={"mode": mode, "source": source}, response={"result": result},
        metadata={"mode": mode, "total": summary["total"]},
    )
    return {"success": True, "mode": mode, "result": result, "total": summary["total"]}


@api_router.post("/database/restore/upload", tags=["Database"], summary="Restore from an uploaded backup")
async def restore_from_upload(
    file: UploadFile = File(...),
    mode: str = Form("update"),
    dry_run: bool = Form(False),
):
    payload = _parse_backup_bytes(await file.read())
    return await _restore_response(payload, mode, dry_run, source=file.filename or "upload")


@api_router.post("/database/restore/server", tags=["Database"], summary="Restore from a server backup")
async def restore_from_server(req: ServerRestoreRequest):
    bucket = _backup_bucket()
    try:
        stream = await bucket.open_download_stream(ObjectId(req.id))
    except Exception:
        raise HTTPException(status_code=404, detail="Backup not found")
    payload = _parse_backup_bytes(await stream.read())
    return await _restore_response(payload, req.mode, req.dry_run, source=stream.filename)


# ---------------------------------------------------------------------------
# Broadcast Channels (Guideline: Integration / Notification) — configure and
# live-test outbound notification channels. Secrets are never returned to the
# client and are redacted in the audit log.
# ---------------------------------------------------------------------------
BROADCAST_CHANNELS = [
    {
        "key": "telegram",
        "label": "Telegram",
        "description": "Send notifications through a Telegram bot.",
        "fields": [
            {"name": "bot_token", "label": "Bot Token", "type": "password", "required": True, "secret": True,
             "placeholder": "123456:ABC-DEF..."},
            {"name": "chat_id", "label": "Chat ID", "type": "text", "required": True,
             "placeholder": "-1001234567890"},
            {"name": "message_thread_id", "label": "Thread ID", "type": "text", "required": False,
             "placeholder": "Optional — topic/thread id"},
        ],
    },
    {
        "key": "discord",
        "label": "Discord",
        "description": "Post messages to a Discord channel via an incoming webhook.",
        "fields": [
            {"name": "webhook_url", "label": "Webhook URL", "type": "password", "required": True, "secret": True,
             "placeholder": "https://discord.com/api/webhooks/..."},
        ],
    },
    {
        "key": "slack",
        "label": "Slack",
        "description": "Post messages to Slack via an incoming webhook.",
        "fields": [
            {"name": "webhook_url", "label": "Webhook URL", "type": "password", "required": True, "secret": True,
             "placeholder": "https://hooks.slack.com/services/..."},
        ],
    },
    {
        "key": "webhook",
        "label": "Webhook",
        "description": "Send a JSON payload to a custom HTTP endpoint.",
        "fields": [
            {"name": "url", "label": "URL", "type": "text", "required": True, "secret": True,
             "placeholder": "https://example.com/hook"},
            {"name": "header_name", "label": "Custom Header Name", "type": "text", "required": False,
             "placeholder": "Optional — e.g. X-Signature"},
            {"name": "header_value", "label": "Custom Header Value", "type": "password", "required": False, "secret": True,
             "placeholder": "Optional — header value / secret"},
        ],
    },
    {
        "key": "email",
        "label": "Email (SMTP)",
        "description": "Send email notifications through an SMTP server.",
        "fields": [
            {"name": "host", "label": "SMTP Host", "type": "text", "required": True,
             "placeholder": "smtp.example.com"},
            {"name": "port", "label": "Port", "type": "number", "required": True, "placeholder": "587"},
            {"name": "username", "label": "Username", "type": "text", "required": True},
            {"name": "password", "label": "Password", "type": "password", "required": True, "secret": True},
            {"name": "from_address", "label": "From Address", "type": "text", "required": True,
             "placeholder": "noreply@example.com"},
            {"name": "from_name", "label": "Sender Name", "type": "text", "required": False,
             "placeholder": "Optional — shown as the email sender, e.g. BPR Bangun Arta"},
            {"name": "use_tls", "label": "Implicit TLS (port 465)", "type": "boolean", "required": False},
            {"name": "starttls", "label": "STARTTLS (port 587)", "type": "boolean", "required": False},
        ],
    },
]
_BROADCAST_BY_KEY = {c["key"]: c for c in BROADCAST_CHANNELS}


class BroadcastConfigRequest(BaseModel):
    config: dict = Field(default_factory=dict)


def _channel_or_404(key: str) -> dict:
    channel = _BROADCAST_BY_KEY.get(key)
    if not channel:
        raise HTTPException(status_code=404, detail="Unknown broadcast channel")
    return channel


def _merge_config(channel: dict, stored: dict, incoming: dict) -> dict:
    """Merge incoming values over stored ones. Empty secret fields keep the
    stored value so the client never needs to resend secrets."""
    merged = dict(stored or {})
    for f in channel["fields"]:
        name = f["name"]
        if name not in incoming:
            continue
        val = incoming.get(name)
        if f.get("secret") and (val is None or val == ""):
            continue  # keep the stored secret
        merged[name] = val
    return merged


def _is_configured(channel: dict, config: dict) -> bool:
    for f in channel["fields"]:
        if f.get("required"):
            val = (config or {}).get(f["name"])
            if val is None or val == "":
                return False
    return True


def _public_config(channel: dict, config: dict) -> dict:
    """Config for the client: secret fields are blanked; a `*_set` flag tells
    the UI a secret is already stored so it can show a 'leave blank' hint."""
    config = config or {}
    out = {}
    for f in channel["fields"]:
        name = f["name"]
        if f.get("secret"):
            out[name] = ""
            out[f"{name}_set"] = bool(config.get(name))
        else:
            out[name] = config.get(name, "" if f["type"] != "boolean" else False)
    return out


def _serialize_channel(channel: dict, doc: Optional[dict]) -> dict:
    config = (doc or {}).get("config", {})
    return {
        "key": channel["key"],
        "label": channel["label"],
        "description": channel["description"],
        "fields": channel["fields"],
        "config": _public_config(channel, config),
        "status": (doc or {}).get("status", "not_configured"),
        "last_tested_at": (doc or {}).get("last_tested_at"),
        "last_error": (doc or {}).get("last_error"),
        "updated_at": (doc or {}).get("updated_at"),
    }


# --- Live connection tests -------------------------------------------------
async def _test_telegram(cfg: dict):
    token = (cfg.get("bot_token") or "").strip()
    if not token:
        return False, "Bot Token is required."
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(f"https://api.telegram.org/bot{token}/getMe")
        data = r.json()
    except Exception as exc:
        return False, f"Request failed: {exc}"
    if r.status_code == 200 and data.get("ok"):
        uname = data.get("result", {}).get("username")
        return True, f"Connected to bot @{uname}." if uname else "Connected."
    return False, data.get("description") or f"HTTP {r.status_code}"


async def _test_discord(cfg: dict):
    url = (cfg.get("webhook_url") or "").strip()
    if not url:
        return False, "Webhook URL is required."
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(url)  # GET returns webhook metadata — no message sent
    except Exception as exc:
        return False, f"Request failed: {exc}"
    if r.status_code == 200:
        try:
            name = r.json().get("name")
        except Exception:
            name = None
        return True, f"Webhook valid ({name})." if name else "Webhook valid."
    return False, f"Invalid webhook (HTTP {r.status_code})."


async def _test_slack(cfg: dict):
    url = (cfg.get("webhook_url") or "").strip()
    if not url:
        return False, "Webhook URL is required."
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(url, json={"text": "✅ Test connection from CMS Broadcast."})
    except Exception as exc:
        return False, f"Request failed: {exc}"
    if r.status_code == 200 and r.text.strip().lower() == "ok":
        return True, "Test message delivered."
    return False, f"{r.text[:120] or 'Request failed'} (HTTP {r.status_code})."


async def _test_webhook(cfg: dict):
    url = (cfg.get("url") or "").strip()
    if not url:
        return False, "URL is required."
    headers = {}
    hn = (cfg.get("header_name") or "").strip()
    hv = cfg.get("header_value") or ""
    if hn and hv:
        headers[hn] = hv
    payload = {
        "event": "test_connection",
        "message": "Test connection from CMS Broadcast.",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(url, json=payload, headers=headers)
    except Exception as exc:
        return False, f"Request failed: {exc}"
    if 200 <= r.status_code < 300:
        return True, f"Endpoint responded HTTP {r.status_code}."
    return False, f"Endpoint responded HTTP {r.status_code}."


def _smtp_login_only(cfg: dict) -> None:
    ctx = ssl.create_default_context()
    host = cfg.get("host")
    port = int(cfg.get("port") or 587)
    username = cfg.get("username")
    password = cfg.get("password")
    if cfg.get("use_tls"):
        with smtplib.SMTP_SSL(host, port, context=ctx, timeout=20) as s:
            s.login(username, password)
        return
    with smtplib.SMTP(host, port, timeout=20) as s:
        s.ehlo()
        if cfg.get("starttls", True):
            s.starttls(context=ctx)
            s.ehlo()
        s.login(username, password)


async def _test_email(cfg: dict):
    for req in ("host", "port", "username", "password", "from_address"):
        if not cfg.get(req):
            return False, "Host, port, username, password and from address are required."
    try:
        await asyncio.to_thread(_smtp_login_only, cfg)
    except smtplib.SMTPAuthenticationError:
        return False, "SMTP authentication failed."
    except Exception as exc:
        return False, f"SMTP connection failed: {exc}"
    return True, "SMTP login succeeded."


_BROADCAST_TESTERS = {
    "telegram": _test_telegram,
    "discord": _test_discord,
    "slack": _test_slack,
    "webhook": _test_webhook,
    "email": _test_email,
}


@api_router.get("/broadcast/channels", tags=["Broadcast"], summary="List broadcast channels + status")
async def list_broadcast_channels():
    """All channels with their saved (secret-free) config and connection status."""
    docs = {}
    async for d in db.broadcast_configs.find({}, {"_id": 0}):
        if d.get("key"):
            docs[d["key"]] = d
    return [_serialize_channel(ch, docs.get(ch["key"])) for ch in BROADCAST_CHANNELS]


@api_router.get("/broadcast/channels/{key}", tags=["Broadcast"], summary="Get one broadcast channel")
async def get_broadcast_channel(key: str):
    channel = _channel_or_404(key)
    doc = await db.broadcast_configs.find_one({"key": key}, {"_id": 0})
    return _serialize_channel(channel, doc)


async def _upsert_channel(key: str, config: dict, status: str,
                          last_error: Optional[str] = None) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    existing = await db.broadcast_configs.find_one({"key": key})
    update = {
        "config": config,
        "status": status,
        "last_error": last_error,
        "updated_at": now,
    }
    if status == "connected":
        update["last_tested_at"] = now
    if existing:
        await db.broadcast_configs.update_one({"key": key}, {"$set": update})
    else:
        update["id"] = str(uuid.uuid4())
        update["key"] = key
        update["created_at"] = now
        await db.broadcast_configs.insert_one(update)
    return await db.broadcast_configs.find_one({"key": key}, {"_id": 0})


@api_router.put("/broadcast/channels/{key}", tags=["Broadcast"], summary="Save a channel config")
async def save_broadcast_channel(key: str, body: BroadcastConfigRequest):
    """Persist channel credentials. Status resets to configured/not_configured;
    use the test endpoint to verify and mark it Connected."""
    channel = _channel_or_404(key)
    existing = await db.broadcast_configs.find_one({"key": key})
    stored = (existing or {}).get("config", {})
    merged = _merge_config(channel, stored, body.config)
    status = "configured" if _is_configured(channel, merged) else "not_configured"
    doc = await _upsert_channel(key, merged, status, last_error=None)
    await log_audit(
        "configure", "broadcast",
        entity_id=key, entity_label=channel["label"],
        summary=f"Saved {channel['label']} configuration",
        method="PUT", path=f"/api/broadcast/channels/{key}", status_code=200,
        request={"config": merged}, metadata={"status": status},
    )
    return _serialize_channel(channel, doc)


@api_router.post("/broadcast/channels/{key}/test", tags=["Broadcast"], summary="Live-test a channel")
async def test_broadcast_channel(key: str, body: BroadcastConfigRequest):
    """Run a live connection test with the given (or stored) config, persist it,
    and update the channel status to `connected` or `error`."""
    channel = _channel_or_404(key)
    existing = await db.broadcast_configs.find_one({"key": key})
    stored = (existing or {}).get("config", {})
    merged = _merge_config(channel, stored, body.config)
    if not _is_configured(channel, merged):
        raise HTTPException(status_code=400, detail="Please fill in all required fields before testing.")
    ok, message = await _BROADCAST_TESTERS[key](merged)
    status = "connected" if ok else "error"
    doc = await _upsert_channel(key, merged, status, last_error=None if ok else message)
    await log_audit(
        "test", "broadcast",
        entity_id=key, entity_label=channel["label"],
        summary=f"Tested {channel['label']} connection — {'success' if ok else 'failed'}",
        method="POST", path=f"/api/broadcast/channels/{key}/test",
        status_code=200 if ok else 400,
        metadata={"ok": ok, "message": message},
    )
    return {"ok": ok, "message": message, "channel": _serialize_channel(channel, doc)}


# --- Live message senders (actually deliver a message) ---------------------
DEFAULT_TEST_MESSAGE = "🔔 Test broadcast message from the CMS."


async def _send_telegram(cfg: dict, message: str):
    token = (cfg.get("bot_token") or "").strip()
    payload = {"chat_id": cfg.get("chat_id"), "text": message}
    tid = (str(cfg.get("message_thread_id") or "")).strip()
    if tid:
        try:
            payload["message_thread_id"] = int(tid)
        except ValueError:
            payload["message_thread_id"] = tid
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(f"https://api.telegram.org/bot{token}/sendMessage", json=payload)
        data = r.json()
    except Exception as exc:
        return False, f"Request failed: {exc}"
    if r.status_code == 200 and data.get("ok"):
        return True, "Message delivered to Telegram."
    return False, data.get("description") or f"HTTP {r.status_code}"


async def _send_discord(cfg: dict, message: str):
    url = (cfg.get("webhook_url") or "").strip()
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(url, json={"content": message})
    except Exception as exc:
        return False, f"Request failed: {exc}"
    if 200 <= r.status_code < 300:
        return True, "Message posted to Discord."
    return False, f"HTTP {r.status_code}"


async def _send_slack(cfg: dict, message: str):
    url = (cfg.get("webhook_url") or "").strip()
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(url, json={"text": message})
    except Exception as exc:
        return False, f"Request failed: {exc}"
    if r.status_code == 200 and r.text.strip().lower() == "ok":
        return True, "Message posted to Slack."
    return False, f"{r.text[:120] or 'Request failed'} (HTTP {r.status_code})."


async def _send_webhook(cfg: dict, message: str):
    url = (cfg.get("url") or "").strip()
    headers = {}
    hn = (cfg.get("header_name") or "").strip()
    hv = cfg.get("header_value") or ""
    if hn and hv:
        headers[hn] = hv
    payload = {
        "event": "test_message",
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(url, json=payload, headers=headers)
    except Exception as exc:
        return False, f"Request failed: {exc}"
    if 200 <= r.status_code < 300:
        return True, f"Endpoint responded HTTP {r.status_code}."
    return False, f"Endpoint responded HTTP {r.status_code}."


def _send_email_sync(cfg: dict, to: str, subject: str, body: str) -> None:
    ctx = ssl.create_default_context()
    msg = EmailMessage()
    from_addr = cfg.get("from_address")
    from_name = (cfg.get("from_name") or "").strip()
    msg["From"] = f"{from_name} <{from_addr}>" if from_name else from_addr
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    host = cfg.get("host")
    port = int(cfg.get("port") or 587)
    if cfg.get("use_tls"):
        with smtplib.SMTP_SSL(host, port, context=ctx, timeout=20) as s:
            s.login(cfg.get("username"), cfg.get("password"))
            s.send_message(msg)
        return
    with smtplib.SMTP(host, port, timeout=20) as s:
        s.ehlo()
        if cfg.get("starttls", True):
            s.starttls(context=ctx)
            s.ehlo()
        s.login(cfg.get("username"), cfg.get("password"))
        s.send_message(msg)


_BROADCAST_SENDERS = {
    "telegram": _send_telegram,
    "discord": _send_discord,
    "slack": _send_slack,
    "webhook": _send_webhook,
}


class BroadcastSendRequest(BaseModel):
    to: Optional[str] = None
    message: Optional[str] = None


@api_router.post("/broadcast/channels/{key}/send-test", tags=["Broadcast"], summary="Send a real test message")
async def send_test_broadcast(key: str, body: BroadcastSendRequest):
    """Deliver an actual test message through the saved channel config. Email
    requires a recipient (`to`)."""
    channel = _channel_or_404(key)
    doc = await db.broadcast_configs.find_one({"key": key})
    config = (doc or {}).get("config")
    if not config or not _is_configured(channel, config):
        raise HTTPException(status_code=400, detail="Please configure and save this channel first.")
    message = (body.message or "").strip() or DEFAULT_TEST_MESSAGE
    to = (body.to or "").strip()
    if key == "email":
        if not to:
            raise HTTPException(status_code=400, detail="Recipient email address is required.")
        try:
            await asyncio.to_thread(_send_email_sync, config, to, "CMS test message", message)
            ok, result_msg = True, f"Email sent to {to}."
        except smtplib.SMTPAuthenticationError:
            ok, result_msg = False, "SMTP authentication failed."
        except Exception as exc:
            ok, result_msg = False, f"Send failed: {exc}"
    else:
        ok, result_msg = await _BROADCAST_SENDERS[key](config, message)
    await log_audit(
        "send_test", "broadcast",
        entity_id=key, entity_label=channel["label"],
        summary=f"Sent test message via {channel['label']} — {'success' if ok else 'failed'}",
        method="POST", path=f"/api/broadcast/channels/{key}/send-test",
        status_code=200 if ok else 400,
        metadata={"ok": ok, "message": result_msg, "to": to or None},
    )
    return {"ok": ok, "message": result_msg}


# ---------------------------------------------------------------------------
# Branding (Guideline: Configuration) — app identity + SEO metadata, with
# image assets stored in GridFS and served through a public endpoint.
# ---------------------------------------------------------------------------
BRANDING_BUCKET = "branding_assets"
BRANDING_KEY = "branding"
BRANDING_ASSET_KINDS = ("logo_light", "logo_dark", "favicon", "og_image")
_MAX_ASSET_BYTES = 5 * 1024 * 1024  # 5 MB

DEFAULT_BRANDING = {
    "app_name": "Application Name",
    "tagline": "",
    "meta_description": "",
    "meta_keywords": "",
    "og_title": "",
    "og_description": "",
    "site_url": "",
    "canonical_url": "",
    "allow_indexing": True,
    "support_email": "",
    "copyright_text": "",
}


def _branding_bucket() -> AsyncIOMotorGridFSBucket:
    return AsyncIOMotorGridFSBucket(db, bucket_name=BRANDING_BUCKET)


class BrandingUpdate(BaseModel):
    app_name: Optional[str] = None
    tagline: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    site_url: Optional[str] = None
    canonical_url: Optional[str] = None
    allow_indexing: Optional[bool] = None
    support_email: Optional[str] = None
    copyright_text: Optional[str] = None


def _serialize_branding(doc: Optional[dict]) -> dict:
    doc = doc or {}
    out = {**DEFAULT_BRANDING}
    for k in DEFAULT_BRANDING:
        if doc.get(k) is not None:
            out[k] = doc[k]
    assets = doc.get("assets", {}) or {}
    out["assets"] = {}
    for kind in BRANDING_ASSET_KINDS:
        a = assets.get(kind)
        if a and a.get("file_id"):
            out["assets"][kind] = {
                "url": f"/api/branding/assets/{a['file_id']}",
                "filename": a.get("filename"),
                "content_type": a.get("content_type"),
            }
        else:
            out["assets"][kind] = None
    out["updated_at"] = doc.get("updated_at")
    return out


async def _get_branding_doc() -> Optional[dict]:
    return await db.branding.find_one({"key": BRANDING_KEY})


async def _delete_asset_file(file_id: str):
    try:
        await _branding_bucket().delete(ObjectId(file_id))
    except Exception:  # pragma: no cover - best effort cleanup
        pass


@api_router.get("/branding", tags=["Branding"], summary="Get branding settings")
async def get_branding():
    """Public branding + SEO settings (used to render the app head and shell)."""
    return _serialize_branding(await _get_branding_doc())


@api_router.put("/branding", tags=["Branding"], summary="Update branding settings")
async def update_branding(body: BrandingUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    existing = await _get_branding_doc()
    now = datetime.now(timezone.utc).isoformat()
    changes = _diff_changes(existing or {}, updates) if existing else []
    updates["updated_at"] = now
    if existing:
        await db.branding.update_one({"key": BRANDING_KEY}, {"$set": updates})
    else:
        updates["key"] = BRANDING_KEY
        updates["created_at"] = now
        await db.branding.insert_one(updates)
    doc = await _get_branding_doc()
    await log_audit(
        "update", "branding", entity_id=BRANDING_KEY, entity_label=doc.get("app_name"),
        summary="Updated branding settings",
        method="PUT", path="/api/branding", status_code=200,
        changes=changes, request={k: v for k, v in updates.items() if k != "_id"},
    )
    return _serialize_branding(doc)


@api_router.post("/branding/assets/{kind}", tags=["Branding"], summary="Upload a branding image")
async def upload_branding_asset(kind: str, file: UploadFile = File(...)):
    if kind not in BRANDING_ASSET_KINDS:
        raise HTTPException(status_code=404, detail="Unknown asset kind")
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file.")
    data = await file.read()
    if len(data) > _MAX_ASSET_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 5 MB).")
    bucket = _branding_bucket()
    grid_in = bucket.open_upload_stream(
        file.filename or kind,
        metadata={"kind": kind, "content_type": content_type},
    )
    await grid_in.write(data)
    await grid_in.close()
    file_id = str(grid_in._id)
    existing = await _get_branding_doc()
    old = ((existing or {}).get("assets", {}) or {}).get(kind)
    now = datetime.now(timezone.utc).isoformat()
    asset = {"file_id": file_id, "filename": file.filename, "content_type": content_type}
    if existing:
        await db.branding.update_one(
            {"key": BRANDING_KEY},
            {"$set": {f"assets.{kind}": asset, "updated_at": now}},
        )
    else:
        await db.branding.insert_one({
            "key": BRANDING_KEY, "created_at": now, "updated_at": now,
            "assets": {kind: asset},
        })
    if old and old.get("file_id"):
        await _delete_asset_file(old["file_id"])
    await log_audit(
        "update", "branding", entity_id=BRANDING_KEY,
        summary=f"Uploaded {kind} image",
        method="POST", path=f"/api/branding/assets/{kind}", status_code=200,
        metadata={"kind": kind, "filename": file.filename},
    )
    return _serialize_branding(await _get_branding_doc())


@api_router.delete("/branding/assets/{kind}", tags=["Branding"], summary="Remove a branding image")
async def delete_branding_asset(kind: str):
    if kind not in BRANDING_ASSET_KINDS:
        raise HTTPException(status_code=404, detail="Unknown asset kind")
    existing = await _get_branding_doc()
    old = ((existing or {}).get("assets", {}) or {}).get(kind)
    if old and old.get("file_id"):
        await _delete_asset_file(old["file_id"])
    await db.branding.update_one({"key": BRANDING_KEY}, {"$unset": {f"assets.{kind}": ""}})
    await log_audit(
        "update", "branding", entity_id=BRANDING_KEY,
        summary=f"Removed {kind} image",
        method="DELETE", path=f"/api/branding/assets/{kind}", status_code=200,
        metadata={"kind": kind},
    )
    return _serialize_branding(await _get_branding_doc())


@api_router.get("/branding/assets/{file_id}", tags=["Branding"], summary="Serve a branding image")
async def get_branding_asset(file_id: str):
    bucket = _branding_bucket()
    try:
        stream = await bucket.open_download_stream(ObjectId(file_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Asset not found")
    data = await stream.read()
    meta = stream.metadata or {}
    content_type = meta.get("content_type") or "application/octet-stream"
    return StreamingResponse(
        io.BytesIO(data),
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=300"},
    )


# ---------------------------------------------------------------------------
# Sitemap URLs (CRUD) — the list of public paths included in sitemap.xml.
# Seeded with the site root by default; fully manageable by the admin.
# ---------------------------------------------------------------------------
_CHANGEFREQ = {"always", "hourly", "daily", "weekly", "monthly", "yearly", "never"}


class SitemapUrlCreate(BaseModel):
    path: str
    changefreq: Optional[str] = "weekly"
    priority: Optional[str] = "0.5"
    enabled: Optional[bool] = True


class SitemapUrlUpdate(BaseModel):
    path: Optional[str] = None
    changefreq: Optional[str] = None
    priority: Optional[str] = None
    enabled: Optional[bool] = None


def _norm_path(p: Optional[str]) -> Optional[str]:
    p = (p or "").strip()
    if not p:
        return None
    if not p.startswith("/"):
        p = "/" + p
    return p


def _norm_priority(v) -> str:
    try:
        f = max(0.0, min(1.0, float(v)))
    except (TypeError, ValueError):
        f = 0.5
    return f"{f:.1f}"


async def _seed_sitemap_if_empty():
    if await db.sitemap_urls.count_documents({}) == 0:
        now = datetime.now(timezone.utc).isoformat()
        await db.sitemap_urls.insert_one({
            "id": str(uuid.uuid4()), "path": "/", "changefreq": "weekly",
            "priority": "1.0", "enabled": True, "created_at": now, "updated_at": now,
        })


@api_router.get("/sitemap-urls", tags=["Branding"], summary="List sitemap URLs")
async def list_sitemap_urls():
    await _seed_sitemap_if_empty()
    docs = await db.sitemap_urls.find({}, {"_id": 0}).sort("path", 1).to_list(1000)
    return docs


@api_router.post("/sitemap-urls", status_code=201, tags=["Branding"], summary="Add a sitemap URL")
async def create_sitemap_url(body: SitemapUrlCreate):
    path = _norm_path(body.path)
    if not path:
        raise HTTPException(status_code=400, detail="Path is required.")
    changefreq = (body.changefreq or "weekly").lower()
    if changefreq not in _CHANGEFREQ:
        raise HTTPException(status_code=400, detail="Invalid change frequency.")
    if await db.sitemap_urls.find_one({"path": path}):
        raise HTTPException(status_code=409, detail="This path is already in the sitemap.")
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()), "path": path, "changefreq": changefreq,
        "priority": _norm_priority(body.priority), "enabled": bool(body.enabled),
        "created_at": now, "updated_at": now,
    }
    await db.sitemap_urls.insert_one(dict(doc))
    await log_audit(
        "create", "branding", entity_id=doc["id"], entity_label=path,
        summary=f"Added sitemap URL {path}",
        method="POST", path="/api/sitemap-urls", status_code=201, request={"path": path},
    )
    return {k: v for k, v in doc.items() if k != "_id"}


@api_router.put("/sitemap-urls/{url_id}", tags=["Branding"], summary="Update a sitemap URL")
async def update_sitemap_url(url_id: str, body: SitemapUrlUpdate):
    existing = await db.sitemap_urls.find_one({"id": url_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Sitemap URL not found")
    updates = {}
    if body.path is not None:
        path = _norm_path(body.path)
        if not path:
            raise HTTPException(status_code=400, detail="Path is required.")
        clash = await db.sitemap_urls.find_one({"path": path, "id": {"$ne": url_id}})
        if clash:
            raise HTTPException(status_code=409, detail="This path is already in the sitemap.")
        updates["path"] = path
    if body.changefreq is not None:
        cf = body.changefreq.lower()
        if cf not in _CHANGEFREQ:
            raise HTTPException(status_code=400, detail="Invalid change frequency.")
        updates["changefreq"] = cf
    if body.priority is not None:
        updates["priority"] = _norm_priority(body.priority)
    if body.enabled is not None:
        updates["enabled"] = bool(body.enabled)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.sitemap_urls.update_one({"id": url_id}, {"$set": updates})
    await log_audit(
        "update", "branding", entity_id=url_id, entity_label=updates.get("path", existing["path"]),
        summary=f"Updated sitemap URL {existing['path']}",
        method="PUT", path=f"/api/sitemap-urls/{url_id}", status_code=200,
        changes=_diff_changes(existing, updates),
    )
    doc = await db.sitemap_urls.find_one({"id": url_id}, {"_id": 0})
    return doc


@api_router.delete("/sitemap-urls/{url_id}", tags=["Branding"], summary="Delete a sitemap URL")
async def delete_sitemap_url(url_id: str):
    existing = await db.sitemap_urls.find_one({"id": url_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Sitemap URL not found")
    await db.sitemap_urls.delete_one({"id": url_id})
    await log_audit(
        "delete", "branding", entity_id=url_id, entity_label=existing["path"],
        summary=f"Deleted sitemap URL {existing['path']}",
        method="DELETE", path=f"/api/sitemap-urls/{url_id}", status_code=200,
    )
    return {"success": True}


# ---------------------------------------------------------------------------
# SEO endpoints — dynamic robots.txt (from Branding visibility) + sitemap.xml.
# Served under /api; the frontend dev proxy (src/setupProxy.js) exposes them at
# the root paths /robots.txt and /sitemap.xml that crawlers expect.
# ---------------------------------------------------------------------------
def _branding_site(b: dict) -> str:
    return (b.get("site_url") or b.get("canonical_url") or "").rstrip("/")


@api_router.get("/robots.txt", tags=["Branding"], summary="Dynamic robots.txt")
async def robots_txt():
    b = _serialize_branding(await _get_branding_doc())
    site = _branding_site(b)
    lines = ["User-agent: *"]
    if b.get("allow_indexing"):
        lines.append("Allow: /")
        if site:
            lines.append(f"Sitemap: {site}/sitemap.xml")
    else:
        lines.append("Disallow: /")
    return PlainTextResponse("\n".join(lines) + "\n")


@api_router.get("/sitemap.xml", tags=["Branding"], summary="Auto-generated sitemap.xml")
async def sitemap_xml():
    from xml.sax.saxutils import escape

    b = _serialize_branding(await _get_branding_doc())
    site = _branding_site(b)
    default_lastmod = (b.get("updated_at") or "")[:10]
    body = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    # Only emit URLs when a public site URL is configured (avoids leaking internal paths).
    if site:
        await _seed_sitemap_if_empty()
        entries = await db.sitemap_urls.find({"enabled": True}, {"_id": 0}).sort("path", 1).to_list(1000)
        for e in entries:
            path = e.get("path") or "/"
            loc = f"{site}{path}"
            lm = e.get("lastmod") or default_lastmod
            body.append("  <url>")
            body.append(f"    <loc>{escape(loc)}</loc>")
            if lm:
                body.append(f"    <lastmod>{lm}</lastmod>")
            if e.get("changefreq"):
                body.append(f"    <changefreq>{e['changefreq']}</changefreq>")
            if e.get("priority"):
                body.append(f"    <priority>{e['priority']}</priority>")
            body.append("  </url>")
    body.append("</urlset>")
    return Response("\n".join(body) + "\n", media_type="application/xml")


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
