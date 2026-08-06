from fastapi import FastAPI, APIRouter, HTTPException, Query, Response, UploadFile, File, Form, Depends, Header, Request
from fastapi.responses import StreamingResponse, PlainTextResponse, JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
import time
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from bson import ObjectId
from pymongo import UpdateOne, InsertOne, ReturnDocument
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
import jwt
import secrets
import hashlib
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

# Deployment config (Guideline: Configuration Management) — standard env names.
# JWT_SECRET and ADMIN_PASSWORD are security-critical: FAIL FAST if missing
# (never fall back to a guessable default that would let anyone forge tokens).
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is required (no insecure default allowed).")
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL') or 'admin@example.com'
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD')
if not ADMIN_PASSWORD:
    raise RuntimeError("ADMIN_PASSWORD environment variable is required (no insecure default allowed).")
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
LOCAL_STORAGE_DIR = os.environ.get('LOCAL_STORAGE_DIR') or '/app/data'
try:
    Path(LOCAL_STORAGE_DIR).mkdir(parents=True, exist_ok=True)
except Exception:  # pragma: no cover - non-fatal, filesystem may be read-only
    pass

# --- API Engineering Standards config (Guideline: API Engineering Standards) ---
# Public API version exposed via URI alias (/api/v1) + X-API-Version header.
API_VERSION = "v1"
# Global JSON payload cap (Guideline: Payload Integrity). Uploads are guarded
# per-endpoint (multipart is exempt here).
MAX_REQUEST_BYTES = int(os.environ.get('MAX_REQUEST_BYTES') or str(2 * 1024 * 1024))
# Idempotency replay window (Guideline: Idempotency Implementation).
IDEMPOTENCY_TTL_SECONDS = int(os.environ.get('IDEMPOTENCY_TTL_SECONDS') or "86400")

# Stable, machine-readable error codes (Guideline: Error Code Standardization).
_STATUS_ERROR_CODES = {
    400: "bad_request", 401: "unauthenticated", 403: "forbidden",
    404: "not_found", 405: "method_not_allowed", 409: "conflict",
    413: "payload_too_large", 422: "validation_error", 429: "rate_limited",
    500: "internal_error", 503: "service_unavailable",
}


def _request_id(request) -> str:
    """Correlation id for this request (set by the observability middleware)."""
    try:
        return getattr(request.state, "request_id", "-") or "-"
    except Exception:
        return "-"


def _error_body(request, status_code: int, detail, code: Optional[str] = None) -> dict:
    """Consistent error envelope: keeps `detail` (backward compatible) and adds a
    stable `code` plus the `request_id` for end-to-end tracing."""
    return {
        "detail": detail,
        "code": code or _STATUS_ERROR_CODES.get(status_code, "error"),
        "request_id": _request_id(request),
    }


async def _auto_seed_if_empty():
    """Insert the default snapshot only when all CMS collections are empty (idempotent)."""
    counts = [
        await db.offices.count_documents({}),
        await db.roles.count_documents({}),
        await db.levels.count_documents({}),
        await db.users.count_documents({}),
    ]
    if any(counts):
        logger.info("Auto-seed skipped: existing data present.")
        return
    from seed_data import load_seed_snapshot, load_branding_assets, SEED_COLLECTIONS  # local import

    snap = load_seed_snapshot()
    summary = {}
    for coll in SEED_COLLECTIONS:
        docs = snap.get(coll) or []
        if docs:
            await db[coll].insert_many([dict(d) for d in docs])
        summary[coll] = len(docs)

    # Recreate branding GridFS assets with their original ids so branding refs resolve.
    import base64
    assets = load_branding_assets()
    if assets:
        bucket = _branding_bucket()
        for a in assets:
            data = base64.b64decode(a["data_b64"])
            grid_in = bucket.open_upload_stream_with_id(
                ObjectId(a["file_id"]),
                a.get("filename") or a.get("kind"),
                metadata={"kind": a.get("kind"), "content_type": a.get("content_type")},
            )
            await grid_in.write(data)
            await grid_in.close()
    summary["branding_assets"] = len(assets)
    logger.info("Auto-seed from snapshot (empty DB): %s", summary)


