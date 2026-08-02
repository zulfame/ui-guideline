"""Email Templates + self-service Password Reset feature router.

Extracted from server.py as part of the staged modularization (item 3).
Routes register on the shared `api_router` at import time; behavior is unchanged.
Shared foundation (db, helpers, config) is imported from `server`.
"""
import os
import re
import asyncio
import smtplib
import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import Depends, Query, Response, Request, HTTPException
from pydantic import BaseModel, Field

from server import (
    api_router,
    db,
    logger,
    log_audit,
    _require_admin,
    _serialize_branding,
    _get_branding_doc,
    _send_email_sync,
    _channel_or_404,
    _is_configured,
    _hash_password,
    _verify_password,
    _diff_changes,
    PASSWORD_HISTORY_LIMIT,
    PASSWORD_EXPIRY_DAYS,
)


# ---------------------------------------------------------------------------
# Reusable Email Templates + self-service Password Reset (email reset link).
# Templates are stored in `email_templates` (key-based) and rendered with a
# simple {{variable}} substitution. Emails are sent through the SMTP config
# saved in the Broadcast "email" channel.
# ---------------------------------------------------------------------------
PASSWORD_RESET_TOKEN_MINUTES = int(os.environ.get("PASSWORD_RESET_TOKEN_MINUTES") or "30")

_PW_RESET_BODY = (
    "<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;"
    "padding:24px;color:#111\">"
    "<h2 style=\"margin:0 0 16px;font-size:20px\">Reset your {{app_name}} password</h2>"
    "<p style=\"margin:0 0 12px;font-size:14px;line-height:1.6\">Hi {{user_name}},</p>"
    "<p style=\"margin:0 0 20px;font-size:14px;line-height:1.6\">We received a request to reset "
    "your password. Click the button below to choose a new one. This link expires in "
    "<strong>{{expiry_minutes}} minutes</strong>.</p>"
    "<p style=\"margin:0 0 24px\"><a href=\"{{reset_link}}\" style=\"background:#111;color:#fff;"
    "text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;display:inline-block\">"
    "Reset password</a></p>"
    "<p style=\"margin:0 0 8px;font-size:12px;color:#666;line-height:1.6\">If the button doesn't work, "
    "copy and paste this link into your browser:</p>"
    "<p style=\"margin:0 0 20px;font-size:12px;word-break:break-all\"><a href=\"{{reset_link}}\">{{reset_link}}</a></p>"
    "<p style=\"margin:0 0 20px;font-size:12px;color:#666;line-height:1.6\">If you didn't request this, "
    "you can safely ignore this email — your password won't change.</p>"
    "<hr style=\"border:none;border-top:1px solid #eee;margin:20px 0\"/>"
    "<p style=\"margin:0;font-size:11px;color:#999\">{{copyright_text}}</p>"
    "</div>"
)

_ACCOUNT_VERIFY_BODY = (
    "<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;"
    "padding:24px;color:#111\">"
    "<h2 style=\"margin:0 0 16px;font-size:20px\">Welcome to {{app_name}}, {{user_name}}!</h2>"
    "<p style=\"margin:0 0 12px;font-size:14px;line-height:1.6\">Your account has been created. "
    "You can now sign in and start using {{app_name}}.</p>"
    "<p style=\"margin:0 0 24px\"><a href=\"{{login_url}}\" style=\"background:#111;color:#fff;"
    "text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;display:inline-block\">"
    "Sign in</a></p>"
    "<p style=\"margin:0 0 8px;font-size:12px;color:#666;line-height:1.6\">If the button doesn't work, "
    "copy and paste this link into your browser:</p>"
    "<p style=\"margin:0 0 20px;font-size:12px;word-break:break-all\"><a href=\"{{login_url}}\">{{login_url}}</a></p>"
    "<p style=\"margin:0 0 20px;font-size:12px;color:#666;line-height:1.6\">Need help? Reach us at "
    "<a href=\"mailto:{{support_email}}\">{{support_email}}</a>.</p>"
    "<hr style=\"border:none;border-top:1px solid #eee;margin:20px 0\"/>"
    "<p style=\"margin:0;font-size:11px;color:#999\">{{copyright_text}}</p>"
    "</div>"
)

DEFAULT_EMAIL_TEMPLATES = {
    "password_reset": {
        "key": "password_reset",
        "name": "Password Reset",
        "description": "Sent when a user requests a password reset link on the sign-in page.",
        "subject": "Reset your {{app_name}} password",
        "body_html": _PW_RESET_BODY,
        "variables": [
            "app_name", "user_name", "reset_link",
            "expiry_minutes", "support_email", "copyright_text",
        ],
        "enabled": True,
    },
    "account_verification": {
        "key": "account_verification",
        "name": "Welcome / Account Verification",
        "description": "Welcome email for a newly created account (editable template).",
        "subject": "Welcome to {{app_name}}",
        "body_html": _ACCOUNT_VERIFY_BODY,
        "variables": [
            "app_name", "user_name", "login_url",
            "support_email", "copyright_text",
        ],
        "enabled": True,
    },
}
EMAIL_TEMPLATE_KEYS = tuple(DEFAULT_EMAIL_TEMPLATES.keys())


