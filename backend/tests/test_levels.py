"""Backend tests for Levels CRUD + Role level_id/dotted_parent_id/order fields."""
import os
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None
if not BASE_URL:
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="class")
def state():
    s = {"levels": [], "roles": []}
    yield s
    # Cleanup roles first
    for rid in s["roles"]:
        try: requests.delete(f"{API}/roles/{rid}", timeout=10)
        except: pass
    for lid in s["levels"]:
        try: requests.delete(f"{API}/levels/{lid}", timeout=10)
        except: pass


class TestLevelsCRUD:
    def test_create_level(self, state):
        r = requests.post(f"{API}/levels", json={"name": "TEST_LVL_A", "order": 2}, timeout=10)
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["name"] == "TEST_LVL_A"
        assert d["order"] == 2
        assert "id" in d
        state["levels"].append(d["id"])

    def test_create_second_level(self, state):
        r = requests.post(f"{API}/levels", json={"name": "TEST_LVL_B", "order": 1}, timeout=10)
        assert r.status_code == 201
        state["levels"].append(r.json()["id"])

    def test_duplicate_level_409(self, state):
        r = requests.post(f"{API}/levels", json={"name": "TEST_LVL_A", "order": 5}, timeout=10)
        assert r.status_code == 409

    def test_list_sorted_by_order(self, state):
        r = requests.get(f"{API}/levels", timeout=10)
        assert r.status_code == 200
        data = r.json()
        # Both TEST_LVL_B (order 1) should come before TEST_LVL_A (order 2)
        test_levels = [l for l in data if l["name"].startswith("TEST_LVL_")]
        assert test_levels[0]["name"] == "TEST_LVL_B"
        assert test_levels[1]["name"] == "TEST_LVL_A"
        # Ensure sorted by order globally
        orders = [l["order"] for l in data]
        assert orders == sorted(orders)

    def test_update_level(self, state):
        lid = state["levels"][0]
        r = requests.put(f"{API}/levels/{lid}", json={"name": "TEST_LVL_A2", "order": 9}, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["name"] == "TEST_LVL_A2"
        assert d["order"] == 9

    def test_update_level_duplicate_409(self, state):
        lid = state["levels"][0]
        r = requests.put(f"{API}/levels/{lid}", json={"name": "TEST_LVL_B"}, timeout=10)
        assert r.status_code == 409


class TestRoleNewFields:
    @pytest.fixture(scope="class", autouse=True)
    def _seed_levels(self, state):
        """Self-contained setup: this class creates its OWN levels so it never
        depends on TestLevelsCRUD. With `--dist loadscope` each class may run on a
        different xdist worker (state is class-scoped), so cross-class sharing is
        unsafe — every class seeds what it needs. Unique names avoid 409 clashes.
        """
        for name, order in [("TEST_RF_LVL_A", 1), ("TEST_RF_LVL_B", 2)]:
            r = requests.post(f"{API}/levels", json={"name": name, "order": order}, timeout=10)
            if r.status_code == 201:
                state["levels"].append(r.json()["id"])
        yield

    def test_create_role_with_level_and_order(self, state):
        lid = state["levels"][0]
        r = requests.post(f"{API}/roles", json={
            "name": "TEST_R_A", "level_id": lid, "order": 5
        }, timeout=10)
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["level_id"] == lid
        assert d["order"] == 5
        assert d["dotted_parent_id"] is None
        state["roles"].append(d["id"])

    def test_invalid_level_400(self, state):
        r = requests.post(f"{API}/roles", json={
            "name": "TEST_R_bad", "level_id": "nonexistent-xxx"
        }, timeout=10)
        assert r.status_code == 400
        assert "level" in r.json()["detail"].lower()

    def test_create_role_with_dotted(self, state):
        target_id = state["roles"][0]
        r = requests.post(f"{API}/roles", json={
            "name": "TEST_R_B", "dotted_parent_id": target_id, "order": 3
        }, timeout=10)
        assert r.status_code == 201
        d = r.json()
        assert d["dotted_parent_id"] == target_id
        state["roles"].append(d["id"])

    def test_dotted_self_400(self, state):
        rid = state["roles"][0]
        r = requests.put(f"{API}/roles/{rid}", json={"dotted_parent_id": rid}, timeout=10)
        assert r.status_code == 400

    def test_dotted_nonexistent_400(self, state):
        rid = state["roles"][0]
        r = requests.put(f"{API}/roles/{rid}", json={"dotted_parent_id": "nonexistent-yyy"}, timeout=10)
        assert r.status_code == 400

    def test_update_role_fields(self, state):
        rid = state["roles"][1]
        lid = state["levels"][1]
        r = requests.put(f"{API}/roles/{rid}", json={
            "level_id": lid, "order": 10
        }, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["level_id"] == lid
        assert d["order"] == 10
        # GET to verify persistence
        g = requests.get(f"{API}/roles/{rid}", timeout=10)
        assert g.json()["level_id"] == lid
        assert g.json()["order"] == 10

    def test_delete_role_clears_dotted_references(self, state):
        # role B has dotted_parent_id -> role A. Delete A, verify B's dotted becomes null.
        role_a = state["roles"][0]
        role_b = state["roles"][1]
        r = requests.delete(f"{API}/roles/{role_a}", timeout=10)
        assert r.status_code == 200
        state["roles"].remove(role_a)
        g = requests.get(f"{API}/roles/{role_b}", timeout=10)
        assert g.json()["dotted_parent_id"] is None

    def test_delete_level_detaches_roles(self, state):
        # role B (only surviving role) currently has level_id = state["levels"][1]
        role_b = state["roles"][0]
        lid = state["levels"][1]
        r = requests.delete(f"{API}/levels/{lid}", timeout=10)
        assert r.status_code == 200
        state["levels"].remove(lid)
        g = requests.get(f"{API}/roles/{role_b}", timeout=10)
        assert g.json()["level_id"] is None
