"""Database backup extensions: S3 config, scheduled backups, retention, delete.

Routes register on the shared `api_router` at import time (same pattern as
`routes_email_auth`). Backup creation reuses server helpers so behavior stays
consistent with the manual endpoint.
"""
import asyncio
import io
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import boto3
from botocore.config import Config as BotoConfig
from bson import ObjectId
from fastapi import Depends, HTTPException
from pydantic import BaseModel, Field

from server import (
    api_router,
    db,
    log_audit,
    logger,
    _require_admin,
    _dump_all_collections,
    _backup_bucket,
    BACKUP_BUCKET,
)

SETTINGS_KEY = "backup"
DEFAULT_RETENTION = 7
_SECRET_FIELDS = {"s3_secret_access_key"}
_SCHEDULE_INTERVALS = ("hourly", "daily", "weekly")

_DEFAULT_SETTINGS = {
    "key": SETTINGS_KEY,
    "retention_count": DEFAULT_RETENTION,
    "schedule_enabled": False,
    "schedule_interval": "daily",
    "schedule_time": "02:00",
    "schedule_weekday": 0,
    "s3_enabled": False,
    "s3_endpoint_url": "",
    "s3_region": "",
    "s3_bucket": "",
    "s3_access_key_id": "",
    "s3_secret_access_key": "",
    "s3_prefix": "",
    "last_run_at": None,
    "next_run_at": None,
    "last_status": None,
    "last_error": None,
}


# ---------------------------------------------------------------------------
# Settings storage
# ---------------------------------------------------------------------------
async def get_settings() -> dict:
    """Return the raw backup settings doc (includes secrets), seeded with defaults."""
    doc = await db.app_settings.find_one({"key": SETTINGS_KEY}, {"_id": 0})
    merged = dict(_DEFAULT_SETTINGS)
    if doc:
        merged.update(doc)
    return merged


def _public_settings(cfg: dict) -> dict:
    """Serialize settings for the client: write-only secrets are blanked with a
    `*_set` flag telling the UI a value is already stored."""
    out = {k: cfg.get(k) for k in _DEFAULT_SETTINGS if k not in _SECRET_FIELDS}
    for name in _SECRET_FIELDS:
        out[name] = ""
        out[f"{name}_set"] = bool(cfg.get(name))
    return out


class BackupSettingsUpdate(BaseModel):
    retention_count: Optional[int] = Field(None, ge=1, le=365)
    schedule_enabled: Optional[bool] = None
    schedule_interval: Optional[str] = None
    schedule_time: Optional[str] = None
    schedule_weekday: Optional[int] = Field(None, ge=0, le=6)
    s3_enabled: Optional[bool] = None
    s3_endpoint_url: Optional[str] = None
    s3_region: Optional[str] = None
    s3_bucket: Optional[str] = None
    s3_access_key_id: Optional[str] = None
    s3_secret_access_key: Optional[str] = None
    s3_prefix: Optional[str] = None


@api_router.get("/database/settings", tags=["Database"], summary="Get backup settings")
async def get_backup_settings(current=Depends(_require_admin)):
    return _public_settings(await get_settings())


@api_router.put("/database/settings", tags=["Database"], summary="Update backup settings")
async def update_backup_settings(payload: BackupSettingsUpdate, current=Depends(_require_admin)):
    cfg = await get_settings()
    updates = payload.model_dump(exclude_unset=True)
    if "schedule_interval" in updates and updates["schedule_interval"] not in _SCHEDULE_INTERVALS:
        raise HTTPException(status_code=400, detail=f"schedule_interval must be one of {_SCHEDULE_INTERVALS}")
    for name in _SECRET_FIELDS:
        if name in updates and (updates[name] is None or updates[name] == ""):
            updates.pop(name)  # keep the stored secret
    cfg.update(updates)
    # Recompute the next scheduled run whenever schedule fields change.
    if cfg.get("schedule_enabled"):
        cfg["next_run_at"] = _compute_next_run(cfg, datetime.now(timezone.utc)).isoformat()
    else:
        cfg["next_run_at"] = None
    await db.app_settings.update_one({"key": SETTINGS_KEY}, {"$set": cfg}, upsert=True)
    await log_audit(
        "configure", "database", entity_label="backup settings",
        summary="Updated backup settings (retention / schedule / S3)",
        method="PUT", path="/api/database/settings", status_code=200,
        request=_public_settings({**cfg, **{k: "" for k in _SECRET_FIELDS}}),
    )
    return _public_settings(cfg)


