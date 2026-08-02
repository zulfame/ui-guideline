"""Mobile JWT auth domain (Flutter app parity).

Mirrors the legacy Laravel/tymon mobile contract:
  POST /api/jwt-auth     -> login (single-device binding)
  GET  /api/jwt-me       -> current user profile
  POST /api/jwt-refresh  -> issue a fresh access token
  POST /api/jwt-logout   -> unbind device / end session

Responses use the mobile envelope {"success": bool, "data"|"message": ...}.
Credential (`username`) may be an email, username, or phone.
Routes register on the shared `api_router` at import time.
"""
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

import jwt
from fastapi import Header, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from server import (
    api_router, db, JWT_SECRET, JWT_ALGORITHM, _verify_password, log_audit,
    _client_ip, _login_locked_until, _record_login_failure, _clear_login_attempts,
)

MOBILE_TOKEN_TTL = int(os.environ.get("MOBILE_JWT_EXPIRY_SECONDS") or "3600")
MOBILE_REFRESH_DAYS = int(os.environ.get("MOBILE_JWT_REFRESH_DAYS") or "30")


class MobileLoginRequest(BaseModel):
    username: str = ""
    password: str = ""
    device_identifier: Optional[str] = None
    device_name: Optional[str] = None
    device_os: Optional[str] = None
    fmc_token: Optional[str] = None  # legacy typo for fcm_token, kept for parity


def _ok(data: dict, status: int = 200):
    return JSONResponse({"success": True, "data": data}, status_code=status)


def _fail(message: str, status: int):
    return JSONResponse({"success": False, "message": message}, status_code=status)


def _create_mobile_token(user_id: str, jti: str, device_identifier: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "type": "mobile",
        "jti": jti,
        "did": device_identifier or "",
        "iat": now,
        "exp": now + timedelta(seconds=MOBILE_TOKEN_TTL),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _bearer(authorization: Optional[str]) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        return authorization[7:].strip()
    return None


def _decode_mobile(token: Optional[str], verify_exp: bool = True):
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, JWT_SECRET, algorithms=[JWT_ALGORITHM],
            options={"verify_exp": verify_exp},
        )
    except jwt.InvalidTokenError:
        return None
    if payload.get("type") != "mobile":
        return None
    return payload


async def _user_for_token(payload: dict):
    """Return the user IF the token's jti still matches the bound device."""
    if not payload:
        return None
    doc = await db.users.find_one({"id": payload.get("sub"), "deleted_at": None})
    if not doc:
        return None
    bound = doc.get("mobile_device") or {}
    if not bound.get("jti") or bound.get("jti") != payload.get("jti"):
        return None
    return doc


async def _profile_payload(doc: dict) -> dict:
    office_doc = None
    if doc.get("office_id"):
        office_doc = await db.offices.find_one({"id": doc["office_id"]}, {"_id": 0})
    role_name = None
    if doc.get("role_id"):
        r = await db.roles.find_one({"id": doc["role_id"]}, {"_id": 0, "name": 1})
        role_name = r["name"] if r else None
    bound = doc.get("mobile_device") or {}
    office_block = None
    if office_doc:
        office_block = {
            "code": office_doc.get("code"),
            "name": office_doc.get("name"),
            "address": office_doc.get("address"),
            "telephone": office_doc.get("telephone"),
            "longitude": office_doc.get("longitude"),
            "latitude": office_doc.get("latitude"),
            "radius": office_doc.get("radius"),
            "coa": office_doc.get("note"),
        }
    return {
        "user": {
            "id": doc.get("user_id"),
            "name": doc.get("name"),
            "username": doc.get("username"),
            "email": doc.get("email"),
            "role": role_name,
            "office": office_doc.get("name") if office_doc else None,
            "alias": doc.get("alias"),
            "mso_code": doc.get("mso_code"),
            "collector_code": doc.get("collector_code"),
            "is_active": doc.get("is_active", True),
        },
        "office": office_block,
        "device": {
            "device_identifier": bound.get("device_identifier") or doc.get("device_identifier"),
            "device_name": bound.get("device_name") or doc.get("device_name"),
            "device_os": bound.get("device_os") or doc.get("device_os"),
            "fmc_token": bound.get("fcm_token") or doc.get("fcm_token"),
        },
    }


