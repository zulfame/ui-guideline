"""Push notification domain (Firebase Cloud Messaging, HTTP v1 via Admin SDK).

Broadcast a notification to every active user that has an `fcm_token`.
Credentials are loaded from env and the feature fails gracefully (reports
`configured: false`) until a Firebase service account is provided:
  - FIREBASE_SERVICE_ACCOUNT_JSON : raw service-account JSON string, OR
  - FIREBASE_SERVICE_ACCOUNT_FILE : path to the service-account JSON file
Routes register on the shared `api_router` at import time.
"""
import json
import os
import threading
from datetime import datetime, timezone
from typing import Dict, Optional

import firebase_admin
from firebase_admin import credentials, exceptions as fb_exceptions, messaging
from fastapi import HTTPException
from pydantic import BaseModel, Field

from server import api_router, db, log_audit

_APP = None
_INIT_LOCK = threading.Lock()
_APP_NAME = "fcm-app"
_FCM_BATCH = 500


class BroadcastRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    body: str = Field(..., min_length=1, max_length=500)
    data: Optional[Dict[str, str]] = None


def _load_credentials():
    raw = (os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON") or "").strip()
    path = (os.environ.get("FIREBASE_SERVICE_ACCOUNT_FILE") or "").strip()
    if raw:
        try:
            return credentials.Certificate(json.loads(raw))
        except Exception:
            return None
    if path and os.path.exists(path):
        try:
            return credentials.Certificate(path)
        except Exception:
            return None
    return None


def _get_app():
    """Return the initialised Firebase app, or None when not configured."""
    global _APP
    if _APP is not None:
        return _APP
    with _INIT_LOCK:
        if _APP is not None:
            return _APP
        cred = _load_credentials()
        if cred is None:
            return None
        try:
            _APP = firebase_admin.initialize_app(cred, name=_APP_NAME)
        except ValueError:
            _APP = firebase_admin.get_app(_APP_NAME)
        return _APP


async def _recipients():
    """Active, non-deleted users that have a non-empty fcm_token."""
    q = {
        "deleted_at": None,
        "is_active": {"$ne": False},
        "fcm_token": {"$nin": [None, ""]},
    }
    return await db.users.find(q, {"_id": 0, "id": 1, "fcm_token": 1}).to_list(None)


@api_router.get("/notifications/config", tags=["Notifications"], summary="Push config + recipient count")
async def notifications_config():
    recipients = await _recipients()
    return {"configured": _get_app() is not None, "recipient_count": len(recipients)}


@api_router.post("/notifications/broadcast", tags=["Notifications"], summary="Broadcast push to all active users")
async def broadcast_notification(payload: BroadcastRequest):
    app = _get_app()
    if app is None:
        raise HTTPException(
            status_code=400,
            detail="Firebase Cloud Messaging is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON in backend/.env.",
        )

    recipients = await _recipients()
    if not recipients:
        return {"success": True, "total": 0, "sent": 0, "failed": 0, "invalid_removed": 0}

    token_to_user = {r["fcm_token"]: r["id"] for r in recipients if r.get("fcm_token")}
    tokens = list(token_to_user.keys())

    sent = 0
    failed = 0
    invalid_tokens = []
    data = {k: str(v) for k, v in (payload.data or {}).items()}

    for i in range(0, len(tokens), _FCM_BATCH):
        chunk = tokens[i:i + _FCM_BATCH]
        message = messaging.MulticastMessage(
            tokens=chunk,
            notification=messaging.Notification(title=payload.title, body=payload.body),
            data=data or None,
        )
        resp = messaging.send_each_for_multicast(message, app=app)
        for idx, res in enumerate(resp.responses):
            if res.success:
                sent += 1
            else:
                failed += 1
                exc = res.exception
                if isinstance(exc, (messaging.UnregisteredError, fb_exceptions.InvalidArgumentError)):
                    invalid_tokens.append(chunk[idx])

    invalid_removed = 0
    if invalid_tokens:
        now = datetime.now(timezone.utc).isoformat()
        for tok in invalid_tokens:
            uid = token_to_user.get(tok)
            if not uid:
                continue
            result = await db.users.update_one(
                {"id": uid, "fcm_token": tok},
                {"$set": {"fcm_token": None, "mobile_device.fcm_token": None, "updated_at": now}},
            )
            invalid_removed += result.modified_count

    await log_audit(
        "broadcast", "notification",
        summary=f"Push broadcast '{payload.title}' -> sent {sent}, failed {failed}, cleaned {invalid_removed}",
        method="POST", path="/api/notifications/broadcast", status_code=200,
        request={"title": payload.title},
        response={"sent": sent, "failed": failed},
        metadata={"total": len(tokens), "invalid_removed": invalid_removed},
    )
    return {
        "success": True,
        "total": len(tokens),
        "sent": sent,
        "failed": failed,
        "invalid_removed": invalid_removed,
    }
