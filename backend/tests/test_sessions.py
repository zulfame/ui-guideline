"""Backend tests for the Active Sessions admin API + JWT revocation flow."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_ID = "sa@bprbangunarta.co.id"
ADMIN_PW = "SA@4dm1n"


def _login(identifier=ADMIN_ID, password=ADMIN_PW):
    r = requests.post(f"{API}/auth/login", json={"identifier": identifier, "password": password}, timeout=30)
    return r


def _bearer(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def admin_token():
    r = _login()
    assert r.status_code == 200, r.text
    return r.json()["token"]


# ---------- GET /api/sessions basic shape ----------
def test_list_sessions_shape_and_header(admin_token):
    r = requests.get(f"{API}/sessions", headers=_bearer(admin_token), timeout=30)
    assert r.status_code == 200, r.text
    assert "X-Total-Count" in r.headers
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    row = next((x for x in data if x.get("is_current")), None)
    assert row is not None, "current session flag missing"
    for k in ["id", "user_email", "token_type", "is_current", "revoked", "is_expired", "ip", "label"]:
        assert k in row, f"missing key {k}"
    assert row["token_type"] in ("web", "mobile")
    assert row["is_current"] is True
    assert row["revoked"] is False


# ---------- Revoke a second web session ----------
def test_revoke_second_web_session_and_token_rejected(admin_token):
    # Create second web session
    r2 = _login()
    assert r2.status_code == 200
    second_token = r2.json()["token"]
    assert second_token != admin_token

    # Both should be listed
    r = requests.get(f"{API}/sessions", headers=_bearer(admin_token), timeout=30)
    assert r.status_code == 200
    sessions = r.json()
    web_sessions = [s for s in sessions if s["token_type"] == "web" and not s["revoked"] and not s["is_expired"]]
    assert len(web_sessions) >= 2, f"expected >=2 active web sessions, got {len(web_sessions)}"

    # Find the second (non-current) session
    non_current = [s for s in web_sessions if not s["is_current"]]
    assert non_current, "no non-current session found"
    target_jti = non_current[0]["id"]

    # Revoke it
    r = requests.post(f"{API}/sessions/{target_jti}/revoke", headers=_bearer(admin_token), timeout=30)
    assert r.status_code == 200, r.text
    assert r.json().get("success") is True

    # The revoked token should now fail
    r = requests.get(f"{API}/auth/me", headers=_bearer(second_token), timeout=30)
    assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text}"
    assert "revoked" in r.text.lower()

    # The first token still works
    r = requests.get(f"{API}/auth/me", headers=_bearer(admin_token), timeout=30)
    assert r.status_code == 200


# ---------- Mobile JWT integration ----------
def test_mobile_jwt_session_revoke_flow(admin_token):
    # Clear any existing mobile device binding for admin (avoids "already linked")
    try:
        from pymongo import MongoClient
        _c = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        _c[os.environ.get("DB_NAME", "test_database")].users.update_many(
            {"email": ADMIN_ID},
            {"$unset": {"mobile_device": "", "device_identifier": "", "device_name": "", "device_os": "", "fcm_token": ""}},
        )
        _c.close()
    except Exception as e:
        print(f"warn: could not clear mobile binding: {e}")

    device_id = f"test-device-{uuid.uuid4()}"
    device_name = f"TEST_pytest_{uuid.uuid4().hex[:6]}"
    r = requests.post(
        f"{API}/jwt-auth",
        json={
            "username": ADMIN_ID,
            "password": ADMIN_PW,
            "device_identifier": device_id,
            "device_name": device_name,
        },
        timeout=30,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    data = body.get("data") or body
    mobile_token = data.get("access_token") or data.get("token") or body.get("access_token") or body.get("token")
    assert mobile_token, f"no token in response: {body}"

    # jwt-me works
    r = requests.get(f"{API}/jwt-me", headers=_bearer(mobile_token), timeout=30)
    assert r.status_code == 200, r.text

    # Appears in sessions with token_type=mobile and label
    r = requests.get(f"{API}/sessions", headers=_bearer(admin_token), timeout=30)
    assert r.status_code == 200
    mobile_rows = [s for s in r.json() if s["token_type"] == "mobile" and s.get("label") == device_name]
    assert mobile_rows, f"mobile session with label={device_name} not found"
    mobile_jti = mobile_rows[0]["id"]

    # Revoke via admin
    r = requests.post(f"{API}/sessions/{mobile_jti}/revoke", headers=_bearer(admin_token), timeout=30)
    assert r.status_code == 200, r.text

    # jwt-me now 401
    r = requests.get(f"{API}/jwt-me", headers=_bearer(mobile_token), timeout=30)
    assert r.status_code == 401, f"expected 401 got {r.status_code}: {r.text}"

    # jwt-refresh also 401
    r = requests.post(f"{API}/jwt-refresh", headers=_bearer(mobile_token), timeout=30)
    assert r.status_code == 401, f"expected 401 got {r.status_code}: {r.text}"


# ---------- Security: inactive user cannot login and existing token rejected ----------
def test_inactive_user_login_and_token_rejected(admin_token):
    # Create a throwaway user
    email = f"TEST_inactive_{uuid.uuid4().hex[:8]}@example.com"
    username = f"TEST_inact_{uuid.uuid4().hex[:6]}"
    password = "bpr2026"  # DEFAULT_USER_PASSWORD - create_user always sets this
    # Get a role_id to satisfy validation
    rr = requests.get(f"{API}/roles", headers=_bearer(admin_token), timeout=30)
    if rr.status_code != 200:
        pytest.skip(f"cannot list roles: {rr.status_code}")
    roles = rr.json()
    roles_list = roles if isinstance(roles, list) else roles.get("items", [])
    if not roles_list:
        pytest.skip("no roles available")
    role_id = roles_list[0]["id"]

    payload = {
        "name": "TEST Inactive",
        "email": email,
        "username": username,
        "password": password,
        "role_id": role_id,
        "is_admin": False,
        "is_active": True,
    }
    r = requests.post(f"{API}/users", headers=_bearer(admin_token), json=payload, timeout=30)
    if r.status_code not in (200, 201):
        pytest.skip(f"user create not supported: {r.status_code} {r.text}")
    user = r.json()
    user_id = user.get("id") or user.get("user_id")
    assert user_id, f"no id in create response: {user}"

    try:
        # Login while active -> success
        r = requests.post(f"{API}/auth/login", json={"identifier": email, "password": password}, timeout=30)
        assert r.status_code == 200, r.text
        user_token = r.json()["token"]

        # Verify token works
        r = requests.get(f"{API}/auth/me", headers=_bearer(user_token), timeout=30)
        assert r.status_code == 200

        # Deactivate
        r = requests.put(
            f"{API}/users/{user_id}",
            headers=_bearer(admin_token),
            json={"is_active": False},
            timeout=30,
        )
        assert r.status_code in (200, 204), r.text

        # Login rejected 403
        r = requests.post(f"{API}/auth/login", json={"identifier": email, "password": password}, timeout=30)
        assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"

        # Existing token rejected 403
        r = requests.get(f"{API}/auth/me", headers=_bearer(user_token), timeout=30)
        assert r.status_code == 403, f"expected 403, got {r.status_code}: {r.text}"
    finally:
        # Cleanup
        requests.delete(f"{API}/users/{user_id}", headers=_bearer(admin_token), timeout=30)


# ---------- Logout revokes token ----------
def test_logout_revokes_current_token():
    r = _login()
    assert r.status_code == 200
    tok = r.json()["token"]

    r = requests.get(f"{API}/auth/me", headers=_bearer(tok), timeout=30)
    assert r.status_code == 200

    r = requests.post(f"{API}/auth/logout", headers=_bearer(tok), timeout=30)
    assert r.status_code in (200, 204)

    r = requests.get(f"{API}/auth/me", headers=_bearer(tok), timeout=30)
    assert r.status_code == 401
