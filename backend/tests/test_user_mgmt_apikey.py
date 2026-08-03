"""Tests for API-client user management endpoints:
   POST /api/user-create, /api/user-update, /api/user-deactivate.
   Uses X-API-Key auth. Verifies unified envelope {success, data|message}."""
import os
import uuid
from pathlib import Path
import pytest
import requests


def _load_base_url():
    b = os.environ.get("REACT_APP_BACKEND_URL")
    if not b:
        f = Path("/app/frontend/.env")
        if f.exists():
            for ln in f.read_text().splitlines():
                if ln.startswith("REACT_APP_BACKEND_URL="):
                    b = ln.split("=", 1)[1].strip()
                    break
    assert b, "REACT_APP_BACKEND_URL not found"
    return b.rstrip("/")


BASE_URL = _load_base_url()
ADMIN_EMAIL = "sa@bprbangunarta.co.id"
ADMIN_PASSWORD = "SA@4dm1n"
DEFAULT_USER_PASSWORD = "bpr2026"


# -------------------- fixtures --------------------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok, f"no token in login response: {r.text}"
    return tok


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def role_id(admin_headers):
    r = requests.get(f"{BASE_URL}/api/roles", headers=admin_headers, timeout=30)
    assert r.status_code == 200, r.text
    roles = r.json()
    assert isinstance(roles, list) and roles, "no roles found"
    return roles[0]["id"]


@pytest.fixture(scope="module")
def api_client_ctx(admin_headers):
    """Create an API client, yield (api_key, client_id), then delete the client."""
    name = f"TEST_apiclient_{uuid.uuid4().hex[:8]}"
    r = requests.post(f"{BASE_URL}/api/clients", headers=admin_headers,
                      json={"name": name}, timeout=30)
    assert r.status_code == 201, f"create client failed: {r.status_code} {r.text}"
    body = r.json()
    api_key = body["api_key"]
    client_id = body["id"]
    yield api_key, client_id
    # teardown
    try:
        requests.delete(f"{BASE_URL}/api/clients/{client_id}", headers=admin_headers, timeout=30)
    except Exception:
        pass


