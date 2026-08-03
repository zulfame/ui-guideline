"""Active Sessions domain — admin visibility + remote revocation of user login
sessions.

Leverages the token `jti` + `sessions` collection maintained in server.py:
login records a session, logout / admin-revoke flip `revoked`, and every request
checks the session state via `_is_token_revoked`. Extracted as its own router
(registers on the shared `api_router` at import time).
"""
from datetime import datetime, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Query, Request, Response

from server import (
    api_router,
    db,
    log_audit,
    _require_admin,
    JWT_SECRET,
    JWT_ALGORITHM,
)


def _iso(v):
    return v.isoformat() if isinstance(v, datetime) else v


def _current_jti(request: Request) -> Optional[str]:
    """The jti of the token making THIS request (to flag the admin's own session)."""
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    token = auth[7:].strip() if auth and auth.startswith("Bearer ") else None
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        return None
    return payload.get("jti")


@api_router.get("/sessions", tags=["Sessions"], summary="List login sessions (admin)")
async def list_sessions(
    request: Request,
    response: Response,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    user_id: Optional[str] = Query(None),
    include_revoked: bool = Query(False),
    current=Depends(_require_admin),
):
    """Active login sessions across all users. By default hides revoked/expired
    sessions; pass `include_revoked=true` to see the full history."""
    now = datetime.now(timezone.utc)
    q: dict = {}
    if user_id:
        q["user_id"] = user_id
    if not include_revoked:
        q["revoked"] = {"$ne": True}
        q["expires_at"] = {"$gt": now}
    total = await db.sessions.count_documents(q)
    docs = (
        await db.sessions.find(q).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    )
    uids = list({d.get("user_id") for d in docs if d.get("user_id")})
    users: dict = {}
    if uids:
        async for u in db.users.find(
            {"id": {"$in": uids}},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "username": 1, "is_admin": 1},
        ):
            users[u["id"]] = u
    cur_jti = _current_jti(request)
    rows = []
    for d in docs:
        u = users.get(d.get("user_id")) or {}
        exp = d.get("expires_at")
        if isinstance(exp, datetime) and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        is_expired = bool(isinstance(exp, datetime) and exp <= now)
        rows.append({
            "id": d["_id"],
            "user_id": d.get("user_id"),
            "user_name": u.get("name"),
            "user_email": u.get("email"),
            "username": u.get("username"),
            "is_admin": bool(u.get("is_admin")),
            "token_type": d.get("token_type") or "web",
            "label": d.get("label"),
            "ip": d.get("ip"),
            "user_agent": d.get("user_agent"),
            "created_at": _iso(d.get("created_at")),
            "expires_at": _iso(exp),
            "revoked": bool(d.get("revoked")),
            "revoked_at": _iso(d.get("revoked_at")),
            "is_current": d["_id"] == cur_jti,
            "is_expired": is_expired,
        })
    response.headers["X-Total-Count"] = str(total)
    return rows


@api_router.post("/sessions/{jti}/revoke", tags=["Sessions"], summary="Revoke a single session (admin)")
async def revoke_session(jti: str, current=Depends(_require_admin)):
    doc = await db.sessions.find_one({"_id": jti})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found.")
    await db.sessions.update_one(
        {"_id": jti},
        {"$set": {"revoked": True, "revoked_at": datetime.now(timezone.utc)}},
    )
    u = await db.users.find_one({"id": doc.get("user_id")}, {"_id": 0, "email": 1})
    label = (u or {}).get("email") or doc.get("user_id")
    await log_audit(
        "revoke_session", "session", entity_id=jti, entity_label=label,
        summary=f"Revoked a login session for {label}", method="POST",
        path=f"/api/sessions/{jti}/revoke", status_code=200, actor=current.get("email"),
    )
    return {"success": True}


@api_router.post("/sessions/revoke-user/{user_id}", tags=["Sessions"], summary="Revoke all active sessions for a user (admin force-logout)")
async def revoke_user_sessions(user_id: str, current=Depends(_require_admin)):
    now = datetime.now(timezone.utc)
    res = await db.sessions.update_many(
        {"user_id": user_id, "revoked": {"$ne": True}, "expires_at": {"$gt": now}},
        {"$set": {"revoked": True, "revoked_at": now}},
    )
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "email": 1})
    label = (u or {}).get("email") or user_id
    await log_audit(
        "revoke_session", "session", entity_id=user_id, entity_label=label,
        summary=f"Force-logout: revoked {res.modified_count} session(s) for {label}",
        method="POST", path=f"/api/sessions/revoke-user/{user_id}", status_code=200,
        actor=current.get("email"), metadata={"revoked": res.modified_count},
    )
    return {"success": True, "revoked": res.modified_count}