# ---------------------------------------------------------------------------
# S3 (boto3, AWS + S3-compatible via endpoint URL). boto3 is blocking → offload.
# ---------------------------------------------------------------------------
def _s3_configured(cfg: dict) -> bool:
    return bool(cfg.get("s3_bucket") and cfg.get("s3_access_key_id") and cfg.get("s3_secret_access_key"))


def _build_s3_client(cfg: dict):
    kwargs = {
        "aws_access_key_id": cfg.get("s3_access_key_id") or None,
        "aws_secret_access_key": cfg.get("s3_secret_access_key") or None,
        "region_name": cfg.get("s3_region") or None,
        "config": BotoConfig(signature_version="s3v4", retries={"max_attempts": 2}),
    }
    endpoint = (cfg.get("s3_endpoint_url") or "").strip()
    if endpoint:
        kwargs["endpoint_url"] = endpoint
    return boto3.client("s3", **kwargs)


def _s3_key(cfg: dict, filename: str) -> str:
    prefix = (cfg.get("s3_prefix") or "").strip().strip("/")
    return f"{prefix}/{filename}" if prefix else filename


def _sync_s3_test(cfg: dict) -> dict:
    client = _build_s3_client(cfg)
    prefix = (cfg.get("s3_prefix") or "").strip().strip("/")
    client.list_objects_v2(Bucket=cfg["s3_bucket"], Prefix=prefix, MaxKeys=1)
    return {"ok": True}


def _sync_s3_put(cfg: dict, key: str, data: bytes) -> None:
    client = _build_s3_client(cfg)
    client.put_object(Bucket=cfg["s3_bucket"], Key=key, Body=data, ContentType="application/json")


def _sync_s3_delete(cfg: dict, key: str) -> None:
    client = _build_s3_client(cfg)
    client.delete_object(Bucket=cfg["s3_bucket"], Key=key)


async def upload_backup_to_s3(cfg: dict, filename: str, data: bytes) -> Optional[str]:
    """Best-effort S3 upload; returns the object key on success, None otherwise."""
    if not (cfg.get("s3_enabled") and _s3_configured(cfg)):
        return None
    key = _s3_key(cfg, filename)
    try:
        await asyncio.to_thread(_sync_s3_put, cfg, key, data)
        return key
    except Exception as exc:  # pragma: no cover - network dependent
        logger.error("S3 backup upload failed (non-fatal): %s", exc)
        return None


class S3TestRequest(BaseModel):
    # Optional inline overrides so the user can test before saving.
    s3_endpoint_url: Optional[str] = None
    s3_region: Optional[str] = None
    s3_bucket: Optional[str] = None
    s3_access_key_id: Optional[str] = None
    s3_secret_access_key: Optional[str] = None
    s3_prefix: Optional[str] = None


@api_router.post("/database/s3/test", tags=["Database"], summary="Test the S3 connection")
async def test_s3(payload: S3TestRequest, current=Depends(_require_admin)):
    cfg = await get_settings()
    incoming = payload.model_dump(exclude_unset=True)
    for name in _SECRET_FIELDS:
        if name in incoming and (incoming[name] is None or incoming[name] == ""):
            incoming.pop(name)  # fall back to the stored secret
    cfg.update(incoming)
    if not _s3_configured(cfg):
        return {"ok": False, "error": "Missing bucket, access key or secret key."}
    try:
        await asyncio.to_thread(_sync_s3_test, cfg)
        return {"ok": True, "message": f"Connected to bucket '{cfg['s3_bucket']}'."}
    except Exception as exc:
        return {"ok": False, "error": str(exc)[:300]}