def _render_template_str(text: Optional[str], ctx: dict) -> str:
    out = text or ""
    for k, v in ctx.items():
        out = out.replace("{{" + k + "}}", "" if v is None else str(v))
    return out


def _html_to_text(html: str) -> str:
    text = re.sub(r"(?i)<br\s*/?>", "\n", html or "")
    text = re.sub(r"(?i)</p>", "\n\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


async def _get_email_template(key: str) -> dict:
    """Return the stored template merged over its built-in default."""
    base = dict(DEFAULT_EMAIL_TEMPLATES.get(key, {}))
    doc = await db.email_templates.find_one({"key": key}, {"_id": 0})
    if doc:
        base.update({k: v for k, v in doc.items() if v is not None})
    return base


async def _email_config_or_none() -> Optional[dict]:
    """Load the saved SMTP config from the Broadcast 'email' channel, if usable."""
    try:
        channel = _channel_or_404("email")
    except HTTPException:
        return None
    doc = await db.broadcast_configs.find_one({"key": "email"})
    config = (doc or {}).get("config")
    if not config or not _is_configured(channel, config):
        return None
    return config


def _public_base_url(request: Request) -> str:
    """Derive the public app origin from the incoming request (auto-detected —
    no manual Site URL needed). Prefers Origin, then Referer, then forwarded host."""
    origin = request.headers.get("origin")
    if origin:
        return origin.rstrip("/")
    ref = request.headers.get("referer")
    if ref:
        try:
            from urllib.parse import urlparse
            p = urlparse(ref)
            if p.scheme and p.netloc:
                return f"{p.scheme}://{p.netloc}"
        except Exception:
            pass
    proto = (request.headers.get("x-forwarded-proto") or request.url.scheme or "https").split(",")[0].strip()
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    if host:
        return f"{proto}://{host.split(',')[0].strip()}"
    return ""


def _sample_email_context(b: dict, base_url: str = "https://example.com") -> dict:
    return {
        "app_name": b.get("app_name") or "Application",
        "user_name": "Jane Doe",
        "reset_link": f"{base_url}/reset-password?token=SAMPLE_TOKEN",
        "login_url": f"{base_url}/login",
        "expiry_minutes": PASSWORD_RESET_TOKEN_MINUTES,
        "support_email": b.get("support_email") or "",
        "copyright_text": b.get("copyright_text") or "",
    }


class EmailTemplateUpdate(BaseModel):
    subject: Optional[str] = Field(None, min_length=1, max_length=300)
    body_html: Optional[str] = Field(None, min_length=1)
    enabled: Optional[bool] = None


class EmailTestRequest(BaseModel):
    to: str = Field(..., min_length=3)


@api_router.get("/email-templates", tags=["Email Templates"], summary="List email templates")
async def list_email_templates(current=Depends(_require_admin)):
    return [await _get_email_template(k) for k in EMAIL_TEMPLATE_KEYS]


@api_router.get("/email-templates/{key}", tags=["Email Templates"], summary="Get one email template")
async def get_email_template(key: str, current=Depends(_require_admin)):
    if key not in DEFAULT_EMAIL_TEMPLATES:
        raise HTTPException(status_code=404, detail="Unknown template")
    return await _get_email_template(key)


@api_router.put("/email-templates/{key}", tags=["Email Templates"], summary="Update an email template")
async def update_email_template(key: str, body: EmailTemplateUpdate):
    if key not in DEFAULT_EMAIL_TEMPLATES:
        raise HTTPException(status_code=404, detail="Unknown template")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    before = await _get_email_template(key)
    now = datetime.now(timezone.utc).isoformat()
    updates["key"] = key
    updates["updated_at"] = now
    await db.email_templates.update_one({"key": key}, {"$set": updates}, upsert=True)
    changes = _diff_changes(before, {k: v for k, v in updates.items() if k not in ("key", "updated_at")})
    await log_audit(
        "configure", "email_template", entity_id=key, entity_label=before.get("name") or key,
        summary=f"Updated email template '{before.get('name') or key}'",
        method="PUT", path=f"/api/email-templates/{key}", status_code=200, changes=changes,
    )
    return await _get_email_template(key)


@api_router.post("/email-templates/{key}/preview", tags=["Email Templates"], summary="Render a template preview")
async def preview_email_template(key: str, request: Request, current=Depends(_require_admin)):
    if key not in DEFAULT_EMAIL_TEMPLATES:
        raise HTTPException(status_code=404, detail="Unknown template")
    tpl = await _get_email_template(key)
    b = _serialize_branding(await _get_branding_doc())
    ctx = _sample_email_context(b, _public_base_url(request) or "https://example.com")
    return {
        "subject": _render_template_str(tpl.get("subject"), ctx),
        "html": _render_template_str(tpl.get("body_html"), ctx),
    }


@api_router.post("/email-templates/{key}/send-test", tags=["Email Templates"], summary="Send a rendered test email")
async def send_test_email_template(key: str, body: EmailTestRequest, request: Request):
    if key not in DEFAULT_EMAIL_TEMPLATES:
        raise HTTPException(status_code=404, detail="Unknown template")
    config = await _email_config_or_none()
    if not config:
        raise HTTPException(status_code=400, detail="Configure the Email (SMTP) channel in Broadcast first.")
    tpl = await _get_email_template(key)
    b = _serialize_branding(await _get_branding_doc())
    ctx = _sample_email_context(b, _public_base_url(request) or "https://example.com")
    subject = _render_template_str(tpl.get("subject"), ctx)
    html = _render_template_str(tpl.get("body_html"), ctx)
    to = body.to.strip()
    try:
        await asyncio.to_thread(_send_email_sync, config, to, subject, _html_to_text(html), html)
        ok, msg = True, f"Test email sent to {to}."
    except smtplib.SMTPAuthenticationError:
        ok, msg = False, "SMTP authentication failed."
    except Exception as exc:
        ok, msg = False, f"Send failed: {exc}"
    await log_audit(
        "send_test", "email_template", entity_id=key, entity_label=tpl.get("name") or key,
        summary=f"Sent test email for '{tpl.get('name') or key}' — {'success' if ok else 'failed'}",
        method="POST", path=f"/api/email-templates/{key}/send-test", status_code=200 if ok else 400,
        metadata={"ok": ok, "to": to, "message": msg},
    )
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"ok": True, "message": msg}


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class ForgotPasswordRequest(BaseModel):
    email: str


