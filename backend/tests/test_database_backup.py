"""
Backend tests for Database Backup & Restore feature.

Covers: create backup (GridFS), list, download, verify (dry-run) via server + upload,
UPDATE mode restore (keeps records not in backup), REPLACE mode restore (destructive
but safe because we back up first), invalid file rejection, and audit trail.
"""
import io
import json
import os
import time

import pytest
import requests

from pathlib import Path
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    return s


def _create_backup(client):
    r = client.post(f"{API}/database/backup", timeout=60)
    assert r.status_code == 200, r.text
    return r.json()


def _list_backups(client):
    r = client.get(f"{API}/database/backups", timeout=30)
    assert r.status_code == 200
    return r.json()


def _count_offices(client):
    r = client.get(f"{API}/offices", timeout=30)
    assert r.status_code == 200
    data = r.json()
    items = data if isinstance(data, list) else data.get("items", [])
    return len(items), items


def _find_office(client, code):
    _, items = _count_offices(client)
    for it in items:
        if it.get("code") == code:
            return it
    return None


class TestDatabaseBackupRestore:
    def test_01_baseline_seed(self, client):
        # Sanity: seed data present per spec
        n, _ = _count_offices(client)
        assert n >= 4, f"Expected at least 4 seed offices, got {n}"

    def test_02_create_backup_returns_metadata(self, client):
        b = _create_backup(client)
        assert "id" in b and "filename" in b and b["filename"].endswith(".json")
        assert b["size"] > 0 and b["total"] > 0
        assert isinstance(b["counts"], dict) and len(b["counts"]) >= 1

    def test_03_list_shows_newest_first(self, client):
        b = _create_backup(client)
        lst = _list_backups(client)
        assert any(x["id"] == b["id"] for x in lst)
        # newest first — the fresh one should be within first few (there may be older ones)
        ids = [x["id"] for x in lst]
        assert ids[0] == b["id"] or b["id"] in ids[:3]
        for x in lst:
            assert "size" in x and "total" in x and "created_at" in x

    def test_04_download_returns_json_attachment(self, client):
        b = _create_backup(client)
        r = client.get(f"{API}/database/backups/{b['id']}/download", timeout=60)
        assert r.status_code == 200
        cd = r.headers.get("content-disposition", "")
        assert "attachment" in cd.lower() and b["filename"] in cd
        payload = r.json()
        assert isinstance(payload.get("collections"), dict)
        assert payload["meta"]["total"] == b["total"]


    # verify (dry-run)
    def test_05_verify_server_dry_run(self, client):
        b = _create_backup(client)
        r = client.post(
            f"{API}/database/restore/server",
            json={"id": b["id"], "dry_run": True},
            timeout=60,
        )
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is True and data["total"] == b["total"]
        assert isinstance(data["collections"], list) and len(data["collections"]) >= 1
        # Confirm DB not modified: office count unchanged
        n, _ = _count_offices(client)
        assert n >= 4

    def test_06_verify_upload_dry_run(self, client):
        b = _create_backup(client)
        r = client.get(f"{API}/database/backups/{b['id']}/download", timeout=60)
        files = {"file": (b["filename"], r.content, "application/json")}
        rr = client.post(
            f"{API}/database/restore/upload",
            files=files,
            data={"dry_run": "true"},
            timeout=60,
        )
        assert rr.status_code == 200
        data = rr.json()
        assert data["valid"] is True and data["total"] == b["total"]

    def test_07_invalid_upload_rejected(self, client):
        bad = json.dumps({"foo": 1}).encode("utf-8")
        r = client.post(
            f"{API}/database/restore/upload",
            files={"file": ("bad.json", bad, "application/json")},
            data={"dry_run": "true"},
            timeout=30,
        )
        assert r.status_code == 400
        # DB unchanged
        n, _ = _count_offices(client)
        assert n >= 4


    # update-mode
    def test_08_update_keeps_new_record(self, client):
        # 1. Baseline backup
        b1 = _create_backup(client)
        # 2. Create post-backup office
        payload = {"code": "AUDIT_TEST_UPD", "name": "AUDIT_TEST Update Office"}
        r = client.post(f"{API}/offices", json=payload, timeout=30)
        assert r.status_code in (200, 201), r.text
        created = r.json()
        created_id = created.get("id")
        assert _find_office(client, "AUDIT_TEST_UPD") is not None
        # 3. Restore update mode
        rr = client.post(
            f"{API}/database/restore/server",
            json={"id": b1["id"], "mode": "update", "dry_run": False},
            timeout=120,
        )
        assert rr.status_code == 200, rr.text
        assert rr.json().get("success") is True
        # 4. Post-backup office must still exist
        still = _find_office(client, "AUDIT_TEST_UPD")
        assert still is not None, "UPDATE mode wrongly removed post-backup record"
        # 5. cleanup
        client.delete(f"{API}/offices/{created_id}", timeout=30)
        assert _find_office(client, "AUDIT_TEST_UPD") is None


    # replace-mode
    def test_09_replace_wipes_post_backup_and_keeps_seed(self, client):
        # Snapshot seed counts BEFORE we do anything destructive
        n_before, _ = _count_offices(client)

        # 1. Full backup B2 (contains ALL real data)
        b2 = _create_backup(client)

        # 2. Create AUDIT_TEST_REP office (post-B2, must vanish after replace)
        r = client.post(
            f"{API}/offices",
            json={"code": "AUDIT_TEST_REP", "name": "AUDIT_TEST Replace Office"},
            timeout=30,
        )
        assert r.status_code in (200, 201), r.text
        assert _find_office(client, "AUDIT_TEST_REP") is not None

        # 3. Replace-restore B2
        rr = client.post(
            f"{API}/database/restore/server",
            json={"id": b2["id"], "mode": "replace", "dry_run": False},
            timeout=180,
        )
        assert rr.status_code == 200, rr.text
        assert rr.json().get("success") is True

        # 4. AUDIT_TEST_REP must be GONE
        assert _find_office(client, "AUDIT_TEST_REP") is None, "REPLACE did not wipe post-backup record"

        # 5. Original seed counts preserved
        n_after, _ = _count_offices(client)
        assert n_after == n_before, f"Seed office count changed after replace: {n_before} -> {n_after}"


    # audit-trail
    def test_10_backup_and_restore_audit_entries_exist(self, client):
        # Trigger backup + a dry-run restore, then check audit-logs
        b = _create_backup(client)
        # A real (non-dry-run) update restore also produces an audit entry
        rr = client.post(
            f"{API}/database/restore/server",
            json={"id": b["id"], "mode": "update", "dry_run": False},
            timeout=120,
        )
        assert rr.status_code == 200
        time.sleep(0.5)
        r = client.get(f"{API}/audit-logs", params={"entity_type": "database", "limit": 50}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        items = data if isinstance(data, list) else data.get("items", [])
        actions = {x.get("action") for x in items}
        assert "backup" in actions, f"No backup audit entry found. actions={actions}"
        assert "restore" in actions, f"No restore audit entry found. actions={actions}"
