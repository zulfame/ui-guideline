"""
Backend tests for the Forgot/Reset password self-service flow and the
Email Templates admin CRUD (with preview + send-test).

Covers:
- POST /api/auth/forgot-password : public, always generic 200 (no enumeration).
- POST /api/auth/reset-password : public, invalid/expired token -> 400 envelope.
- Happy-path reset: mint token in Mongo -> reset -> login with new pw; replay -> 400.
- Email templates CRUD (list/get/update/preview/send-test) admin-guarded.
- robots.txt / sitemap.xml still 200 without a Site URL field.
"""
import hashlib
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
import requests
from pymongo import MongoClient


def _base_url():
    b = os.environ.get("REACT_APP_BACKEND_URL")
    if not b:
        for line in Path("/app/frontend/.env").read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                b = line.split("=", 1)[1].strip()
                break
    return (b or "").rstrip("/")


BASE = _base_url()
API = f"{BASE}/api"


def _mongo():
    for line in Path("/app/backend/.env").read_text().splitlines():
        if line.startswith("MONGO_URL="):
            url = line.split("=", 1)[1].strip().strip('"')
        if line.startswith("DB_NAME="):
            db = line.split("=", 1)[1].strip().strip('"')
    return MongoClient(url)[db]


# --- Forgot password: public, generic success ---------------------------------
class TestForgotPassword:
    def test_forgot_password_unknown_email_generic_200(self):
        # No Authorization header - must be public
        r = requests.post(
            f"{API}/auth/forgot-password",
            json={"email": "does-not-exist-xyz@example.com"},
            headers={"Authorization": ""},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("success") is True

    def test_forgot_password_known_admin_email_generic_200(self):
        r = requests.post(
            f"{API}/auth/forgot-password",
            json={"email": "admin@example.com"},
            headers={"Authorization": ""},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json().get("success") is True


# --- Reset password invalid / expired ----------------------------------------
class TestResetPasswordInvalid:
    def test_reset_password_invalid_token_400(self):
        r = requests.post(
            f"{API}/auth/reset-password",
            json={"token": "totally-bogus-token", "new_password": "newpass123"},
            headers={"Authorization": ""},
            timeout=15,
        )
        assert r.status_code == 400, r.text
        body = r.json()
        # Standard error envelope {detail, code, request_id}
        assert "detail" in body
        assert "code" in body
        assert "request_id" in body


# --- Full happy path: mint -> reset -> replay -> login-with-new -------------
class TestResetHappyPath:
    def test_full_reset_flow(self):
        db = _mongo()
        # find any active user; prefer non-admin to avoid changing admin pw.
        # Use staff@bpr.co.id per test_credentials.md if present, else create user.
        user = db.users.find_one({"email": "staff@bpr.co.id", "deleted_at": None}) or \
               db.users.find_one({"is_admin": {"$ne": True}, "deleted_at": None,
                                  "email": {"$ne": "admin@example.com"}}) or \
               db.users.find_one({"deleted_at": None, "email": {"$ne": "admin@example.com"}})
        if not user:
            pytest.skip("no non-admin active user available; skipping happy-path reset test")
        user_id = user.get("id") or str(user.get("_id"))
        email = user["email"]

        raw = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw.encode()).hexdigest()
        now = datetime.now(timezone.utc)
        db.password_resets.delete_many({"user_id": user_id})
        db.password_resets.insert_one({
            "_id": token_hash,
            "user_id": user_id,
            "email": email,
            "used": False,
            "created_at": now,
            "expires_at": now + timedelta(minutes=30),
        })

        new_pw = f"NewPw!{int(time.time())}"
        r = requests.post(
            f"{API}/auth/reset-password",
            json={"token": raw, "new_password": new_pw},
            headers={"Authorization": ""},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json().get("success") is True

        # Replay same token -> 400
        r2 = requests.post(
            f"{API}/auth/reset-password",
            json={"token": raw, "new_password": new_pw},
            headers={"Authorization": ""},
            timeout=15,
        )
        assert r2.status_code == 400

        # Login with the new password
        r3 = requests.post(
            f"{API}/auth/login",
            json={"identifier": email, "password": new_pw},
            headers={"Authorization": ""},
            timeout=15,
        )
        assert r3.status_code == 200, r3.text
        assert "token" in r3.json()

        # Restore original for other tests (best-effort)
        r4 = requests.post(
            f"{API}/auth/login",
            json={"identifier": "admin@example.com", "password": "admin123"},
            headers={"Authorization": ""},
            timeout=15,
        )
        admin_tok = r4.json()["token"]
        requests.post(
            f"{API}/users/{user_id}/reset-password",
            headers={"Authorization": f"Bearer {admin_tok}"},
            timeout=15,
        )  # ignore result if endpoint differs


# --- Email templates CRUD (admin-guarded) ------------------------------------
class TestEmailTemplates:
    def test_list_requires_auth(self):
        r = requests.get(f"{API}/email-templates", headers={"Authorization": ""}, timeout=15)
        assert r.status_code == 401

    def test_list_as_admin_contains_password_reset(self):
        r = requests.get(f"{API}/email-templates", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        # accept list or {items:[]}
        items = data if isinstance(data, list) else data.get("items") or data.get("templates") or []
        keys = [i.get("key") or i.get("id") or i.get("name") for i in items]
        assert "password_reset" in keys, f"password_reset not in {keys}"

    def test_get_password_reset_template(self):
        r = requests.get(f"{API}/email-templates/password_reset", timeout=15)
        assert r.status_code == 200, r.text
        tpl = r.json()
        assert "subject" in tpl
        assert "body_html" in tpl

    def test_update_password_reset_template_persists(self):
        current = requests.get(f"{API}/email-templates/password_reset", timeout=15).json()
        new_subject = f"Reset Subject {int(time.time())}"
        payload = {
            "subject": new_subject,
            "body_html": current.get("body_html") or "<a href=\"{{reset_link}}\">reset</a>",
            "enabled": True,
        }
        r = requests.put(f"{API}/email-templates/password_reset", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        after = requests.get(f"{API}/email-templates/password_reset", timeout=15).json()
        assert after["subject"] == new_subject

    def test_preview_renders_variables(self):
        r = requests.post(f"{API}/email-templates/password_reset/preview", json={}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        html = body.get("html") or body.get("body_html") or ""
        assert "reset-password?token=" in html or "reset_link" in html or "token=" in html, html[:400]

    def test_send_test_smtp_behaves_gracefully(self):
        r = requests.post(
            f"{API}/email-templates/password_reset/send-test",
            json={"to": "someone@example.com"},
            timeout=20,
        )
        # SMTP may or may not be configured in preview env.
        # If not configured -> 400 with envelope; if configured -> 200 {ok:true}.
        assert r.status_code in (200, 400, 503), r.text
        body = r.json()
        if r.status_code == 200:
            assert body.get("ok") is True or body.get("success") is True
        else:
            assert "detail" in body


# --- Public robots.txt / sitemap.xml -----------------------------------------
class TestPublicSeo:
    def test_robots_txt_200(self):
        r = requests.get(f"{API}/robots.txt", headers={"Authorization": ""}, timeout=15)
        assert r.status_code == 200
        assert "User-agent" in r.text or "user-agent" in r.text.lower()

    def test_sitemap_xml_200(self):
        r = requests.get(f"{API}/sitemap.xml", headers={"Authorization": ""}, timeout=15)
        assert r.status_code == 200
        assert "<urlset" in r.text or "<sitemap" in r.text