async def _seed_admin():
    """Idempotently ensure an admin account exists from ADMIN_EMAIL/ADMIN_PASSWORD.

    Creates the admin with a bcrypt-hashed password when missing; if it exists but
    the env password changed, re-syncs the hash. Runs on every startup.
    """
    now = datetime.now(timezone.utc)
    pw_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Administrator",
            "email": ADMIN_EMAIL,
            "username": "admin",
            "phone": None,
            "role_id": None,
            "office_id": None,
            "alias": None,
            "mso_code": None,
            "collector_code": None,
            "device_identifier": None,
            "device_name": None,
            "device_os": None,
            "fcm_token": None,
            "password": pw_hash,
            "password_history": [pw_hash],
            "password_changed_at": now.isoformat(),
            "password_expires_at": (now + timedelta(days=PASSWORD_EXPIRY_DAYS)).isoformat(),
            "must_change_password": False,
            "is_admin": True,
            "deleted_at": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        })
        logger.info("Admin seeded: %s", ADMIN_EMAIL)
    else:
        stored = existing.get("password") or ""
        needs_update = True
        try:
            needs_update = not bcrypt.checkpw(ADMIN_PASSWORD.encode("utf-8"), stored.encode("utf-8"))
        except Exception:  # pragma: no cover - malformed stored hash
            needs_update = True
        if needs_update:
            await db.users.update_one(
                {"email": ADMIN_EMAIL},
                {"$set": {"password": pw_hash, "is_admin": True, "updated_at": now.isoformat()}},
            )
            logger.info("Admin password synced from env: %s", ADMIN_EMAIL)


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
    # Idempotency store (Guideline: Idempotency Implementation) — unique per
    # (scope,key,path) + TTL so replayed requests return the stored response and
    # keys auto-expire after the configured window.
    try:
        await db.idempotency_keys.create_index(
            [("scope", 1), ("key", 1), ("path", 1)], unique=True
        )
        await db.idempotency_keys.create_index(
            "created_at", expireAfterSeconds=IDEMPOTENCY_TTL_SECONDS
        )
    except Exception as exc:  # pragma: no cover - non-fatal
        logger.warning("Idempotency index create skipped: %s", exc)
    try:
        await db.password_resets.create_index("expires_at", expireAfterSeconds=0)
    except Exception as exc:  # pragma: no cover - non-fatal
        logger.warning("Password-reset index create skipped: %s", exc)
    try:
        await db.revoked_tokens.create_index("expires_at", expireAfterSeconds=0)
    except Exception as exc:  # pragma: no cover - non-fatal
        logger.warning("Revoked-tokens index create skipped: %s", exc)
    try:
        await db.sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.sessions.create_index("user_id")
        await db.sessions.create_index("revoked")
    except Exception as exc:  # pragma: no cover - non-fatal
        logger.warning("Sessions index create skipped: %s", exc)
    logger.info("Startup complete: indexes ensured.")
    # Auto-seed FIRST (empty DB) so the snapshot — including the Super Admin user —
    # is inserted before _seed_admin runs; otherwise _seed_admin would create the
    # admin, making the DB non-empty and skipping the rest of the seed.
    if AUTO_SEED:
        try:
            await _auto_seed_if_empty()
        except Exception as exc:  # pragma: no cover - non-fatal
            logger.error("Auto-seed failed (non-fatal): %s", exc)
    try:
        await _seed_admin()
    except Exception as exc:  # pragma: no cover - non-fatal, keep the app booting
        logger.error("Admin seed failed (non-fatal): %s", exc)
    try:
        await _backfill_user_ids()
    except Exception as exc:  # pragma: no cover - non-fatal
        logger.error("user_id backfill failed (non-fatal): %s", exc)
    try:
        import routes_database_ext as _bk
        _bk.start_scheduler()
    except Exception as exc:  # pragma: no cover - non-fatal
        logger.error("Backup scheduler start failed (non-fatal): %s", exc)
    yield
    try:
        import routes_database_ext as _bk
        _bk.stop_scheduler()
    except Exception:  # pragma: no cover
        pass
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
    """Readiness probe — verifies the database connection is reachable.

    Use this for READINESS (route traffic only when the DB is up). Do NOT use it
    as the container restart/liveness probe, or a brief DB warm-up/blip will
    needlessly restart the process — use `/api/health/live` for that instead.
    """
    try:
        await db.command("ping")
    except Exception as exc:  # pragma: no cover - defensive
        logger.error("Health check failed: %s", exc)
        raise HTTPException(status_code=503, detail="Database unavailable")
    return {"status": "ok", "database": "connected"}


@api_router.get("/health/live", tags=["System"], summary="Liveness (no DB dependency)")
async def health_live():
    """Liveness probe — confirms the process is up WITHOUT touching the database.

    Point the container's restart/liveness health-check here so the app is not
    restarted while MongoDB is still warming up or during a transient DB blip
    (Guideline: Health Monitoring — distinguish liveness vs readiness).
    """
    return {"status": "alive"}


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










# ---------------------------------------------------------------------------
# Users (CMS) — with password policy (90-day expiry, no-reuse of last N)
# ---------------------------------------------------------------------------
PASSWORD_EXPIRY_DAYS = int(os.environ.get("PASSWORD_EXPIRY_DAYS") or "90")
PASSWORD_HISTORY_LIMIT = int(os.environ.get("PASSWORD_HISTORY_LIMIT") or "3")
DEFAULT_USER_PASSWORD = os.environ.get("DEFAULT_USER_PASSWORD", "bpr2026")
PASSWORD_EXPIRY_WARN_DAYS = 14
EMAIL_RE = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

