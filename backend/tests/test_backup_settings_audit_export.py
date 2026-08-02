"""Backend tests for the new features:
- Backup settings (GET/PUT), S3 test endpoint, secret write-only semantics.
- POST backup includes s3_key field and enforces retention.
- DELETE /database/backups/{id} (200 / 404).
- GET /audit-logs/export?format=csv|xlsx returns proper content-types.
- POST /audit-logs/purge validation and behavior.
"""
import io
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
import requests

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
    return requests.Session()


# ---------------------------------------------------------------- backup settings
class TestBackupSettings:
    def test_get_settings_defaults_and_secret_blanked(self, client):
        r = client.get(f"{API}/database/settings", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        # write-only secret
        assert data.get("s3_secret_access_key") == ""
        assert "s3_secret_access_key_set" in data
        assert isinstance(data["s3_secret_access_key_set"], bool)
        # defaults exposed
        assert "retention_count" in data
        assert data["retention_count"] >= 1
        assert "schedule_enabled" in data
        assert "schedule_interval" in data

    def test_put_settings_updates_retention_and_schedule(self, client):
        # Read current retention so we can restore later
        prev = client.get(f"{API}/database/settings", timeout=15).json()
        try:
            r = client.put(
                f"{API}/database/settings",
                json={
                    "retention_count": 5,
                    "schedule_enabled": True,
                    "schedule_interval": "daily",
                    "schedule_time": "03:30",
                },
                timeout=15,
            )
            assert r.status_code == 200, r.text
            d = r.json()
            assert d["retention_count"] == 5
            assert d["schedule_enabled"] is True
            assert d["schedule_interval"] == "daily"
            assert d["schedule_time"] == "03:30"
            # next_run_at should be computed when enabled
            assert d.get("next_run_at")
            # Persist verified via GET
            gg = client.get(f"{API}/database/settings", timeout=15).json()
            assert gg["retention_count"] == 5
            assert gg["schedule_time"] == "03:30"
        finally:
            # Restore previous values AND disable schedule (agent-to-agent context)
            client.put(
                f"{API}/database/settings",
                json={
                    "retention_count": prev.get("retention_count", 7),
                    "schedule_enabled": False,
                    "schedule_interval": prev.get("schedule_interval", "daily"),
                    "schedule_time": prev.get("schedule_time", "02:00"),
                },
                timeout=15,
            )

    def test_put_settings_invalid_interval_400(self, client):
        r = client.put(
            f"{API}/database/settings",
            json={"schedule_interval": "yearly"},
            timeout=15,
        )
        assert r.status_code == 400, r.text

    def test_put_settings_empty_secret_keeps_stored(self, client):
        # Set a fake secret, then send empty - it should keep prior value
        r1 = client.put(
            f"{API}/database/settings",
            json={
                "s3_access_key_id": "TEST_AKIA",
                "s3_secret_access_key": "TEST_SECRET_KEEP",
                "s3_bucket": "test-bucket",
            },
            timeout=15,
        )
        assert r1.status_code == 200
        assert r1.json().get("s3_secret_access_key_set") is True

        # Now send empty string for the secret - must retain
        r2 = client.put(
            f"{API}/database/settings",
            json={"s3_secret_access_key": ""},
            timeout=15,
        )
        assert r2.status_code == 200
        assert r2.json().get("s3_secret_access_key_set") is True

        # Clean up test data
        client.put(
            f"{API}/database/settings",
            json={
                "s3_access_key_id": "",
                "s3_bucket": "",
                "s3_enabled": False,
            },
            timeout=15,
        )


# ---------------------------------------------------------------- s3 test endpoint
class TestS3Test:
    def test_s3_test_no_credentials_returns_ok_false(self, client):
        # Ensure no s3 creds are configured
        client.put(
            f"{API}/database/settings",
            json={"s3_access_key_id": "", "s3_bucket": "", "s3_enabled": False},
            timeout=15,
        )
        r = client.post(
            f"{API}/database/s3/test",
            json={"s3_bucket": "", "s3_access_key_id": "", "s3_secret_access_key": ""},
            timeout=15,
        )
        # Should not crash - returns 200 with ok:false
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is False
        assert "error" in data


# ---------------------------------------------------------------- backups: create/list/delete
class TestBackupCreateListDelete:
    def test_backup_response_has_s3_key(self, client):
        r = client.post(f"{API}/database/backup", timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data
        # s3_key should be present in response (null since no S3 configured)
        assert "s3_key" in data
        assert data["s3_key"] is None

    def test_list_includes_s3_key_field(self, client):
        r = client.get(f"{API}/database/backups", timeout=15)
        assert r.status_code == 200
        lst = r.json()
        assert isinstance(lst, list)
        assert len(lst) > 0
        for item in lst[:5]:
            assert "s3_key" in item

    def test_retention_enforced_after_backup(self, client):
        # Set retention_count small then create backups, list must not exceed
        client.put(
            f"{API}/database/settings",
            json={"retention_count": 3, "schedule_enabled": False},
            timeout=15,
        )
        try:
            # Create at least 2 backups to trigger retention
            for _ in range(2):
                r = client.post(f"{API}/database/backup", timeout=60)
                assert r.status_code == 200
            lst = client.get(f"{API}/database/backups", timeout=15).json()
            assert len(lst) <= 3, f"Retention not enforced. count={len(lst)}"
        finally:
            client.put(
                f"{API}/database/settings",
                json={"retention_count": 7, "schedule_enabled": False},
                timeout=15,
            )

    def test_delete_backup_success_and_404(self, client):
        # Create backup, delete, expect 200
        r = client.post(f"{API}/database/backup", timeout=60)
        assert r.status_code == 200
        bid = r.json()["id"]
        d = client.delete(f"{API}/database/backups/{bid}", timeout=15)
        assert d.status_code == 200
        assert d.json().get("success") is True
        # Deleting again → 404
        d2 = client.delete(f"{API}/database/backups/{bid}", timeout=15)
        assert d2.status_code == 404
        # Bogus id → 404
        d3 = client.delete(f"{API}/database/backups/notanid", timeout=15)
        assert d3.status_code == 404

    def test_backup_audit_entry_exists(self, client):
        # trigger a backup, then check audit
        client.post(f"{API}/database/backup", timeout=60)
        r = client.get(
            f"{API}/audit-logs",
            params={"entity_type": "database", "action": "backup", "limit": 5},
            timeout=15,
        )
        assert r.status_code == 200
        data = r.json()
        items = data if isinstance(data, list) else data.get("items", [])
        assert len(items) >= 1
        assert items[0].get("action") == "backup"


# ---------------------------------------------------------------- audit export
class TestAuditExport:
    def test_export_csv(self, client):
        r = client.get(f"{API}/audit-logs/export", params={"format": "csv"}, timeout=30)
        assert r.status_code == 200, r.text
        ct = r.headers.get("content-type", "")
        assert "text/csv" in ct.lower(), ct
        cd = r.headers.get("content-disposition", "")
        assert "attachment" in cd.lower() and ".csv" in cd.lower()
        # First line is header
        text = r.content.decode("utf-8-sig")
        first_line = text.splitlines()[0]
        assert "Created At" in first_line

    def test_export_xlsx(self, client):
        r = client.get(f"{API}/audit-logs/export", params={"format": "xlsx"}, timeout=30)
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "spreadsheetml" in ct.lower(), ct
        assert r.content[:2] == b"PK"  # xlsx zip signature

    def test_export_honors_filters(self, client):
        # Filter by q that likely returns 0 results
        r = client.get(
            f"{API}/audit-logs/export",
            params={"format": "csv", "q": "ZZZ_NO_MATCH_XYZ_UNLIKELY_STRING"},
            timeout=30,
        )
        assert r.status_code == 200
        text = r.content.decode("utf-8-sig").strip().splitlines()
        # header only, no data rows
        assert len(text) == 1


# ---------------------------------------------------------------- audit purge
class TestAuditPurge:
    def test_purge_requires_bounds(self, client):
        r = client.post(f"{API}/audit-logs/purge", json={}, timeout=15)
        assert r.status_code == 400

    def test_purge_with_bounds_records_audit(self, client):
        # Use a date range in the far past so we delete little or nothing
        far_past_from = "1990-01-01"
        far_past_to = "1990-12-31"
        r = client.post(
            f"{API}/audit-logs/purge",
            json={"date_from": far_past_from, "date_to": far_past_to},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert "deleted" in data
        # A new purge audit entry should exist
        r2 = client.get(
            f"{API}/audit-logs",
            params={"entity_type": "audit", "action": "purge", "limit": 5},
            timeout=15,
        )
        assert r2.status_code == 200
        items = r2.json() if isinstance(r2.json(), list) else r2.json().get("items", [])
        assert len(items) >= 1
        assert items[0].get("action") == "purge"
