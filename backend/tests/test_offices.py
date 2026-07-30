"""Backend tests for the Offices CMS module."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if not BASE_URL:
    # Try loading from frontend/.env directly
    from pathlib import Path
    env_file = Path('/app/frontend/.env')
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip()
                break

BASE_URL = BASE_URL.rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def created_ids():
    ids = []
    yield ids
    # Cleanup
    if ids:
        try:
            requests.post(f"{API}/offices/bulk-delete", json={"ids": ids}, timeout=10)
        except Exception:
            pass


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- CRUD basics ----
def test_create_office_defaults_radius(session, created_ids):
    payload = {"code": "TEST_C1", "name": "TEST Office 1"}
    r = session.post(f"{API}/offices", json=payload, timeout=15)
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["code"] == "TEST_C1"
    assert data["name"] == "TEST Office 1"
    assert data["radius"] == 100
    assert "id" in data and data["id"]
    assert "created_at" in data and "updated_at" in data
    created_ids.append(data["id"])


def test_list_offices_contains_created(session, created_ids):
    r = session.get(f"{API}/offices", timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    ids = [i["id"] for i in items]
    for oid in created_ids:
        assert oid in ids
    # newest first check: created_at descending
    if len(items) >= 2:
        assert items[0]["created_at"] >= items[1]["created_at"]


def test_get_office_by_id(session, created_ids):
    oid = created_ids[0]
    r = session.get(f"{API}/offices/{oid}", timeout=15)
    assert r.status_code == 200
    assert r.json()["id"] == oid


def test_get_office_404(session):
    r = session.get(f"{API}/offices/does-not-exist-xyz", timeout=15)
    assert r.status_code == 404


# ---- Uniqueness ----
def test_unique_code_conflict(session, created_ids):
    payload = {"code": "TEST_C1", "name": "TEST Different Name"}
    r = session.post(f"{API}/offices", json=payload, timeout=15)
    assert r.status_code == 409
    assert "code" in r.json().get("detail", "").lower()


def test_unique_name_conflict(session, created_ids):
    payload = {"code": "TEST_DIFF", "name": "TEST Office 1"}
    r = session.post(f"{API}/offices", json=payload, timeout=15)
    assert r.status_code == 409
    assert "name" in r.json().get("detail", "").lower()


# ---- Validation ----
def test_missing_code_422(session):
    r = session.post(f"{API}/offices", json={"name": "TEST No Code"}, timeout=15)
    assert r.status_code == 422


def test_missing_name_422(session):
    r = session.post(f"{API}/offices", json={"code": "TEST_NN"}, timeout=15)
    assert r.status_code == 422


def test_latitude_out_of_range(session):
    r = session.post(f"{API}/offices", json={"code": "TEST_LAT", "name": "TEST Lat", "latitude": 95}, timeout=15)
    assert r.status_code == 422


def test_longitude_out_of_range(session):
    r = session.post(f"{API}/offices", json={"code": "TEST_LON", "name": "TEST Lon", "longitude": -200}, timeout=15)
    assert r.status_code == 422


def test_radius_negative(session):
    r = session.post(f"{API}/offices", json={"code": "TEST_RAD", "name": "TEST Rad", "radius": -1}, timeout=15)
    assert r.status_code == 422


# ---- PUT update ----
def test_update_office_partial(session, created_ids):
    oid = created_ids[0]
    r = session.put(f"{API}/offices/{oid}", json={"address": "TEST Addr", "radius": 250}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["address"] == "TEST Addr"
    assert data["radius"] == 250
    # verify persistence
    g = session.get(f"{API}/offices/{oid}", timeout=15).json()
    assert g["address"] == "TEST Addr"
    assert g["radius"] == 250


def test_update_same_code_name_ok(session, created_ids):
    oid = created_ids[0]
    r = session.put(f"{API}/offices/{oid}", json={"code": "TEST_C1", "name": "TEST Office 1"}, timeout=15)
    assert r.status_code == 200


def test_update_conflict_with_other(session, created_ids):
    # Create second office
    r = session.post(f"{API}/offices", json={"code": "TEST_C2", "name": "TEST Office 2"}, timeout=15)
    assert r.status_code == 201
    oid2 = r.json()["id"]
    created_ids.append(oid2)
    # Try to update oid2 code to TEST_C1 (used by first)
    r = session.put(f"{API}/offices/{oid2}", json={"code": "TEST_C1"}, timeout=15)
    assert r.status_code == 409


def test_update_404(session):
    r = session.put(f"{API}/offices/nonexistent-id", json={"name": "TEST X"}, timeout=15)
    assert r.status_code == 404

def test_update_clear_optional_field_with_null(session, created_ids):
    # Create with a telephone value
    r = session.post(f"{API}/offices", json={"code": "TEST_CLR", "name": "TEST Clear Field", "telephone": "021-999"}, timeout=15)
    assert r.status_code == 201, r.text
    oid = r.json()["id"]
    created_ids.append(oid)
    assert r.json()["telephone"] == "021-999"
    # Send null explicitly to clear it
    u = session.put(f"{API}/offices/{oid}", json={"telephone": None}, timeout=15)
    assert u.status_code == 200, u.text
    assert u.json()["telephone"] is None
    # Verify via GET that null persisted (not reverted to previous value)
    g = session.get(f"{API}/offices/{oid}", timeout=15).json()
    assert g["telephone"] is None, f"Expected telephone cleared, got {g['telephone']}"




# ---- DELETE ----
def test_delete_office(session):
    # Create one to delete
    r = session.post(f"{API}/offices", json={"code": "TEST_DEL", "name": "TEST Delete Me"}, timeout=15)
    assert r.status_code == 201
    oid = r.json()["id"]
    d = session.delete(f"{API}/offices/{oid}", timeout=15)
    assert d.status_code == 200
    g = session.get(f"{API}/offices/{oid}", timeout=15)
    assert g.status_code == 404


def test_delete_404(session):
    r = session.delete(f"{API}/offices/nonexistent-id", timeout=15)
    assert r.status_code == 404


def test_bulk_delete(session):
    ids = []
    for i in range(3):
        r = session.post(f"{API}/offices", json={"code": f"TEST_BD{i}", "name": f"TEST Bulk {i}"}, timeout=15)
        assert r.status_code == 201
        ids.append(r.json()["id"])
    r = session.post(f"{API}/offices/bulk-delete", json={"ids": ids}, timeout=15)
    assert r.status_code == 200
    assert r.json().get("deleted") == 3
