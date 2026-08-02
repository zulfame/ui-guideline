"""API Clients domain — admin-managed API credentials with per-key rate limits.

Extracted from server.py (behavior unchanged). Routes register on the shared
`api_router` at import time. The API-key authorization/rate-limit helpers used by
the request middleware remain in server.py.
"""
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Query
from pydantic import BaseModel, Field

from server import api_router, db, log_audit, _require_admin


class ClientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    rate_limit: Optional[int] = Field(None, ge=1, le=100000)
    rate_window_seconds: Optional[int] = Field(None, ge=1, le=86400)


class ClientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    active: Optional[bool] = None
    rate_limit: Optional[int] = Field(None, ge=1, le=100000)
    rate_window_seconds: Optional[int] = Field(None, ge=1, le=86400)


def _generate_api_key():
    key = f"ak_{secrets.token_hex(24)}"
    key_hash = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return key, key_hash, key[:10], key[-4:]


def _client_public(doc):
    return {
        "id": doc["id"],
        "name": doc.get("name"),
        "active": bool(doc.get("active", True)),
        "key_prefix": doc.get("key_prefix"),
        "key_last4": doc.get("key_last4"),
        "key_masked": f"{doc.get('key_prefix', '')}…{doc.get('key_last4', '')}",
        "last_used_at": doc.get("last_used_at"),
        "request_count": int(doc.get("request_count", 0)),
        "rate_limit": doc.get("rate_limit"),
        "rate_window_seconds": doc.get("rate_window_seconds"),
        "created_at": doc.get("created_at"),
        "created_by": doc.get("created_by"),
        "revoked_at": doc.get("revoked_at"),
    }


@api_router.get("/clients", tags=["Clients"], summary="List API clients")
async def list_clients(current=Depends(_require_admin)):
    docs = await db.api_clients.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [_client_public(d) for d in docs]


@api_router.post("/clients", tags=["Clients"], status_code=201, summary="Create an API client (returns the key once)")
async def create_client(payload: ClientCreate, current=Depends(_require_admin)):
    key, key_hash, prefix, last4 = _generate_api_key()
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "name": payload.name.strip(),
        "active": True,
        "rate_limit": payload.rate_limit,
        "rate_window_seconds": payload.rate_window_seconds,
        "key_hash": key_hash,
        "key_prefix": prefix,
        "key_last4": last4,
        "last_used_at": None,
        "request_count": 0,
        "created_at": now,
        "created_by": current.get("email"),
        "revoked_at": None,
    }
    await db.api_clients.insert_one(dict(doc))
    await log_audit(
        "create", "api_client", entity_id=doc["id"], entity_label=doc["name"],
        summary=f"Created API client {doc['name']}", method="POST", path="/api/clients",
        status_code=201, actor=current.get("email"),
    )
    pub = _client_public(doc)
    pub["api_key"] = key  # plaintext shown only once
    return pub


@api_router.put("/clients/{client_id}", tags=["Clients"], summary="Update an API client")
async def update_client(client_id: str, payload: ClientUpdate, current=Depends(_require_admin)):
    doc = await db.api_clients.find_one({"id": client_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Client not found.")
    data = payload.model_dump(exclude_unset=True)
    update = {}
    if data.get("name") is not None:
        update["name"] = data["name"].strip()
    if data.get("active") is not None:
        update["active"] = bool(data["active"])
    if "rate_limit" in data:
        update["rate_limit"] = data["rate_limit"]
    if "rate_window_seconds" in data:
        update["rate_window_seconds"] = data["rate_window_seconds"]
    if update:
        await db.api_clients.update_one({"id": client_id}, {"$set": update})
        await log_audit(
            "update", "api_client", entity_id=client_id,
            entity_label=update.get("name", doc.get("name")),
            summary=f"Updated API client {doc.get('name')}", method="PUT",
            path=f"/api/clients/{client_id}", status_code=200, actor=current.get("email"),
        )
    fresh = await db.api_clients.find_one({"id": client_id}, {"_id": 0})
    return _client_public(fresh)


@api_router.post("/clients/{client_id}/revoke", tags=["Clients"], summary="Revoke an API client")
async def revoke_client(client_id: str, current=Depends(_require_admin)):
    doc = await db.api_clients.find_one({"id": client_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Client not found.")
    await db.api_clients.update_one(
        {"id": client_id},
        {"$set": {"active": False, "revoked_at": datetime.now(timezone.utc).isoformat()}},
    )
    await log_audit(
        "revoke", "api_client", entity_id=client_id, entity_label=doc.get("name"),
        summary=f"Revoked API client {doc.get('name')}", method="POST",
        path=f"/api/clients/{client_id}/revoke", status_code=200, actor=current.get("email"),
    )
    fresh = await db.api_clients.find_one({"id": client_id}, {"_id": 0})
    return _client_public(fresh)


@api_router.post("/clients/{client_id}/regenerate", tags=["Clients"], summary="Regenerate an API client key (returns the new key once)")
async def regenerate_client(client_id: str, current=Depends(_require_admin)):
    doc = await db.api_clients.find_one({"id": client_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Client not found.")
    key, key_hash, prefix, last4 = _generate_api_key()
    await db.api_clients.update_one(
        {"id": client_id},
        {"$set": {"key_hash": key_hash, "key_prefix": prefix, "key_last4": last4,
                  "active": True, "revoked_at": None}},
    )
    await log_audit(
        "regenerate", "api_client", entity_id=client_id, entity_label=doc.get("name"),
        summary=f"Regenerated key for API client {doc.get('name')}", method="POST",
        path=f"/api/clients/{client_id}/regenerate", status_code=200, actor=current.get("email"),
    )
    fresh = await db.api_clients.find_one({"id": client_id}, {"_id": 0})
    pub = _client_public(fresh)
    pub["api_key"] = key
    return pub


@api_router.delete("/clients/{client_id}", tags=["Clients"], summary="Delete an API client")
async def delete_client(client_id: str, current=Depends(_require_admin)):
    doc = await db.api_clients.find_one({"id": client_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Client not found.")
    await db.api_clients.delete_one({"id": client_id})
    await db.api_usage_daily.delete_many({"client_id": client_id})
    await log_audit(
        "delete", "api_client", entity_id=client_id, entity_label=doc.get("name"),
        summary=f"Deleted API client {doc.get('name')}", method="DELETE",
        path=f"/api/clients/{client_id}", status_code=200, actor=current.get("email"),
    )
    return {"success": True}


@api_router.get("/clients/{client_id}/usage", tags=["Clients"], summary="Daily request counts for an API client")
async def client_usage(client_id: str, days: int = Query(14, ge=1, le=90), current=Depends(_require_admin)):
    doc = await db.api_clients.find_one({"id": client_id}, {"_id": 0, "name": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Client not found.")
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days - 1)
    rows = await db.api_usage_daily.find(
        {"client_id": client_id, "date": {"$gte": start.strftime("%Y-%m-%d")}}
    ).to_list(1000)
    counts = {r["date"]: int(r.get("count", 0)) for r in rows}
    series = []
    for i in range(days):
        d = (start + timedelta(days=i)).strftime("%Y-%m-%d")
        series.append({"date": d, "count": counts.get(d, 0)})
    return {"client_id": client_id, "name": doc.get("name"), "days": days, "series": series,
            "total": sum(s["count"] for s in series)}