# ---------------------------------------------------------------------------
# Backup creation (shared by manual endpoint + scheduler) + retention
# ---------------------------------------------------------------------------
async def perform_backup(reason: str = "manual") -> dict:
    collections, counts = await _dump_all_collections()
    now = datetime.now(timezone.utc)
    total = sum(counts.values())
    payload = {
        "meta": {
            "created_at": now.isoformat(), "app": "UI Guidelines CMS", "version": "1.0.0",
            "collections": sorted(counts.keys()), "counts": counts, "total": total,
        },
        "collections": collections,
    }
    data = json.dumps(payload, default=str).encode("utf-8")
    filename = f"backup_{now.strftime('%Y%m%d_%H%M%S')}.json"
    bucket = _backup_bucket()
    grid_in = bucket.open_upload_stream(
        filename,
        metadata={"created_at": now.isoformat(), "counts": counts, "total": total, "reason": reason},
    )
    await grid_in.write(data)
    await grid_in.close()
    file_id = str(grid_in._id)

    cfg = await get_settings()
    s3_key = await upload_backup_to_s3(cfg, filename, data)
    if s3_key:
        await db[f"{BACKUP_BUCKET}.files"].update_one(
            {"_id": grid_in._id}, {"$set": {"metadata.s3_key": s3_key}}
        )
    retention = await enforce_retention(cfg)

    await log_audit(
        "backup", "database", entity_id=file_id, entity_label=filename,
        summary=f"Created database backup {filename} ({total} docs)"
                + (" [scheduled]" if reason == "scheduled" else "")
                + (" → S3" if s3_key else ""),
        method="POST", path="/api/database/backup", status_code=200,
        response={"id": file_id, "size": len(data)},
        metadata={"counts": counts, "reason": reason, "s3_key": s3_key, "pruned": retention},
    )
    return {
        "id": file_id, "filename": filename, "size": len(data),
        "created_at": now.isoformat(), "counts": counts, "total": total,
        "s3_key": s3_key, "reason": reason, "pruned": retention,
    }


async def enforce_retention(cfg: Optional[dict] = None) -> int:
    """Delete backups beyond the configured retention count (oldest first).
    Also removes their S3 objects when present. Returns the number pruned."""
    cfg = cfg or await get_settings()
    keep = int(cfg.get("retention_count") or DEFAULT_RETENTION)
    bucket = _backup_bucket()
    files = await bucket.find({}).sort("uploadDate", -1).to_list(length=10000)
    if len(files) <= keep:
        return 0
    stale = files[keep:]
    pruned = 0
    for f in stale:
        meta = f.get("metadata") or {}
        s3_key = meta.get("s3_key")
        if s3_key and cfg.get("s3_enabled") and _s3_configured(cfg):
            try:
                await asyncio.to_thread(_sync_s3_delete, cfg, s3_key)
            except Exception as exc:  # pragma: no cover
                logger.error("S3 retention delete failed (non-fatal): %s", exc)
        try:
            await bucket.delete(f["_id"])
            pruned += 1
        except Exception as exc:  # pragma: no cover
            logger.error("Retention delete failed for %s: %s", f.get("filename"), exc)
    if pruned:
        logger.info("Backup retention pruned %d old backup(s) (keep=%d).", pruned, keep)
    return pruned


