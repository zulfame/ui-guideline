"""Backend regression suite for Roles (jabatan) hierarchical CRUD."""
import os
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None
if not BASE_URL:
    # Fallback: read frontend .env
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def created_ids():
    ids = []
    yield ids
    # cleanup TEST_* roles
    for rid in ids:
        try:
            requests.delete(f"{API}/roles/{rid}", timeout=10)
        except Exception:
            pass


def _create(name, parent_id=None):
    r = requests.post(f"{API}/roles", json={"name": name, "parent_id": parent_id}, timeout=10)
    return r


class TestRolesCRUD:
    def test_create_top_level(self, created_ids):
        r = _create("TEST_Direktur")
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["name"] == "TEST_Direktur"
        assert data["parent_id"] is None
        assert "id" in data
        created_ids.append(data["id"])

    def test_duplicate_name_returns_409(self, created_ids):
        r = _create("TEST_Direktur")
        assert r.status_code == 409

    def test_create_with_nonexistent_parent_400(self):
        r = _create("TEST_Orphan", parent_id="nonexistent-id-xxx")
        assert r.status_code == 400

    def test_build_chain_and_list(self, created_ids):
        # Direktur already created
        direktur_id = created_ids[0]
        r = _create("TEST_KepalaBagian", parent_id=direktur_id)
        assert r.status_code == 201
        kb_id = r.json()["id"]
        created_ids.append(kb_id)

        r = _create("TEST_KepalaSeksi", parent_id=kb_id)
        assert r.status_code == 201
        ks_id = r.json()["id"]
        created_ids.append(ks_id)

        r = _create("TEST_AODana", parent_id=ks_id)
        assert r.status_code == 201
        ao_id = r.json()["id"]
        created_ids.append(ao_id)

        # GET list
        rl = requests.get(f"{API}/roles", timeout=10)
        assert rl.status_code == 200
        roles = {r["id"]: r for r in rl.json()}
        assert roles[kb_id]["parent_id"] == direktur_id
        assert roles[ks_id]["parent_id"] == kb_id
        assert roles[ao_id]["parent_id"] == ks_id

    def test_cycle_self_parent(self, created_ids):
        rid = created_ids[0]
        r = requests.put(f"{API}/roles/{rid}", json={"parent_id": rid}, timeout=10)
        assert r.status_code == 400

    def test_cycle_descendant_parent(self, created_ids):
        # Direktur -> parent = AODana (descendant) should fail
        direktur_id = created_ids[0]
        ao_id = created_ids[3]
        r = requests.put(f"{API}/roles/{direktur_id}", json={"parent_id": ao_id}, timeout=10)
        assert r.status_code == 400
        assert "cycle" in r.json().get("detail", "").lower()

    def test_put_exclude_unset_preserves_parent(self, created_ids):
        ks_id = created_ids[2]
        # rename only
        r = requests.put(f"{API}/roles/{ks_id}", json={"name": "TEST_KepalaSeksi2"}, timeout=10)
        assert r.status_code == 200
        # parent_id should still point to KB
        gr = requests.get(f"{API}/roles/{ks_id}", timeout=10)
        assert gr.json()["parent_id"] == created_ids[1]

    def test_put_null_makes_top_level(self, created_ids):
        # Create temp then null out its parent
        r = _create("TEST_Temp", parent_id=created_ids[0])
        tid = r.json()["id"]
        created_ids.append(tid)
        r2 = requests.put(f"{API}/roles/{tid}", json={"parent_id": None}, timeout=10)
        assert r2.status_code == 200
        assert r2.json()["parent_id"] is None

    def test_delete_promotes_children(self, created_ids):
        # delete Kepala Seksi -> AO Dana's parent should become KB
        direktur_id = created_ids[0]
        kb_id = created_ids[1]
        ks_id = created_ids[2]
        ao_id = created_ids[3]
        r = requests.delete(f"{API}/roles/{ks_id}", timeout=10)
        assert r.status_code == 200
        created_ids.remove(ks_id)
        gr = requests.get(f"{API}/roles/{ao_id}", timeout=10)
        assert gr.json()["parent_id"] == kb_id

    def test_bulk_delete_promotes_to_surviving_ancestor(self, created_ids):
        # Delete KB (and Direktur too) -> AO Dana becomes top-level (None)
        direktur_id = created_ids[0]
        kb_id = created_ids[1]
        ao_id = created_ids[3]
        r = requests.post(f"{API}/roles/bulk-delete", json={"ids": [kb_id, direktur_id]}, timeout=10)
        assert r.status_code == 200
        assert r.json()["deleted"] == 2
        created_ids.remove(kb_id)
        created_ids.remove(direktur_id)
        gr = requests.get(f"{API}/roles/{ao_id}", timeout=10)
        assert gr.json()["parent_id"] is None


class TestOfficesRegression:
    def test_list_offices(self):
        r = requests.get(f"{API}/offices", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_office_crud(self):
        payload = {"code": "TEST_OFC_R", "name": "TEST_OfficeRoles", "radius": 50}
        r = requests.post(f"{API}/offices", json=payload, timeout=10)
        assert r.status_code == 201, r.text
        oid = r.json()["id"]
        r2 = requests.put(f"{API}/offices/{oid}", json={"name": "TEST_OfficeRoles2"}, timeout=10)
        assert r2.status_code == 200
        assert r2.json()["name"] == "TEST_OfficeRoles2"
        r3 = requests.delete(f"{API}/offices/{oid}", timeout=10)
        assert r3.status_code == 200