class PasswordResetConfirm(BaseModel):
    token: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=6, max_length=128)


@api_router.post("/auth/forgot-password", tags=["Auth"], summary="Request a password reset link by email")
async def forgot_password(payload: ForgotPasswordRequest, request: Request):
    """Send a single-use reset link to the account email. Always returns a generic
    success (no account enumeration). The link expires after PASSWORD_RESET_TOKEN_MINUTES."""
    generic = {
        "success": True,
        "message": "If an account exists for that email, a reset link has been sent.",
    }
    email = (payload.email or "").strip().lower()
    if not email:
        return generic
    user = await db.users.find_one({"email": email, "deleted_at": None})
    if not user:
        await log_audit(
            "password_reset_requested", "auth", entity_label=email,
            summary=f"Password reset requested for unknown email {email}",
            method="POST", path="/api/auth/forgot-password", status_code=200, actor=email,
            metadata={"account_found": False},
        )
        return generic

    now = datetime.now(timezone.utc)
    # Light anti-spam: skip if an unused token was just issued (< 60s ago).
    recent = await db.password_resets.find_one({
        "user_id": user["id"], "used": False, "created_at": {"$gt": now - timedelta(seconds=60)},
    })
    config = await _email_config_or_none()
    sent = False
    if not recent:
        raw = secrets.token_urlsafe(32)
        await db.password_resets.insert_one({
            "_id": _hash_token(raw),
            "user_id": user["id"],
            "email": email,
            "used": False,
            "created_at": now,
            "expires_at": now + timedelta(minutes=PASSWORD_RESET_TOKEN_MINUTES),
        })
        base = _public_base_url(request)
        link = f"{base}/reset-password?token={raw}" if base else f"/reset-password?token={raw}"
        b = _serialize_branding(await _get_branding_doc())
        ctx = {
            "app_name": b.get("app_name") or "Application",
            "user_name": user.get("name") or email,
            "reset_link": link,
            "expiry_minutes": PASSWORD_RESET_TOKEN_MINUTES,
            "support_email": b.get("support_email") or "",
            "copyright_text": b.get("copyright_text") or "",
        }
        if config:
            tpl = await _get_email_template("password_reset")
            subject = _render_template_str(tpl.get("subject"), ctx)
            html = _render_template_str(tpl.get("body_html"), ctx)
            try:
                await asyncio.to_thread(_send_email_sync, config, email, subject, _html_to_text(html), html)
                sent = True
            except Exception as exc:  # pragma: no cover - depends on SMTP reachability
                logger.error("Password reset email failed for %s: %s", email, exc)
        await db.password_resets.update_one(
            {"_id": _hash_token(raw)},
            {"$set": {"email_sent": sent, "smtp_configured": bool(config)}},
        )
    await log_audit(
        "password_reset_requested", "auth", entity_id=user["id"], entity_label=email,
        summary=f"Password reset requested for {email} (email_sent={sent})",
        method="POST", path="/api/auth/forgot-password", status_code=200, actor=email,
        metadata={"account_found": True, "email_sent": sent, "smtp_configured": bool(config)},
    )
    return generic