# Nullable + unique business fields (enforced at the application layer so
# soft-deleted records can free their values and multiple NULLs are allowed).
UNIQUE_USER_FIELDS = ["user_id", "username", "phone", "email", "alias", "mso_code", "collector_code"]
# Optional fields normalized "" -> None so blanks never collide on uniqueness.
NULLABLE_USER_FIELDS = [
    "office_id",
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
        "user_id": doc.get("user_id"),
        "name": doc.get("name"),
        "username": doc.get("username"),
        "phone": doc.get("phone"),
        "email": doc.get("email"),
        "role_id": doc.get("role_id"),
        "role_name": roles.get(doc.get("role_id")),
        "is_admin": bool(doc.get("is_admin")),
        "office_id": doc.get("office_id"),
        "office_name": offices.get(doc.get("office_id")),
        "is_active": doc.get("is_active", True),
        "alias": doc.get("alias"),
        "mso_code": doc.get("mso_code"),
        "collector_code": doc.get("collector_code"),
        "device_identifier": doc.get("device_identifier"),
        "device_name": doc.get("device_name"),
        "device_os": doc.get("device_os"),
        "fcm_token": doc.get("fcm_token"),
        "device_bound": bool(doc.get("mobile_device")),
        "has_push": bool(doc.get("fcm_token")),
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


async def _next_user_id() -> int:
    """Return the next auto-increment user_id (unique). Uses a counters doc and
    guards against manually-set ids that are ahead of the counter."""
    doc = await db.counters.find_one_and_update(
        {"_id": "user_id"}, {"$inc": {"seq": 1}}, upsert=True, return_document=ReturnDocument.AFTER,
    )
    seq = int(doc.get("seq", 1))
    top = await db.users.find({"user_id": {"$type": "number"}}, {"_id": 0, "user_id": 1}).sort("user_id", -1).limit(1).to_list(1)
    mx = int(top[0]["user_id"]) if top else 0
    if seq <= mx:
        seq = mx + 1
        await db.counters.update_one({"_id": "user_id"}, {"$set": {"seq": seq}}, upsert=True)
    return seq


async def _backfill_user_ids():
    """Assign a sequential user_id to any existing user that lacks one (idempotent)."""
    missing = await db.users.find(
        {"$or": [{"user_id": {"$exists": False}}, {"user_id": None}]},
        {"_id": 0, "id": 1, "created_at": 1},
    ).sort("created_at", 1).to_list(100000)
    if not missing:
        return
    top = await db.users.find({"user_id": {"$type": "number"}}, {"_id": 0, "user_id": 1}).sort("user_id", -1).limit(1).to_list(1)
    seq = int(top[0]["user_id"]) if top else 0
    ops = []
    for u in missing:
        seq += 1
        ops.append(UpdateOne({"id": u["id"]}, {"$set": {"user_id": seq}}))
    if ops:
        await db.users.bulk_write(ops)
    await db.counters.update_one({"_id": "user_id"}, {"$set": {"seq": seq}}, upsert=True)
    logger.info("Backfilled user_id for %d user(s).", len(ops))


async def _validate_role_office(role_id: Optional[str], office_id: Optional[str]):
    if role_id is not None:
        if not await db.roles.find_one({"id": role_id}, {"_id": 0, "id": 1}):
            raise HTTPException(status_code=400, detail="Role not found")
    if office_id is not None:
        if not await db.offices.find_one({"id": office_id}, {"_id": 0, "id": 1}):
            raise HTTPException(status_code=400, detail="Office not found")






# ---------------------------------------------------------------------------
# Database Backup & Restore (Guideline: Backup/Restore).
# Full-DB JSON snapshots stored in GridFS (survives redeploys, no disk deps).
# Restore supports verify (dry-run) + two modes: update (upsert by id) / replace.
# ---------------------------------------------------------------------------
BACKUP_BUCKET = "backups"
# GridFS internal collections for the backup store itself — never dump/restore these.
_BACKUP_INTERNAL = (f"{BACKUP_BUCKET}.files", f"{BACKUP_BUCKET}.chunks")

# Collections excluded from logical (JSON) backup + restore:
#  - GridFS buckets (binary; cannot round-trip through JSON without corruption/duplication)
#  - transient/ephemeral runtime data (tokens, throttles, idempotency, usage counters)
# Excluding these keeps backups small and prevents restore from duplicating them.
_BACKUP_EXCLUDE = {
    f"{BACKUP_BUCKET}.files", f"{BACKUP_BUCKET}.chunks",
    "branding_assets.files", "branding_assets.chunks",
    "password_resets", "login_attempts", "idempotency_keys", "api_usage_daily",
}

# For restore mode='update', collections keyed by a natural field (not the app `id`).
# Prevents duplicate inserts on repeated restores (root cause of past data blow-up).
_RESTORE_NATURAL_KEY = {
    "email_templates": "key",
    "app_settings": "key",
    "broadcast_configs": "key",
    "branding": "key",
    "sitemap_urls": "loc",
}


def _backup_bucket() -> AsyncIOMotorGridFSBucket:
    return AsyncIOMotorGridFSBucket(db, bucket_name=BACKUP_BUCKET)


async def _dump_all_collections() -> tuple[dict, dict]:
    """Return ({collection: [docs...]}, {collection: count}) for every collection.
    GridFS + transient collections are excluded (see _BACKUP_EXCLUDE)."""
    names = [n for n in await db.list_collection_names() if n not in _BACKUP_EXCLUDE]
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
    mode='update' upserts docs by `id` (or a natural key) — never blind-inserts
    keyed docs, so repeated restores stay idempotent. GridFS + transient
    collections are skipped (see _BACKUP_EXCLUDE)."""
    result = {}
    for name, docs in payload["collections"].items():
        if name in _BACKUP_EXCLUDE:
            result[name] = {"mode": mode, "skipped": "excluded (gridfs/transient)"}
            continue
        col = db[name]
        clean = [{k: v for k, v in d.items() if k != "_id"} for d in docs]
        nat = _RESTORE_NATURAL_KEY.get(name)
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
                    elif nat and d.get(nat) is not None:
                        ops.append(UpdateOne({nat: d[nat]}, {"$set": d}, upsert=True))
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
    """Snapshot every collection to a JSON file in GridFS; returns its metadata.

    Delegates to the backup module which also mirrors to S3 (when configured)
    and enforces the retention limit (Guideline: Backup/Restore + Retention).
    """
    import routes_database_ext as _bk
    return await _bk.perform_backup(reason="manual")


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
            "s3_key": meta.get("s3_key"),
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


def _send_email_sync(cfg: dict, to: str, subject: str, body: str, html: Optional[str] = None) -> None:
    ctx = ssl.create_default_context()
    msg = EmailMessage()
    from_addr = cfg.get("from_address")
    from_name = (cfg.get("from_name") or "").strip()
    msg["From"] = f"{from_name} <{from_addr}>" if from_name else from_addr
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    if html:
        msg.add_alternative(html, subtype="html")
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
async def robots_txt(request: Request):
    b = _serialize_branding(await _get_branding_doc())
    site = _public_base_url(request) or (b.get("canonical_url") or "").rstrip("/")
    lines = ["User-agent: *"]
    if b.get("allow_indexing"):
        lines.append("Allow: /")
        if site:
            lines.append(f"Sitemap: {site}/sitemap.xml")
    else:
        lines.append("Disallow: /")
    return PlainTextResponse("\n".join(lines) + "\n")


@api_router.get("/sitemap.xml", tags=["Branding"], summary="Auto-generated sitemap.xml")
async def sitemap_xml(request: Request):
    from xml.sax.saxutils import escape

    b = _serialize_branding(await _get_branding_doc())
    site = _public_base_url(request) or (b.get("canonical_url") or "").rstrip("/")
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


# ---------------------------------------------------------------------------
# Authentication (JWT Bearer) — login with email / username / phone + password
# ---------------------------------------------------------------------------
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = int(os.environ.get("JWT_EXPIRY_HOURS") or "12")


def _create_access_token(user_id: str, jti: Optional[str] = None) -> str:
    payload = {
        "sub": user_id,
        "type": "access",
        "jti": jti or uuid.uuid4().hex,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def _record_session(jti: str, user_id: str, request: Optional[Request] = None,
                          *, token_type: str = "web", label: Optional[str] = None,
                          ttl_seconds: Optional[int] = None):
    """Persist an issued token as an active session — for admin visibility and
    remote revocation. `_id` is the token jti; `expires_at` drives TTL cleanup."""
    now = datetime.now(timezone.utc)
    ip = _client_ip(request) if request else None
    ua = request.headers.get("user-agent") if request else None
    ttl = ttl_seconds if ttl_seconds is not None else JWT_EXPIRY_HOURS * 3600
    await db.sessions.update_one(
        {"_id": jti},
        {"$set": {
            "user_id": user_id,
            "token_type": token_type,
            "label": label,
            "ip": ip,
            "user_agent": ua,
            "created_at": now,
            "expires_at": now + timedelta(seconds=ttl),
            "revoked": False,
            "revoked_at": None,
        }},
        upsert=True,
    )


async def _is_token_revoked(payload: dict) -> bool:
    """True if this token's session was revoked (logout or admin force-logout).
    Tokens without a session record (older/mobile tokens) are never blocked here."""
    jti = payload.get("jti")
    if not jti:
        return False
    doc = await db.sessions.find_one({"_id": jti}, {"revoked": 1})
    return bool(doc and doc.get("revoked"))


async def _revoke_token(payload: dict):
    """Mark a token's session revoked so it is rejected on the next request."""
    jti = payload.get("jti")
    if not jti:
        return
    exp = payload.get("exp")
    expires_at = (
        datetime.fromtimestamp(exp, tz=timezone.utc)
        if exp else datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS)
    )
    await db.sessions.update_one(
        {"_id": jti},
        {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc), "expires_at": expires_at}},
        upsert=True,
    )