@api_router.post("/jwt-auth", tags=["Mobile Auth"], summary="Mobile login (single-device binding)")
async def jwt_auth(payload: MobileLoginRequest, request: Request):
    ident = (payload.username or "").strip()
    if not ident or not payload.password:
        return _fail("Kredensial yang Anda masukkan tidak sesuai", 401)

    ident_lower = ident.lower()
    ip = _client_ip(request)
    key = f"mobile:{ip}:{ident_lower}"

    if await _login_locked_until(key):
        return _fail("Terlalu banyak percobaan gagal. Silakan coba lagi nanti.", 429)

    doc = await db.users.find_one({
        "deleted_at": None,
        "$or": [
            {"email": ident_lower}, {"email": ident},
            {"username": ident}, {"phone": ident},
        ],
    })
    if not doc or not _verify_password(payload.password, doc.get("password") or ""):
        await _record_login_failure(key, ident, ip)
        await log_audit(
            "login_failed", "auth", entity_label=ident,
            summary=f"Failed mobile login for {ident} from {ip}",
            method="POST", path="/api/jwt-auth", status_code=401, actor=ident,
        )
        return _fail("Kredensial yang Anda masukkan tidak sesuai", 401)

    if doc.get("is_active") is False:
        return _fail("Akun Anda tidak aktif.", 401)

    incoming_did = (payload.device_identifier or "").strip()
    bound = doc.get("mobile_device") or {}
    bound_did = (bound.get("device_identifier") or "").strip()
    if bound.get("jti") and bound_did and incoming_did and bound_did != incoming_did:
        await log_audit(
            "login_failed", "auth", entity_id=doc["id"], entity_label=doc.get("email"),
            summary=f"Mobile login blocked (bound to another device) for {doc.get('email')} from {ip}",
            method="POST", path="/api/jwt-auth", status_code=401, actor=doc.get("email"),
        )
        return _fail("Akun sudah terhubungan dengan perangkat lain", 401)

    await _clear_login_attempts(key)
    jti = uuid.uuid4().hex
    now = datetime.now(timezone.utc)
    device = {
        "device_identifier": incoming_did,
        "device_name": payload.device_name,
        "device_os": payload.device_os,
        "fcm_token": payload.fmc_token,
        "jti": jti,
        "bound_at": now.isoformat(),
    }
    await db.users.update_one(
        {"id": doc["id"]},
        {"$set": {
            "mobile_device": device,
            "device_identifier": incoming_did,
            "device_name": payload.device_name,
            "device_os": payload.device_os,
            "fcm_token": payload.fmc_token,
            "updated_at": now.isoformat(),
        }},
    )
    token = _create_mobile_token(doc["id"], jti, incoming_did)
    await log_audit(
        "login", "auth", entity_id=doc["id"], entity_label=doc.get("email"),
        summary=f"Mobile login {doc.get('email')} from {ip} ({device['device_name'] or incoming_did})",
        method="POST", path="/api/jwt-auth", status_code=200, actor=doc.get("email"),
    )
    return _ok({"token_type": "bearer", "expires_in": MOBILE_TOKEN_TTL, "access_token": token})


@api_router.get("/jwt-me", tags=["Mobile Auth"], summary="Mobile current user profile")
async def jwt_me(authorization: Optional[str] = Header(None)):
    payload = _decode_mobile(_bearer(authorization), verify_exp=True)
    if payload is None:
        return _fail("Token tidak valid atau kedaluwarsa.", 401)
    doc = await _user_for_token(payload)
    if not doc:
        return _fail("Sesi berakhir. Silakan masuk kembali.", 401)
    return _ok(await _profile_payload(doc))


@api_router.post("/jwt-refresh", tags=["Mobile Auth"], summary="Refresh mobile access token")
async def jwt_refresh(authorization: Optional[str] = Header(None)):
    # Allow refreshing an expired-but-valid token within the refresh window.
    payload = _decode_mobile(_bearer(authorization), verify_exp=False)
    if payload is None:
        return _fail("Token tidak valid.", 401)
    doc = await _user_for_token(payload)
    if not doc:
        return _fail("Sesi berakhir. Silakan masuk kembali.", 401)
    bound = doc.get("mobile_device") or {}
    try:
        bound_at = datetime.fromisoformat(bound.get("bound_at"))
    except Exception:
        bound_at = None
    if not bound_at or (datetime.now(timezone.utc) - bound_at) > timedelta(days=MOBILE_REFRESH_DAYS):
        return _fail("Sesi berakhir. Silakan masuk kembali.", 401)
    token = _create_mobile_token(doc["id"], bound["jti"], bound.get("device_identifier") or "")
    return _ok({"token_type": "bearer", "expires_in": MOBILE_TOKEN_TTL, "access_token": token})


@api_router.post("/jwt-logout", tags=["Mobile Auth"], summary="Mobile logout (unbind device)")
async def jwt_logout(authorization: Optional[str] = Header(None)):
    payload = _decode_mobile(_bearer(authorization), verify_exp=False)
    if payload is None:
        return _fail("Token tidak valid.", 401)
    doc = await db.users.find_one({"id": payload.get("sub"), "deleted_at": None})
    if doc:
        bound = doc.get("mobile_device") or {}
        if bound.get("jti") == payload.get("jti"):
            await db.users.update_one(
                {"id": doc["id"]},
                {"$unset": {"mobile_device": ""},
                 "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
            )
            await log_audit(
                "logout", "auth", entity_id=doc["id"], entity_label=doc.get("email"),
                summary=f"Mobile logout {doc.get('email')} (device unbound)",
                method="POST", path="/api/jwt-logout", status_code=200, actor=doc.get("email"),
            )
    return JSONResponse({"success": True, "message": "Berhasil keluar."}, status_code=200)
