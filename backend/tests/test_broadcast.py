"""Backend tests for Broadcast Channels Configuration feature."""
import os
import pytest
import requests
from pathlib import Path

def _load_backend_url():
    url = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if url:
        return url.rstrip("/")
    env_path = Path("/app/frontend/.env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not set")

BASE_URL = _load_backend_url()
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- GET list ------------------------------------------------------------
class TestBroadcastList:
    def test_list_returns_five_channels(self, client):
        r = client.get(f"{API}/broadcast/channels", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        keys = {c["key"] for c in data}
        assert keys == {"telegram", "discord", "slack", "webhook", "email"}
        for ch in data:
            for k in ("key", "label", "description", "fields", "config", "status"):
                assert k in ch, f"missing {k} in {ch['key']}"

    def test_secrets_blank_in_list(self, client):
        r = client.get(f"{API}/broadcast/channels", timeout=30)
        data = r.json()
        by = {c["key"]: c for c in data}
        # Telegram: bot_token secret must be blank + *_set flag present
        tg_cfg = by["telegram"]["config"]
        assert tg_cfg.get("bot_token") == ""
        assert "bot_token_set" in tg_cfg


# --- PUT save + merge behavior ------------------------------------------
class TestBroadcastSave:
    def test_put_telegram_saves_and_hides_secret(self, client):
        payload = {"config": {"bot_token": "FAKE:TOKEN123", "chat_id": "-100999", "message_thread_id": ""}}
        r = client.put(f"{API}/broadcast/channels/telegram", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "configured"
        assert data["config"]["bot_token"] == ""  # not echoed
        assert data["config"]["bot_token_set"] is True
        assert data["config"]["chat_id"] == "-100999"

    def test_put_missing_required_not_configured(self, client):
        # Discord requires webhook_url; save with blank first then clear stored
        # Reset by saving discord empty (no stored secret to keep)
        r = client.put(f"{API}/broadcast/channels/discord", json={"config": {"webhook_url": ""}}, timeout=30)
        assert r.status_code == 200
        # First real config
        r = client.put(f"{API}/broadcast/channels/discord",
                       json={"config": {"webhook_url": "https://discord.com/api/webhooks/FAKE/FAKE"}}, timeout=30)
        assert r.json()["status"] == "configured"

    def test_secret_merge_keeps_previous(self, client):
        # 1) save telegram fully
        client.put(f"{API}/broadcast/channels/telegram",
                   json={"config": {"bot_token": "SECRET_TOKEN_XYZ", "chat_id": "-100111"}}, timeout=30)
        # 2) PUT again with blank bot_token + new chat_id
        r = client.put(f"{API}/broadcast/channels/telegram",
                       json={"config": {"bot_token": "", "chat_id": "-100222"}}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        # status must remain configured because stored token was kept
        assert data["status"] == "configured"
        assert data["config"]["bot_token_set"] is True
        assert data["config"]["chat_id"] == "-100222"

    def test_unknown_channel_404(self, client):
        r = client.put(f"{API}/broadcast/channels/nope", json={"config": {}}, timeout=30)
        assert r.status_code == 404


# --- POST test (live-ping) ----------------------------------------------
class TestBroadcastTest:
    def test_test_telegram_bad_token(self, client):
        # ensure configured first
        client.put(f"{API}/broadcast/channels/telegram",
                   json={"config": {"bot_token": "111:INVALIDTOKEN", "chat_id": "-100"}}, timeout=30)
        r = client.post(f"{API}/broadcast/channels/telegram/test",
                        json={"config": {"bot_token": "111:INVALIDTOKEN", "chat_id": "-100"}}, timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is False
        assert "message" in body and body["message"]
        assert body["channel"]["status"] == "error"
        assert body["channel"]["last_error"]

    def test_test_email_unreachable_host(self, client):
        cfg = {
            "host": "smtp.invalid-domain-xyz-9999.test",
            "port": 587,
            "username": "u",
            "password": "p",
            "from_address": "a@b.co",
            "use_tls": False,
            "starttls": True,
        }
        client.put(f"{API}/broadcast/channels/email", json={"config": cfg}, timeout=30)
        r = client.post(f"{API}/broadcast/channels/email/test", json={"config": cfg}, timeout=90)
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is False
        assert body["channel"]["status"] == "error"

    def test_test_missing_required_returns_400(self, client):
        # Reset slack to blank
        client.put(f"{API}/broadcast/channels/slack", json={"config": {"webhook_url": ""}}, timeout=30)
        r = client.post(f"{API}/broadcast/channels/slack/test",
                        json={"config": {"webhook_url": ""}}, timeout=30)
        assert r.status_code == 400
        detail = r.json().get("detail", "")
        assert "fill" in detail.lower() or "required" in detail.lower()


# --- Audit redaction -----------------------------------------------------
class TestBroadcastAudit:
    def test_audit_entries_and_redaction(self, client):
        # Do a fresh configure + test to ensure recent entries
        client.put(f"{API}/broadcast/channels/webhook",
                   json={"config": {"url": "https://invalid.invalid/hook",
                                    "header_name": "X-Token",
                                    "header_value": "SUPERSECRET"}}, timeout=30)
        client.post(f"{API}/broadcast/channels/webhook/test",
                    json={"config": {"url": "https://invalid.invalid/hook",
                                     "header_name": "X-Token",
                                     "header_value": "SUPERSECRET"}}, timeout=60)
        r = client.get(f"{API}/audit-logs", params={"entity_type": "broadcast"}, timeout=30)
        assert r.status_code == 200
        payload = r.json()
        items = payload.get("items", []) if isinstance(payload, dict) else payload
        assert len(items) > 0
        actions = {i.get("action") for i in items}
        assert "configure" in actions
        assert "test" in actions
        # Check redaction of secrets in request payload
        blob = str(items)
        assert "SUPERSECRET" not in blob, "header_value leaked in audit logs"
        assert "«redacted»" in blob or "redacted" in blob