@pytest.fixture
def api_headers(api_client_ctx):
    api_key, _ = api_client_ctx
    return {"X-API-Key": api_key, "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def created_emails():
    """Track created TEST_ user emails for cleanup."""
    emails = []
    yield emails
    # teardown: hard delete via admin using DELETE /api/users/{id}
    try:
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
        tok = r.json().get("access_token") or r.json().get("token")
        h = {"Authorization": f"Bearer {tok}"}
        lst = requests.get(f"{BASE_URL}/api/users", headers=h, timeout=30).json()
        users = lst if isinstance(lst, list) else lst.get("data") or lst.get("items") or []
        for u in users:
            if (u.get("email") or "").lower() in [e.lower() for e in emails]:
                requests.delete(f"{BASE_URL}/api/users/{u['id']}", headers=h, timeout=30)
    except Exception as e:
        print(f"cleanup error: {e}")


def _mk_email():
    return f"TEST_um_{uuid.uuid4().hex[:10]}@example.com"


# -------------------- USER-CREATE --------------------
class TestUserCreate:
    def test_success_201_envelope(self, api_headers, role_id, created_emails):
        email = _mk_email()
        created_emails.append(email)
        r = requests.post(f"{BASE_URL}/api/user-create", headers=api_headers,
                          json={"name": "Test User A", "email": email, "role_id": role_id}, timeout=30)
        assert r.status_code == 201, r.text
        body = r.json()
        assert body.get("success") is True
        data = body["data"]
        assert "user" in data
        assert data["user"]["email"].lower() == email.lower()
        assert data["user"]["name"] == "Test User A"
        # office/device keys per envelope contract
        assert "office" in data
        assert "device" in data

    def test_default_password_used_when_omitted(self, api_headers, role_id, created_emails):
        email = _mk_email()
        created_emails.append(email)
        r = requests.post(f"{BASE_URL}/api/user-create", headers=api_headers,
                          json={"name": "Default PW", "email": email, "role_id": role_id}, timeout=30)
        assert r.status_code == 201, r.text
        # verify by logging in with default password
        lr = requests.post(f"{BASE_URL}/api/auth/login",
                           json={"identifier": email, "password": DEFAULT_USER_PASSWORD}, timeout=30)
        # server should authenticate credentials (200); may or may not require password change
        assert lr.status_code == 200, f"default password login failed: {lr.status_code} {lr.text}"

    def test_duplicate_email_409(self, api_headers, role_id, created_emails):
        email = _mk_email()
        created_emails.append(email)
        r1 = requests.post(f"{BASE_URL}/api/user-create", headers=api_headers,
                           json={"name": "Dup A", "email": email, "role_id": role_id}, timeout=30)
        assert r1.status_code == 201, r1.text
        r2 = requests.post(f"{BASE_URL}/api/user-create", headers=api_headers,
                           json={"name": "Dup B", "email": email, "role_id": role_id}, timeout=30)
        assert r2.status_code == 409, r2.text
        b = r2.json()
        assert b.get("success") is False
        assert "already" in (b.get("message") or "").lower() or "exist" in (b.get("message") or "").lower()

    def test_unknown_role_400(self, api_headers, created_emails):
        email = _mk_email()
        created_emails.append(email)
        r = requests.post(f"{BASE_URL}/api/user-create", headers=api_headers,
                          json={"name": "Bad Role", "email": email,
                                "role_id": "nonexistent-role-" + uuid.uuid4().hex[:6]}, timeout=30)
        assert r.status_code == 400, r.text
        b = r.json()
        assert b.get("success") is False
        assert "role" in (b.get("message") or "").lower()

    def test_missing_email_400(self, api_headers, role_id):
        r = requests.post(f"{BASE_URL}/api/user-create", headers=api_headers,
                          json={"name": "No email", "email": "", "role_id": role_id}, timeout=30)
        assert r.status_code == 400, r.text
        assert r.json().get("success") is False

    def test_invalid_email_400(self, api_headers, role_id):
        r = requests.post(f"{BASE_URL}/api/user-create", headers=api_headers,
                          json={"name": "Bad email", "email": "notanemail", "role_id": role_id}, timeout=30)
        assert r.status_code == 400, r.text
        assert r.json().get("success") is False

    def test_missing_name_400(self, api_headers, role_id):
        r = requests.post(f"{BASE_URL}/api/user-create", headers=api_headers,
                          json={"name": "", "email": _mk_email(), "role_id": role_id}, timeout=30)
        assert r.status_code == 400, r.text
        assert r.json().get("success") is False

    def test_missing_apikey_401(self, role_id):
        r = requests.post(f"{BASE_URL}/api/user-create",
                          headers={"Content-Type": "application/json"},
                          json={"name": "X", "email": _mk_email(), "role_id": role_id}, timeout=30)
        assert r.status_code == 401, r.text
        b = r.json()
        assert b.get("success") is False
        assert b.get("message"), "envelope must include message"

    def test_invalid_apikey_401(self, role_id):
        r = requests.post(f"{BASE_URL}/api/user-create",
                          headers={"X-API-Key": "invalid_key_" + uuid.uuid4().hex,
                                   "Content-Type": "application/json"},
                          json={"name": "X", "email": _mk_email(), "role_id": role_id}, timeout=30)
        assert r.status_code == 401, r.text
        assert r.json().get("success") is False

    def test_admin_bearer_rejected_on_apikey_endpoint(self, admin_headers, role_id):
        # calling with admin Bearer instead of X-API-Key should be rejected as 401 envelope
        r = requests.post(f"{BASE_URL}/api/user-create", headers=admin_headers,
                          json={"name": "X", "email": _mk_email(), "role_id": role_id}, timeout=30)
        assert r.status_code == 401, r.text
        assert r.json().get("success") is False


# -------------------- USER-UPDATE --------------------
class TestUserUpdate:
    @pytest.fixture
    def existing_user(self, api_headers, role_id, created_emails):
        email = _mk_email()
        created_emails.append(email)
        r = requests.post(f"{BASE_URL}/api/user-create", headers=api_headers,
                          json={"name": "Upd Base", "email": email, "role_id": role_id}, timeout=30)
        assert r.status_code == 201, r.text
        return {"email": email, "data": r.json()["data"]}

    def test_update_name_by_email_ident(self, api_headers, existing_user):
        r = requests.post(f"{BASE_URL}/api/user-update", headers=api_headers,
                          json={"username": existing_user["email"], "name": "Updated Name"}, timeout=30)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b.get("success") is True
        assert b["data"]["user"]["name"] == "Updated Name"
        assert b["data"]["user"]["email"].lower() == existing_user["email"].lower()

    def test_new_username_changes_username(self, api_headers, existing_user):
        newun = f"TEST_un_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{BASE_URL}/api/user-update", headers=api_headers,
                          json={"username": existing_user["email"], "new_username": newun}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["data"]["user"]["username"] == newun

    def test_is_active_toggle(self, api_headers, existing_user):
        r = requests.post(f"{BASE_URL}/api/user-update", headers=api_headers,
                          json={"username": existing_user["email"], "is_active": False}, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["data"]["user"]["is_active"] is False

    def test_unknown_user_404(self, api_headers):
        r = requests.post(f"{BASE_URL}/api/user-update", headers=api_headers,
                          json={"username": "does_not_exist_" + uuid.uuid4().hex + "@x.com",
                                "name": "x"}, timeout=30)
        assert r.status_code == 404, r.text
        b = r.json()
        assert b.get("success") is False
        assert "not found" in (b.get("message") or "").lower()

    def test_duplicate_email_conflict_409(self, api_headers, role_id, created_emails):
        e1 = _mk_email(); e2 = _mk_email()
        created_emails.extend([e1, e2])
        for e in (e1, e2):
            r = requests.post(f"{BASE_URL}/api/user-create", headers=api_headers,
                              json={"name": "dup", "email": e, "role_id": role_id}, timeout=30)
            assert r.status_code == 201, r.text
        r = requests.post(f"{BASE_URL}/api/user-update", headers=api_headers,
                         json={"username": e2, "email": e1}, timeout=30)
        assert r.status_code == 409, r.text
        assert r.json().get("success") is False

    def test_update_requires_apikey(self, admin_headers, existing_user):
        r = requests.post(f"{BASE_URL}/api/user-update", headers=admin_headers,
                          json={"username": existing_user["email"], "name": "x"}, timeout=30)
        assert r.status_code == 401, r.text
        assert r.json().get("success") is False


# -------------------- USER-DEACTIVATE --------------------
class TestUserDeactivate:
    @pytest.fixture
    def fresh_user(self, api_headers, role_id, created_emails):
        email = _mk_email()
        created_emails.append(email)
        r = requests.post(f"{BASE_URL}/api/user-create", headers=api_headers,
                          json={"name": "Deact user", "email": email, "role_id": role_id}, timeout=30)
        assert r.status_code == 201, r.text
        return email

    def test_deactivate_then_login_forbidden(self, api_headers, fresh_user):
        # deactivate
        r = requests.post(f"{BASE_URL}/api/user-deactivate", headers=api_headers,
                          json={"username": fresh_user, "active": False}, timeout=30)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b.get("success") is True
        assert b["data"]["user"]["is_active"] is False
        # login should now be blocked. Spec expects 403; accept 401 with 'inactive' as acceptable envelope-fail
        lr = requests.post(f"{BASE_URL}/api/auth/login",
                           json={"identifier": fresh_user, "password": DEFAULT_USER_PASSWORD}, timeout=30)
        assert lr.status_code == 403, f"expected 403 (deactivated), got {lr.status_code} {lr.text}"
        # reactivate
        r2 = requests.post(f"{BASE_URL}/api/user-deactivate", headers=api_headers,
                           json={"username": fresh_user, "active": True}, timeout=30)
        assert r2.status_code == 200, r2.text
        assert r2.json()["data"]["user"]["is_active"] is True
        # now login should succeed
        lr2 = requests.post(f"{BASE_URL}/api/auth/login",
                            json={"identifier": fresh_user, "password": DEFAULT_USER_PASSWORD}, timeout=30)
        assert lr2.status_code == 200, f"reactivated login failed: {lr2.status_code} {lr2.text}"

    def test_deactivate_unknown_user_404(self, api_headers):
        r = requests.post(f"{BASE_URL}/api/user-deactivate", headers=api_headers,
                          json={"username": "nope_" + uuid.uuid4().hex + "@x.com", "active": False},
                          timeout=30)
        assert r.status_code == 404, r.text
        assert r.json().get("success") is False

    def test_deactivate_requires_apikey(self, admin_headers, fresh_user):
        r = requests.post(f"{BASE_URL}/api/user-deactivate", headers=admin_headers,
                          json={"username": fresh_user, "active": False}, timeout=30)
        assert r.status_code == 401, r.text
        assert r.json().get("success") is False


# -------------------- REGRESSION: /api/user-auth & /api/user-password --------------------
class TestRegression:
    def test_user_auth_still_works(self, api_headers, role_id, created_emails):
        email = _mk_email()
        created_emails.append(email)
        cr = requests.post(f"{BASE_URL}/api/user-create", headers=api_headers,
                           json={"name": "Reg", "email": email, "role_id": role_id}, timeout=30)
        assert cr.status_code == 201, cr.text
        r = requests.post(f"{BASE_URL}/api/user-auth", headers=api_headers,
                          json={"username": email, "password": DEFAULT_USER_PASSWORD}, timeout=30)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b.get("success") is True
        assert "user" in b["data"]

    def test_user_auth_bad_password_envelope(self, api_headers, role_id, created_emails):
        email = _mk_email()
        created_emails.append(email)
        cr = requests.post(f"{BASE_URL}/api/user-create", headers=api_headers,
                           json={"name": "Reg2", "email": email, "role_id": role_id}, timeout=30)
        assert cr.status_code == 201, cr.text
        r = requests.post(f"{BASE_URL}/api/user-auth", headers=api_headers,
                          json={"username": email, "password": "wrongpass!!!"}, timeout=30)
        assert r.status_code == 401, r.text
        assert r.json().get("success") is False
