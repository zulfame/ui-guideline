"""Backend tests for Audit Log across offices/roles/levels/users + redaction + reassign + import."""
import io
import os
import time
from pathlib import Path

import pytest
import requests
from openpyxl import Workbook

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    env_file = Path("/app/frontend/.env")
    for line in env_file.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

PREFIX = "AUDIT_TEST_"
TS = str(int(time.time()))


@pytest.fixture(scope="module")
def sess():
    s = requests.Session()
    yield s
    s.close()


@pytest.fixture(scope="module")
def cleanup_registry():
    reg = {"offices": [], "roles": [], "levels": [], "users": []}
    yield reg
    # Teardown: delete anything left over
    try:
        if reg["users"]:
            requests.post(f"{API}/users/bulk-delete", json={"ids": reg["users"]}, timeout=15)
        if reg["roles"]:
            requests.post(f"{API}/roles/bulk-delete", json={"ids": reg["roles"]}, timeout=15)
        if reg["offices"]:
            requests.post(f"{API}/offices/bulk-delete", json={"ids": reg["offices"]}, timeout=15)
        for lid in reg["levels"]:
            try:
                requests.delete(f"{API}/levels/{lid}", timeout=10)
            except Exception:
                pass
    except Exception:
        pass


def _latest_audit(sess, entity_id=None, **params):
    """Return newest audit entry matching filters. If entity_id given, filter locally."""
    r = sess.get(f"{API}/audit-logs", params={"limit": 50, **params}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    if entity_id:
        data = [d for d in data if d.get("entity_id") == entity_id]
    return data[0] if data else None


# ---------------- Meta ----------------
def test_audit_meta(sess):
    r = sess.get(f"{API}/audit-logs/meta", timeout=10)
    assert r.status_code == 200
    d = r.json()
    for et in ["user", "role", "office", "level"]:
        assert et in d["entity_types"]
    for a in ["create", "update", "delete", "bulk_delete", "import", "reassign", "change_password", "reset_password"]:
        assert a in d["actions"]


# ---------------- Offices ----------------
def test_office_create_update_delete_and_bulk_delete(sess, cleanup_registry):
    code = f"{PREFIX}O1_{TS}"
    name = f"{PREFIX}Office One {TS}"
    r = sess.post(f"{API}/offices", json={"code": code, "name": name}, timeout=15)
    assert r.status_code == 201, r.text
    off_id = r.json()["id"]

    a = _latest_audit(sess, entity_type="office", action="create", q=code)
    assert a and a["entity_id"] == off_id and a["action"] == "create"
    assert code in a["summary"]

    # Update
    r = sess.put(f"{API}/offices/{off_id}", json={"name": f"{PREFIX}Office One Renamed {TS}", "radius": 250}, timeout=15)
    assert r.status_code == 200
    a = _latest_audit(sess, entity_type="office", action="update", entity_id=off_id)
    assert a and a["action"] == "update"
    fields = {c["field"] for c in a.get("changes", [])}
    assert "name" in fields and "radius" in fields
    name_change = next(c for c in a["changes"] if c["field"] == "name")
    assert name_change["from"] == name
    assert "Renamed" in name_change["to"]

    # Delete (unreferenced)
    r = sess.delete(f"{API}/offices/{off_id}", timeout=15)
    assert r.status_code in (200, 204)
    a = _latest_audit(sess, entity_type="office", action="delete", entity_id=off_id)
    assert a and a["action"] == "delete"

    # Bulk-delete: create 2 fresh, then bulk-delete
    ids = []
    for i in range(2):
        r = sess.post(f"{API}/offices", json={"code": f"{PREFIX}BD{i}_{TS}", "name": f"{PREFIX}BD{i} {TS}"}, timeout=15)
        assert r.status_code == 201
        ids.append(r.json()["id"])
    r = sess.post(f"{API}/offices/bulk-delete", json={"ids": ids}, timeout=15)
    assert r.status_code == 200
    a = _latest_audit(sess, entity_type="office", action="bulk_delete")
    assert a and a["action"] == "bulk_delete"
    assert a.get("metadata", {}).get("count") == 2


# ---------------- Roles ----------------
def test_role_crud_audit(sess, cleanup_registry):
    name = f"{PREFIX}Role {TS}"
    r = sess.post(f"{API}/roles", json={"name": name}, timeout=15)
    assert r.status_code in (200, 201), r.text
    rid = r.json()["id"]
    cleanup_registry["roles"].append(rid)

    a = _latest_audit(sess, entity_type="role", action="create", q=name)
    assert a and a["entity_id"] == rid

    new_name = f"{PREFIX}Role Renamed {TS}"
    r = sess.put(f"{API}/roles/{rid}", json={"name": new_name, "order": 5}, timeout=15)
    assert r.status_code == 200
    a = _latest_audit(sess, entity_type="role", action="update", entity_id=rid)
    assert a and any(c["field"] == "name" for c in a["changes"])
    assert any(c["field"] == "order" for c in a["changes"])

    r = sess.delete(f"{API}/roles/{rid}", timeout=15)
    assert r.status_code in (200, 204)
    cleanup_registry["roles"].remove(rid)
    a = _latest_audit(sess, entity_type="role", action="delete", entity_id=rid)
    assert a

    # Bulk delete
    ids = []
    for i in range(2):
        r = sess.post(f"{API}/roles", json={"name": f"{PREFIX}BDR{i}_{TS}"}, timeout=15)
        assert r.status_code in (200, 201)
        ids.append(r.json()["id"])
    r = sess.post(f"{API}/roles/bulk-delete", json={"ids": ids}, timeout=15)
    assert r.status_code == 200
    a = _latest_audit(sess, entity_type="role", action="bulk_delete")
    assert a and a["metadata"].get("count") == 2


# ---------------- Levels ----------------
def test_level_crud_audit(sess, cleanup_registry):
    name = f"{PREFIX}Level {TS}"
    r = sess.post(f"{API}/levels", json={"name": name, "order": 1}, timeout=15)
    assert r.status_code in (200, 201), r.text
    lid = r.json()["id"]
    cleanup_registry["levels"].append(lid)

    a = _latest_audit(sess, entity_type="level", action="create", q=name)
    assert a and a["entity_id"] == lid

    r = sess.put(f"{API}/levels/{lid}", json={"name": f"{PREFIX}Level Renamed {TS}"}, timeout=15)
    assert r.status_code == 200
    a = _latest_audit(sess, entity_type="level", action="update", entity_id=lid)
    assert a and any(c["field"] == "name" for c in a["changes"])

    r = sess.delete(f"{API}/levels/{lid}", timeout=15)
    assert r.status_code in (200, 204)
    cleanup_registry["levels"].remove(lid)
    a = _latest_audit(sess, entity_type="level", action="delete", entity_id=lid)
    assert a


# ---------------- Users + password redaction ----------------
def _get_seed_role_office(sess):
    roles = sess.get(f"{API}/roles?limit=200", timeout=15).json()
    offices = sess.get(f"{API}/offices?limit=200", timeout=15).json()
    roles_items = roles["items"] if isinstance(roles, dict) else roles
    offices_items = offices["items"] if isinstance(offices, dict) else offices
    return roles_items[0]["id"], offices_items[0]["id"]


def test_user_crud_and_password_redaction(sess, cleanup_registry):
    role_id, office_id = _get_seed_role_office(sess)
    email = f"audit_test_{TS}@example.com"
    payload = {"name": f"{PREFIX}User {TS}", "email": email, "role_id": role_id, "office_id": office_id}
    r = sess.post(f"{API}/users", json=payload, timeout=15)
    assert r.status_code == 201, r.text
    uid = r.json()["id"]
    cleanup_registry["users"].append(uid)

    a = _latest_audit(sess, entity_type="user", action="create", q=email)
    assert a and a["entity_id"] == uid
    # Ensure no plaintext password field even in create (there's none but request must be safe)
    req_str = str(a.get("request"))
    assert "password" not in req_str or "redacted" in req_str

    # Update
    r = sess.put(f"{API}/users/{uid}", json={"phone": "0812345678", "alias": "aud"}, timeout=15)
    assert r.status_code == 200
    a = _latest_audit(sess, entity_type="user", action="update", entity_id=uid)
    assert a and any(c["field"] == "phone" for c in a["changes"])

    # Change password
    secret_pw = "SuperSecret!2026_XYZ"
    r = sess.post(f"{API}/users/{uid}/change-password", json={"new_password": secret_pw}, timeout=15)
    assert r.status_code == 200, r.text
    a = _latest_audit(sess, entity_type="user", action="change_password", entity_id=uid)
    assert a
    # CRITICAL: plaintext must NOT appear anywhere in audit doc
    full = str(a)
    assert secret_pw not in full, f"Plaintext password leaked in audit: {full}"
    assert "redacted" in full.lower()

    # Reset password
    reset_pw = "AnotherSecret!2026"
    r = sess.post(f"{API}/users/{uid}/reset-password", json={"new_password": reset_pw}, timeout=15)
    assert r.status_code == 200, r.text
    a = _latest_audit(sess, entity_type="user", action="reset_password", entity_id=uid)
    assert a
    full = str(a)
    assert reset_pw not in full
    assert "redacted" in full.lower()

    # Delete user
    r = sess.delete(f"{API}/users/{uid}", timeout=15)
    assert r.status_code in (200, 204)
    cleanup_registry["users"].remove(uid)
    a = _latest_audit(sess, entity_type="user", action="delete", entity_id=uid)
    assert a

    # Bulk delete users
    ids = []
    for i in range(2):
        p = {"name": f"{PREFIX}BDU{i} {TS}", "email": f"audit_bdu{i}_{TS}@example.com",
             "role_id": role_id, "office_id": office_id}
        rr = sess.post(f"{API}/users", json=p, timeout=15)
        assert rr.status_code == 201
        ids.append(rr.json()["id"])
    r = sess.post(f"{API}/users/bulk-delete", json={"ids": ids}, timeout=15)
    assert r.status_code == 200
    a = _latest_audit(sess, entity_type="user", action="bulk_delete")
    assert a and a["metadata"].get("count") == 2


# ---------------- Reassign (office delete with linked users) ----------------
def test_reassign_office_creates_reassign_audit(sess, cleanup_registry):
    role_id, _ = _get_seed_role_office(sess)
    # Create 2 offices
    r1 = sess.post(f"{API}/offices", json={"code": f"{PREFIX}RSA_{TS}", "name": f"{PREFIX}Reassign Src {TS}"}, timeout=15)
    r2 = sess.post(f"{API}/offices", json={"code": f"{PREFIX}RSB_{TS}", "name": f"{PREFIX}Reassign Dst {TS}"}, timeout=15)
    assert r1.status_code == 201 and r2.status_code == 201
    src, dst = r1.json()["id"], r2.json()["id"]
    cleanup_registry["offices"].extend([src, dst])

    # Attach user to src
    u = sess.post(f"{API}/users", json={
        "name": f"{PREFIX}RS User {TS}", "email": f"audit_rs_{TS}@example.com",
        "role_id": role_id, "office_id": src
    }, timeout=15)
    assert u.status_code == 201
    uid = u.json()["id"]
    cleanup_registry["users"].append(uid)

    # Delete src office with reassign_to=dst
    r = sess.delete(f"{API}/offices/{src}", params={"reassign_to": dst}, timeout=15)
    assert r.status_code in (200, 204), r.text
    cleanup_registry["offices"].remove(src)

    a = _latest_audit(sess, entity_type="office", action="reassign")
    assert a, "No reassign audit entry found"
    assert a["metadata"].get("linked_users", 0) >= 1
    assert a["metadata"].get("reassign_to") == dst


# ---------------- Import ----------------
def _make_offices_xlsx():
    wb = Workbook()
    ws = wb.active
    ws.append(["code", "name", "address", "telephone", "longitude", "latitude", "radius", "note"])
    ws.append([f"{PREFIX}IMP1_{TS}", f"{PREFIX}Import One {TS}", "addr1", "0811", 106.8, -6.2, 100, "n"])
    ws.append([f"{PREFIX}IMP2_{TS}", f"{PREFIX}Import Two {TS}", "addr2", "0812", 107.0, -6.9, 100, "n"])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def test_offices_import_audit(sess, cleanup_registry):
    buf = _make_offices_xlsx()
    files = {"file": ("offices.xlsx", buf.getvalue(),
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    r = sess.post(f"{API}/offices/import", files=files, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["created"] == 2

    # Register created for cleanup
    listing = sess.get(f"{API}/offices?limit=500", timeout=15).json()
    items = listing["items"] if isinstance(listing, dict) else listing
    for o in items:
        if o["code"].startswith(f"{PREFIX}IMP") and TS in o["code"]:
            cleanup_registry["offices"].append(o["id"])

    a = _latest_audit(sess, entity_type="office", action="import")
    assert a and a["action"] == "import"
    md = a.get("metadata", {})
    assert md.get("created") == 2
    assert md.get("total") == 2
    assert "updated" in md


# ---------------- Filters + pagination ----------------
def test_audit_filters_and_pagination(sess):
    r = sess.get(f"{API}/audit-logs", params={"limit": 5, "skip": 0}, timeout=15)
    assert r.status_code == 200
    total = int(r.headers.get("X-Total-Count", "0"))
    assert total > 0
    data = r.json()
    assert len(data) <= 5
    # Newest-first
    if len(data) >= 2:
        assert data[0]["created_at"] >= data[1]["created_at"]

    # Filter by entity_type
    r = sess.get(f"{API}/audit-logs", params={"entity_type": "office", "limit": 5}, timeout=15)
    assert r.status_code == 200
    for row in r.json():
        assert row["entity_type"] == "office"

    # Filter by action
    r = sess.get(f"{API}/audit-logs", params={"action": "create", "limit": 5}, timeout=15)
    assert r.status_code == 200
    for row in r.json():
        assert row["action"] == "create"

    # Text search q
    r = sess.get(f"{API}/audit-logs", params={"q": PREFIX, "limit": 5}, timeout=15)
    assert r.status_code == 200
    found = r.json()
    assert len(found) > 0

    # Date range
    r = sess.get(f"{API}/audit-logs", params={"date_from": "2026-01-01", "limit": 5}, timeout=15)
    assert r.status_code == 200

    # Pagination
    r1 = sess.get(f"{API}/audit-logs", params={"limit": 2, "skip": 0}, timeout=15)
    r2 = sess.get(f"{API}/audit-logs", params={"limit": 2, "skip": 2}, timeout=15)
    if len(r1.json()) == 2 and len(r2.json()) >= 1:
        assert r1.json()[0]["id"] != r2.json()[0]["id"]