@api_router.post("/auth/reset-password", tags=["Auth"], summary="Set a new password using a reset token")
async def reset_password_with_token(payload: PasswordResetConfirm):
    """Consume a valid, unexpired reset token and set the new password."""
    rec = await db.password_resets.find_one({"_id": _hash_token(payload.token)})
    now = datetime.now(timezone.utc)
    invalid = HTTPException(status_code=400, detail="This reset link is invalid or has expired. Please request a new one.")
    if not rec or rec.get("used"):
        raise invalid
    exp = rec.get("expires_at")
    if isinstance(exp, str):
        try:
            exp = datetime.fromisoformat(exp)
        except Exception:
            exp = None
    if exp is not None and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if not exp or exp < now:
        raise invalid
    user = await db.users.find_one({"id": rec["user_id"], "deleted_at": None}, {"_id": 0})
    if not user:
        raise invalid
    # Enforce reuse policy (same as change-password).
    history = user.get("password_history") or []
    recent = history if user.get("password") in history else [user.get("password"), *history]
    recent = [h for h in recent if h]
    for h in recent[:PASSWORD_HISTORY_LIMIT]:
        if _verify_password(payload.new_password, h):
            raise HTTPException(
                status_code=400,
                detail=f"New password must differ from the last {PASSWORD_HISTORY_LIMIT} passwords",
            )
    new_hash = _hash_password(payload.new_password)
    new_history = [new_hash, *recent][:PASSWORD_HISTORY_LIMIT]
    now_iso = now.isoformat()
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "password": new_hash,
            "password_history": new_history,
            "password_changed_at": now_iso,
            "password_expires_at": (now + timedelta(days=PASSWORD_EXPIRY_DAYS)).isoformat(),
            "must_change_password": False,
            "updated_at": now_iso,
        }},
    )
    await db.password_resets.update_one({"_id": rec["_id"]}, {"$set": {"used": True, "used_at": now_iso}})
    await log_audit(
        "password_reset", "user", entity_id=user["id"],
        entity_label=f"{user.get('name')} <{user.get('email')}>",
        summary=f"Password reset via email link for {user.get('email')}",
        method="POST", path="/api/auth/reset-password", status_code=200,
        actor=user.get("email") or user["id"], request={"new_password": "«redacted»"},
    )
    return {"success": True}


@api_router.get("/password-resets", tags=["Auth"], summary="Recent password reset requests (admin audit)")
async def list_password_reset_requests(
    response: Response,
    limit: int = Query(50, ge=1, le=200),
    current=Depends(_require_admin),
):
    """Admin audit panel: recent password-reset requests with email, time, and
    whether the email was sent / the reset was completed. Sourced from the durable
    audit log (token records themselves auto-expire)."""
    requests = (
        await db.audit_logs.find(
            {"action": "password_reset_requested"}, {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
    )
    completions = (
        await db.audit_logs.find(
            {"action": "password_reset"}, {"_id": 0, "entity_id": 1, "created_at": 1}
        ).sort("created_at", -1).limit(max(limit * 2, 100)).to_list(max(limit * 2, 100))
    )
    completed_at_by_user: dict = {}
    for c in completions:
        uid = c.get("entity_id")
        if uid and uid not in completed_at_by_user:
            completed_at_by_user[uid] = c.get("created_at")
    rows = []
    for r in requests:
        md = r.get("metadata") or {}
        uid = r.get("entity_id")
        req_at = r.get("created_at")
        comp_at = completed_at_by_user.get(uid)
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



@api_router.delete("/password-resets/{entry_id}", tags=["Auth"], summary="Delete a password reset request record")
async def delete_password_reset(entry_id: str, current=Depends(_require_admin)):
    res = await db.audit_logs.delete_one({"id": entry_id, "action": "password_reset_requested"})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Record not found.")
    return {"success": True}


@api_router.post("/password-resets/clear", tags=["Auth"], summary="Clear all password reset request records")
async def clear_password_resets(current=Depends(_require_admin)):
    res = await db.audit_logs.delete_many(
        {"action": {"$in": ["password_reset_requested", "password_reset"]}}
    )
    return {"success": True, "deleted": res.deleted_count}