async def _get_current_user(authorization: Optional[str] = Header(None)):
    """Resolve the authenticated user from a `Authorization: Bearer <token>` header."""
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if await _is_token_revoked(payload):
        raise HTTPException(status_code=401, detail="Token has been revoked")
    doc = await db.users.find_one({"id": payload.get("sub"), "deleted_at": None})
    if not doc:
        raise HTTPException(status_code=401, detail="User not found")
    if doc.get("is_active") is False:
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact your administrator.")
    return doc


# ---------------------------------------------------------------------------
# Brute-force protection — throttle repeated failed logins per IP+identifier.
# ---------------------------------------------------------------------------
LOGIN_MAX_ATTEMPTS = int(os.environ.get("LOGIN_MAX_ATTEMPTS") or "5")
LOGIN_LOCKOUT_MINUTES = int(os.environ.get("LOGIN_LOCKOUT_MINUTES") or "15")


def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _login_locked_until(key: str):
    doc = await db.login_attempts.find_one({"_id": key})
    if not doc or not doc.get("locked_until"):
        return None
    try:
        lu = datetime.fromisoformat(doc["locked_until"])
    except Exception:
        return None
    return lu if lu > datetime.now(timezone.utc) else None


async def _record_login_failure(key: str, ident: str, ip: str = ""):
    now = datetime.now(timezone.utc)
    doc = await db.login_attempts.find_one({"_id": key})
    fails = 1
    if doc and doc.get("last_fail_at"):
        try:
            within_window = (now - datetime.fromisoformat(doc["last_fail_at"])) < timedelta(minutes=LOGIN_LOCKOUT_MINUTES)
        except Exception:
            within_window = False
        if within_window:
            fails = int(doc.get("fails", 0)) + 1
    update = {"fails": fails, "last_fail_at": now.isoformat(), "identifier": ident, "ip": ip, "locked_until": None}
    locked = fails >= LOGIN_MAX_ATTEMPTS
    if locked:
        update["locked_until"] = (now + timedelta(minutes=LOGIN_LOCKOUT_MINUTES)).isoformat()
    await db.login_attempts.update_one({"_id": key}, {"$set": update}, upsert=True)
    return fails, locked


async def _clear_login_attempts(key: str):
    await db.login_attempts.delete_one({"_id": key})


class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email, username, or phone")
    password: str