@api_router.delete("/database/backups/{file_id}", tags=["Database"], summary="Delete a backup")
async def delete_backup(file_id: str, current=Depends(_require_admin)):
    bucket = _backup_bucket()
    try:
        oid = ObjectId(file_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Backup not found")
    fdoc = await db[f"{BACKUP_BUCKET}.files"].find_one({"_id": oid})
    if not fdoc:
        raise HTTPException(status_code=404, detail="Backup not found")
    meta = fdoc.get("metadata") or {}
    s3_key = meta.get("s3_key")
    cfg = await get_settings()
    if s3_key and cfg.get("s3_enabled") and _s3_configured(cfg):
        try:
            await asyncio.to_thread(_sync_s3_delete, cfg, s3_key)
        except Exception as exc:  # pragma: no cover
            logger.error("S3 delete failed (non-fatal): %s", exc)
    await bucket.delete(oid)
    await log_audit(
        "delete", "database", entity_id=file_id, entity_label=fdoc.get("filename"),
        summary=f"Deleted backup {fdoc.get('filename')}" + (" (incl. S3)" if s3_key else ""),
        method="DELETE", path=f"/api/database/backups/{file_id}", status_code=200,
        response={"success": True}, metadata={"s3_key": s3_key},
    )
    return {"success": True}


# ---------------------------------------------------------------------------
# Scheduler (lightweight asyncio loop; times are interpreted as UTC)
# ---------------------------------------------------------------------------
_scheduler_task: Optional[asyncio.Task] = None


def _compute_next_run(cfg: dict, from_dt: datetime) -> datetime:
    interval = cfg.get("schedule_interval") or "daily"
    try:
        hh, mm = [int(x) for x in (cfg.get("schedule_time") or "02:00").split(":")[:2]]
    except Exception:
        hh, mm = 2, 0
    if interval == "hourly":
        nxt = from_dt.replace(minute=mm, second=0, microsecond=0)
        if nxt <= from_dt:
            nxt += timedelta(hours=1)
        return nxt
    if interval == "weekly":
        target_wd = int(cfg.get("schedule_weekday") or 0)
        nxt = from_dt.replace(hour=hh, minute=mm, second=0, microsecond=0)
        days_ahead = (target_wd - nxt.weekday()) % 7
        nxt += timedelta(days=days_ahead)
        if nxt <= from_dt:
            nxt += timedelta(days=7)
        return nxt
    # daily (default)
    nxt = from_dt.replace(hour=hh, minute=mm, second=0, microsecond=0)
    if nxt <= from_dt:
        nxt += timedelta(days=1)
    return nxt


async def _scheduler_loop():
    logger.info("Backup scheduler started.")
    while True:
        try:
            await asyncio.sleep(60)
            cfg = await get_settings()
            if not cfg.get("schedule_enabled"):
                continue
            now = datetime.now(timezone.utc)
            next_run = cfg.get("next_run_at")
            if not next_run:
                await db.app_settings.update_one(
                    {"key": SETTINGS_KEY},
                    {"$set": {"next_run_at": _compute_next_run(cfg, now).isoformat()}},
                    upsert=True,
                )
                continue
            if now < datetime.fromisoformat(next_run):
                continue
            try:
                await perform_backup(reason="scheduled")
                status, err = "ok", None
            except Exception as exc:  # pragma: no cover
                status, err = "error", str(exc)[:300]
                logger.error("Scheduled backup failed: %s", exc)
            await db.app_settings.update_one(
                {"key": SETTINGS_KEY},
                {"$set": {
                    "last_run_at": now.isoformat(),
                    "last_status": status,
                    "last_error": err,
                    "next_run_at": _compute_next_run(cfg, now).isoformat(),
                }},
                upsert=True,
            )
        except asyncio.CancelledError:  # pragma: no cover
            logger.info("Backup scheduler stopped.")
            raise
        except Exception as exc:  # pragma: no cover - keep the loop alive
            logger.error("Scheduler loop error (non-fatal): %s", exc)


def start_scheduler():
    global _scheduler_task
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_task = asyncio.create_task(_scheduler_loop())


def stop_scheduler():
    global _scheduler_task
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