@api_router.post("/auth/login", tags=["Auth"], summary="Login with email/username/phone + password")
async def login(payload: LoginRequest, request: Request):
    """Authenticate by email, username, or phone; return a JWT Bearer token.

    Applies brute-force throttling: after LOGIN_MAX_ATTEMPTS failures the
    IP+identifier is locked for LOGIN_LOCKOUT_MINUTES. Failures and lockouts
    are recorded in the audit log.
    """
    ident = (payload.identifier or "").strip()
    if not ident or not payload.password:
        raise HTTPException(status_code=400, detail="Identifier and password are required.")
    ident_lower = ident.lower()
    ip = _client_ip(request)
    key = f"{ip}:{ident_lower}"

    locked_until = await _login_locked_until(key)
    if locked_until:
        remaining = max(1, int((locked_until - datetime.now(timezone.utc)).total_seconds() // 60) + 1)
        await log_audit(
            "login_locked", "auth", entity_label=ident,
            summary=f"Blocked login (locked) for {ident} from {ip}",
            method="POST", path="/api/auth/login", status_code=429, actor=ident,
        )
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. Try again in about {remaining} minute(s).",
        )

    doc = await db.users.find_one({
        "deleted_at": None,
        "$or": [
            {"email": ident_lower},
            {"email": ident},
            {"username": ident},
            {"phone": ident},
        ],
    })
    if not doc or not _verify_password(payload.password, doc.get("password") or ""):
        fails, locked = await _record_login_failure(key, ident, ip)
        await log_audit(
            "login_failed", "auth", entity_label=ident,
            summary=f"Failed login for {ident} from {ip} (attempt {fails}/{LOGIN_MAX_ATTEMPTS})",
            method="POST", path="/api/auth/login", status_code=401, actor=ident,
        )
        if locked:
            await log_audit(
                "login_locked", "auth", entity_label=ident,
                summary=f"Account locked for {ident} from {ip} after {fails} failed attempts",
                method="POST", path="/api/auth/login", status_code=429, actor=ident,
            )
            raise HTTPException(
                status_code=429,
                detail=f"Too many failed attempts. Login locked for {LOGIN_LOCKOUT_MINUTES} minutes.",
            )
        left = max(0, LOGIN_MAX_ATTEMPTS - fails)
        detail = "Invalid credentials."
        if left <= 2:
            detail = f"Invalid credentials. {left} attempt(s) left before lockout."
        raise HTTPException(status_code=401, detail=detail)

    if doc.get("is_active") is False:
        raise HTTPException(
            status_code=403,
            detail="Your account has been deactivated. Please contact your administrator.",
        )

    await _clear_login_attempts(key)
    jti = uuid.uuid4().hex
    token = _create_access_token(doc["id"], jti=jti)
    await _record_session(jti, doc["id"], request)
    roles, offices = await _enrich_maps([doc])
    await log_audit(
        "login", "auth", entity_id=doc["id"],
        entity_label=f"{doc.get('name')} <{doc.get('email')}>",
        summary=f"Login {doc.get('email')} from {ip}",
        method="POST", path="/api/auth/login", status_code=200,
        actor=doc.get("email") or doc.get("name") or doc["id"],
    )
    return {
        "token": token,
        "token_type": "bearer",
        "expires_in": JWT_EXPIRY_HOURS * 3600,
        "must_change_password": _user_public(doc).get("must_change_password"),
        "user": _user_public(doc, roles, offices),
    }


@api_router.get("/auth/me", tags=["Auth"], summary="Get the current authenticated user")
async def auth_me(current=Depends(_get_current_user)):
    """Return the profile of the user represented by the Bearer token."""
    roles, offices = await _enrich_maps([current])
    return _user_public(current, roles, offices)


@api_router.post("/auth/logout", tags=["Auth"], summary="Logout (revokes the current token server-side)")
async def logout(authorization: Optional[str] = Header(None)):
    """Revoke the presented Bearer token server-side so it can no longer be used
    (defends against token theft after logout). The jti is stored until the token
    would have expired, then auto-cleaned via TTL."""
    token = authorization[7:].strip() if authorization and authorization.startswith("Bearer ") else None
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            await _revoke_token(payload)
        except jwt.InvalidTokenError:
            pass
    return {"success": True}


@api_router.get("/account/login-activity", tags=["Auth"], summary="Current user's own login history")
async def account_login_activity(
    response: Response,
    limit: int = Query(50, ge=1, le=200),
    current=Depends(_get_current_user),
):
    """Self-service: the signed-in user's own login history (success + failed),
    sourced from the durable audit log. Read-only, current user only."""
    idents = {
        (current.get("email") or "").lower(),
        current.get("email") or "",
        current.get("username") or "",
        current.get("phone") or "",
    }
    idents = [i for i in idents if i]
    docs = (
        await db.audit_logs.find(
            {"action": {"$in": ["login", "login_failed", "login_locked"]},
             "actor": {"$in": idents}},
            {"_id": 0},
        ).sort("created_at", -1).limit(limit).to_list(limit)
    )
    rows = []
    for d in docs:
        summ = d.get("summary") or ""
        m = re.search(r" from (\S+)", summ)
        rows.append({
            "id": d.get("id"),
            "created_at": d.get("created_at"),
            "action": d.get("action"),
            "ip": m.group(1) if m else "",
            "status_code": d.get("status_code"),
            "summary": summ,
        })
    response.headers["X-Total-Count"] = str(len(rows))
    return rows


@api_router.get("/account/password-resets", tags=["Auth"], summary="Current user's own password reset requests")
async def account_password_resets(
    response: Response,
    limit: int = Query(50, ge=1, le=200),
    current=Depends(_get_current_user),
):
    """Self-service: the signed-in user's own password-reset requests, sourced
    from the durable audit log. Read-only, current user only."""
    email = current.get("email") or ""
    uid = current.get("id")
    requests = (
        await db.audit_logs.find(
            {"action": "password_reset_requested",
             "$or": [{"entity_id": uid}, {"actor": email}, {"entity_label": email}]},
            {"_id": 0},
        ).sort("created_at", -1).limit(limit).to_list(limit)
    )
    completions = (
        await db.audit_logs.find(
            {"action": "password_reset", "entity_id": uid},
            {"_id": 0, "created_at": 1},
        ).sort("created_at", -1).limit(max(limit * 2, 50)).to_list(max(limit * 2, 50))
    )
    comp_at = completions[0].get("created_at") if completions else None
    rows = []
    for r in requests:
        md = r.get("metadata") or {}
        req_at = r.get("created_at")
        completed = bool(comp_at and req_at and comp_at >= req_at)
        rows.append({
            "id": r.get("id"),
            "email": r.get("actor") or r.get("entity_label"),
            "requested_at": req_at,
            "account_found": md.get("account_found"),
            "email_sent": md.get("email_sent"),
            "smtp_configured": md.get("smtp_configured"),
            "completed": completed,
            "completed_at": comp_at if completed else None,
        })
    response.headers["X-Total-Count"] = str(len(rows))
    return rows


async def _require_admin(authorization: Optional[str] = Header(None)):
    """Dependency: resolve the Bearer user and require the admin role."""
    user = await _get_current_user(authorization)
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


# ---------------------------------------------------------------------------
# Email Templates + self-service Password Reset — extracted into a dedicated
# feature router module (registers routes on api_router at import time).
# ---------------------------------------------------------------------------
import routes_email_auth  # noqa: E402,F401  (side-effect: route registration)
from routes_email_auth import _public_base_url  # used by robots.txt / sitemap.xml
import routes_database_ext  # noqa: E402,F401  (side-effect: route registration + scheduler)
import routes_clients  # noqa: E402,F401  (side-effect: route registration)
import routes_audit  # noqa: E402,F401  (side-effect: route registration)
import routes_offices  # noqa: E402,F401  (side-effect: route registration)
import routes_levels  # noqa: E402,F401  (side-effect: route registration)
import routes_roles  # noqa: E402,F401  (side-effect: route registration)
import routes_users  # noqa: E402,F401  (side-effect: route registration)
import routes_import  # noqa: E402,F401  (side-effect: route registration)
import routes_mobile_auth  # noqa: E402,F401  (side-effect: mobile JWT route registration)
import routes_notifications  # noqa: E402,F401  (side-effect: push notification route registration)
import routes_sessions  # noqa: E402,F401  (side-effect: active-sessions admin route registration)
# ---------------------------------------------------------------------------
# Login security — inspect throttle records (suspicious activity) & unlock.
# ---------------------------------------------------------------------------
@api_router.get("/login-attempts", tags=["Security"], summary="List login throttle records")
async def list_login_attempts(current=Depends(_require_admin)):
    now = datetime.now(timezone.utc)
    docs = await db.login_attempts.find({}).sort("last_fail_at", -1).to_list(1000)
    out = []
    for d in docs:
        locked_until = d.get("locked_until")
        is_locked = False
        if locked_until:
            try:
                is_locked = datetime.fromisoformat(locked_until) > now
            except Exception:
                is_locked = False
        out.append({
            "key": str(d.get("_id")),
            "ip": d.get("ip") or "",
            "identifier": d.get("identifier"),
            "fails": d.get("fails", 0),
            "last_fail_at": d.get("last_fail_at"),
            "locked_until": locked_until,
            "is_locked": is_locked,
        })
    return out


class UnlockRequest(BaseModel):
    key: str


@api_router.post("/login-attempts/unlock", tags=["Security"], summary="Manually unlock a login throttle record")
async def unlock_login_attempt(payload: UnlockRequest, current=Depends(_require_admin)):
    res = await db.login_attempts.delete_one({"_id": payload.key})
    await log_audit(
        "unlock", "auth", entity_label=payload.key,
        summary=f"Manually unlocked login throttle {payload.key}", method="POST",
        path="/api/login-attempts/unlock", status_code=200, actor=current.get("email"),
    )
    return {"success": True, "deleted": res.deleted_count}


@api_router.delete("/login-attempts/{key}", tags=["Security"], summary="Delete a login throttle record")
async def delete_login_attempt(key: str, current=Depends(_require_admin)):
    res = await db.login_attempts.delete_one({"_id": key})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Record not found.")
    await log_audit(
        "delete", "auth", entity_label=key,
        summary=f"Deleted login throttle record {key}", method="DELETE",
        path=f"/api/login-attempts/{key}", status_code=200, actor=current.get("email"),
    )
    return {"success": True}


@api_router.post("/login-attempts/clear", tags=["Security"], summary="Clear all login throttle records")
async def clear_login_attempts(current=Depends(_require_admin)):
    res = await db.login_attempts.delete_many({})
    await log_audit(
        "bulk_delete", "auth",
        summary=f"Cleared {res.deleted_count} login throttle record(s)", method="POST",
        path="/api/login-attempts/clear", status_code=200, actor=current.get("email"),
    )
    return {"success": True, "deleted": res.deleted_count}
# public whitelist); mutations require the admin role. Users may change their
# OWN password without admin rights (supports the forced-change flow).
# ---------------------------------------------------------------------------
_PUBLIC_API_PATHS = {
    "/api/", "/api/health", "/api/health/live",
    "/api/auth/login", "/api/auth/logout", "/api/auth/me",
    "/api/auth/forgot-password", "/api/auth/reset-password",
    "/api/robots.txt", "/api/sitemap.xml", "/api/branding",
    "/api/jwt-auth", "/api/jwt-me", "/api/jwt-refresh", "/api/jwt-logout",
}
_PUBLIC_GET_PREFIXES = ("/api/branding/assets/",)
_CHANGE_PW_RE = re.compile(r"^/api/users/([^/]+)/change-password$")
# External/API-client-facing endpoints use the unified {success, message|data}
# envelope, so their middleware errors must match (not the internal {detail} shape).
_UNIFIED_ENVELOPE_PATHS = {
    "/api/user-auth", "/api/user-password",
    "/api/user-create", "/api/user-update", "/api/user-deactivate",
    "/api/jwt-auth", "/api/jwt-me", "/api/jwt-refresh", "/api/jwt-logout",
}


def _envelope_error(request, status: int, message: str, extra_headers: Optional[dict] = None):
    """Error body in the unified mobile/API-client envelope: {success:false, message}."""
    headers = {"X-Request-ID": _request_id(request)}
    if extra_headers:
        headers.update(extra_headers)
    return JSONResponse({"success": False, "message": message}, status_code=status, headers=headers)


async def _user_from_token(token: Optional[str]):
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        return None
    if await _is_token_revoked(payload):
        return None
    return await db.users.find_one({"id": payload.get("sub"), "deleted_at": None})


# API-key auth: keys never reach management/auth/system endpoints. API function
# is not defined yet, so an active key is allowed on all other /api routes.
_APIKEY_BLOCKED_PREFIXES = ("/api/clients", "/api/auth", "/api/database", "/api/login-attempts", "/api/sessions")


async def _client_from_api_key(api_key: str):
    key_hash = hashlib.sha256(api_key.encode("utf-8")).hexdigest()
    return await db.api_clients.find_one({"key_hash": key_hash, "active": True})


# Per-key fixed-window rate limit (protects the server from overload).
APIKEY_RATE_LIMIT = int(os.environ.get("APIKEY_RATE_LIMIT") or "60")
APIKEY_RATE_WINDOW_SECONDS = int(os.environ.get("APIKEY_RATE_WINDOW_SECONDS") or "60")


def _apikey_authorize(client, path: str, method: str):
    if any(path.startswith(p) for p in _APIKEY_BLOCKED_PREFIXES):
        return False, "API key not permitted for this endpoint"
    return True, ""


async def _authz_middleware(request, call_next):
    path = request.url.path
    method = request.method.upper()
    # Only guard API routes; skip CORS preflight.
    if method == "OPTIONS" or not path.startswith("/api/"):
        return await call_next(request)
    if path in _PUBLIC_API_PATHS or any(path.startswith(p) for p in _PUBLIC_GET_PREFIXES):
        request.state.auth_scope = "public"
        return await call_next(request)
    # API-key authentication (integration clients) takes precedence when present.
    api_key = request.headers.get("x-api-key") or request.headers.get("X-API-Key")
    if api_key:
        client = await _client_from_api_key(api_key)
        if not client:
            return _envelope_error(request, 401, "Invalid or inactive API key")
        ok, reason = _apikey_authorize(client, path, method)
        if not ok:
            return _envelope_error(request, 403, reason)
        request.state.auth_scope = f"apikey:{client['id']}"
        # Fixed-window per-key rate limiting + usage counters (per-key override).
        now = datetime.now(timezone.utc)
        eff_limit = int(client.get("rate_limit") or APIKEY_RATE_LIMIT)
        eff_window = int(client.get("rate_window_seconds") or APIKEY_RATE_WINDOW_SECONDS)
        window_start = client.get("rate_window_start")
        reset = True
        if window_start:
            try:
                reset = (now - datetime.fromisoformat(window_start)).total_seconds() >= eff_window
            except Exception:
                reset = True
        new_start = now if reset else datetime.fromisoformat(window_start)
        new_count = 1 if reset else int(client.get("rate_count", 0)) + 1
        if new_count > eff_limit:
            retry = max(1, int(eff_window - (now - new_start).total_seconds()) + 1)
            return _envelope_error(
                request, 429,
                f"Rate limit exceeded ({eff_limit} requests / {eff_window}s). Retry in {retry}s.",
                extra_headers={"Retry-After": str(retry)},
            )
        await db.api_clients.update_one(
            {"id": client["id"]},
            {
                "$set": {
                    "last_used_at": now.isoformat(),
                    "rate_window_start": new_start.isoformat(),
                    "rate_count": new_count,
                },
                "$inc": {"request_count": 1},
            },
        )
        await db.api_usage_daily.update_one(
            {"client_id": client["id"], "date": now.strftime("%Y-%m-%d")},
            {"$inc": {"count": 1}},
            upsert=True,
        )
        return await call_next(request)
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    token = auth[7:].strip() if auth and auth.startswith("Bearer ") else None
    user = await _user_from_token(token)
    if not user:
        if path in _UNIFIED_ENVELOPE_PATHS:
            return _envelope_error(request, 401, "Not authenticated")
        return JSONResponse(_error_body(request, 401, "Not authenticated"), status_code=401)
    request.state.auth_scope = f"user:{user.get('id')}"
    # Mutations require admin, except self-service actions: a user changing their
    # OWN password, or managing their OWN login sessions ("My devices").
    if method in ("POST", "PUT", "DELETE", "PATCH"):
        m = _CHANGE_PW_RE.match(path)
        is_self_pw = bool(m and m.group(1) == user.get("id"))
        is_self_session = path.startswith("/api/account/sessions")
        if not is_self_pw and not is_self_session and not user.get("is_admin"):
            return JSONResponse(_error_body(request, 403, "Admin privileges required"), status_code=403)
    return await call_next(request)


# ---------------------------------------------------------------------------
# Idempotency (Guideline: Idempotency Implementation / Duplicate Prevention)
# POST requests carrying an `Idempotency-Key` are replayed from a stored response
# within the TTL window instead of re-executing the side effect. Opt-in: routes
# without the header behave exactly as before (fully backward compatible).
# ---------------------------------------------------------------------------
async def _idempotency_middleware(request, call_next):
    method = request.method.upper()
    path = request.url.path
    idem_key = request.headers.get("idempotency-key") or request.headers.get("Idempotency-Key")
    if method != "POST" or not idem_key or not path.startswith("/api/"):
        return await call_next(request)
    scope_id = getattr(request.state, "auth_scope", "anonymous")
    lookup = {"scope": scope_id, "key": idem_key, "path": path}
    rid = _request_id(request)
    try:
        existing = await db.idempotency_keys.find_one(lookup)
    except Exception:
        existing = None
    if existing and existing.get("status") == "completed":
        return JSONResponse(
            existing.get("response_body"),
            status_code=int(existing.get("response_status", 200)),
            headers={"Idempotent-Replay": "true", "X-Request-ID": rid},
        )
    response = await call_next(request)
    # Only cache successful (2xx) JSON responses; failures may be safely retried
    # and streamed/binary responses (e.g. file exports) are passed through as-is.
    resp_ctype = response.headers.get("content-type", "")
    if not (200 <= response.status_code < 300) or not resp_ctype.startswith("application/json"):
        return response
    body_bytes = b""
    async for chunk in response.body_iterator:
        body_bytes += chunk
    parsed = None
    if body_bytes:
        try:
            parsed = json.loads(body_bytes.decode("utf-8"))
        except Exception:
            parsed = None
    try:
        await db.idempotency_keys.update_one(
            lookup,
            {"$set": {
                **lookup,
                "status": "completed",
                "response_status": response.status_code,
                "response_body": parsed,
                "created_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        )
    except Exception as exc:  # pragma: no cover - non-fatal
        logger.warning("Idempotency store failed: %s", exc)
    new_headers = dict(response.headers)
    new_headers.pop("content-length", None)
    new_headers["Idempotent-Replay"] = "false"
    return Response(
        content=body_bytes,
        status_code=response.status_code,
        headers=new_headers,
        media_type=response.media_type,
    )


# ---------------------------------------------------------------------------
# Observability (Guidelines: Correlation ID, Request/Response Logging, Payload
# Integrity, API Versioning). Outermost middleware: assigns/propagates the
# request id, enforces the JSON payload cap, transparently maps the /api/v1
# versioned alias onto the canonical /api routes, and emits a structured
# access log with latency.
# ---------------------------------------------------------------------------
async def _observability_middleware(request, call_next):
    raw_path = request.scope.get("path", "")
    # Versioning alias: /api/v1/... is served by the canonical /api/... routes.
    if raw_path == "/api/v1" or raw_path == "/api/v1/":
        request.scope["path"] = "/api/"
        request.scope["raw_path"] = b"/api/"
    elif raw_path.startswith("/api/v1/"):
        mapped = "/api/" + raw_path[len("/api/v1/"):]
        request.scope["path"] = mapped
        request.scope["raw_path"] = mapped.encode()

    rid = (
        request.headers.get("x-request-id")
        or request.headers.get("X-Request-ID")
        or str(uuid.uuid4())
    )
    request.state.request_id = rid

    # Global JSON payload cap (uploads use multipart and are exempt here).
    content_length = request.headers.get("content-length")
    content_type = request.headers.get("content-type", "")
    if content_length and content_type.startswith("application/json"):
        try:
            if int(content_length) > MAX_REQUEST_BYTES:
                return JSONResponse(
                    _error_body(request, 413, f"Request body too large (max {MAX_REQUEST_BYTES} bytes)"),
                    status_code=413,
                    headers={"X-Request-ID": rid, "X-API-Version": API_VERSION},
                )
        except ValueError:
            pass

    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Request-ID"] = rid
    response.headers["X-API-Version"] = API_VERSION
    if raw_path.startswith("/api/"):
        logger.info(
            "access method=%s path=%s status=%s dur_ms=%.1f rid=%s scope=%s",
            request.method, raw_path, response.status_code, duration_ms, rid,
            getattr(request.state, "auth_scope", "anonymous"),
        )
    return response


# ---------------------------------------------------------------------------
# Exception handlers (Guideline: Error Code Standardization) — every error
# returns the consistent {detail, code, request_id} envelope; internals stay
# hidden and are logged with the correlation id.
# ---------------------------------------------------------------------------
@app.exception_handler(StarletteHTTPException)
async def _http_exception_handler(request, exc):
    return JSONResponse(
        _error_body(request, exc.status_code, exc.detail),
        status_code=exc.status_code,
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def _validation_exception_handler(request, exc):
    return JSONResponse(
        jsonable_encoder(_error_body(request, 422, exc.errors())),
        status_code=422,
    )


@app.exception_handler(Exception)
async def _unhandled_exception_handler(request, exc):
    logger.error("Unhandled error [rid=%s]: %s", _request_id(request), exc, exc_info=True)
    return JSONResponse(_error_body(request, 500, "Internal server error"), status_code=500)


# Include the router in the main app.
app.include_router(api_router)

# Middleware registration order matters: the LAST added is the OUTERMOST.
# Inbound flow: observability -> CORS -> authz -> idempotency -> route.
# (idempotency is inner so it runs after authz has set request.state.auth_scope
# and, critically, only after authentication has passed.)
app.add_middleware(BaseHTTPMiddleware, dispatch=_idempotency_middleware)
app.add_middleware(BaseHTTPMiddleware, dispatch=_authz_middleware)

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
    expose_headers=["X-Total-Count", "X-Request-ID", "X-API-Version", "Retry-After", "Idempotent-Replay"],
)

app.add_middleware(BaseHTTPMiddleware, dispatch=_observability_middleware)
