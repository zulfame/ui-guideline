"""Branding backend API tests: settings, assets, audit trail."""
import base64
import io
import os

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ui-rules.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# 1x1 transparent PNG
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    return s


# ---------- Branding settings ----------

class TestBrandingSettings:
    def test_get_defaults_no_theme_color(self, client):
        r = client.get(f"{API}/branding")
        assert r.status_code == 200
        data = r.json()
        assert "theme_color" not in data
        # required default keys
        for k in [
            "app_name", "tagline", "meta_description", "meta_keywords",
            "og_title", "og_description", "site_url", "canonical_url",
            "allow_indexing", "support_email", "copyright_text", "assets",
        ]:
            assert k in data, f"missing key {k}"
        # assets contains all 4 kinds
        for kind in ("logo_light", "logo_dark", "favicon", "og_image"):
            assert kind in data["assets"]

    def test_put_merges_fields(self, client):
        payload = {
            "app_name": "TEST_BPR Bangun Arta",
            "tagline": "TEST_tagline_value",
            "allow_indexing": False,
            "meta_description": "TEST desc",
        }
        r = client.put(f"{API}/branding", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["app_name"] == "TEST_BPR Bangun Arta"
        assert data["tagline"] == "TEST_tagline_value"
        assert data["allow_indexing"] is False
        assert data["meta_description"] == "TEST desc"
        assert "theme_color" not in data

    def test_put_persists_via_get(self, client):
        r = client.get(f"{API}/branding")
        assert r.status_code == 200
        data = r.json()
        assert data["app_name"] == "TEST_BPR Bangun Arta"
        assert data["allow_indexing"] is False

    def test_put_partial_does_not_wipe_others(self, client):
        r = client.put(f"{API}/branding", json={"copyright_text": "TEST_copy"})
        assert r.status_code == 200
        data = r.json()
        assert data["copyright_text"] == "TEST_copy"
        assert data["app_name"] == "TEST_BPR Bangun Arta"  # preserved
        assert data["allow_indexing"] is False  # preserved


# ---------- Branding assets (GridFS) ----------

class TestBrandingAssets:
    uploaded_urls = {}

    def test_upload_unknown_kind_404(self, client):
        r = client.post(
            f"{API}/branding/assets/not_a_kind",
            files={"file": ("t.png", io.BytesIO(PNG_BYTES), "image/png")},
        )
        assert r.status_code == 404

    def test_upload_non_image_400(self, client):
        r = client.post(
            f"{API}/branding/assets/logo_light",
            files={"file": ("t.txt", io.BytesIO(b"hello"), "text/plain")},
        )
        assert r.status_code == 400

    def test_upload_logo_light(self, client):
        r = client.post(
            f"{API}/branding/assets/logo_light",
            files={"file": ("logo.png", io.BytesIO(PNG_BYTES), "image/png")},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        asset = data["assets"]["logo_light"]
        assert asset is not None
        assert asset["url"].startswith("/api/branding/assets/")
        TestBrandingAssets.uploaded_urls["logo_light"] = asset["url"]

    def test_serve_uploaded_image(self, client):
        url = TestBrandingAssets.uploaded_urls.get("logo_light")
        assert url, "logo_light must be uploaded first"
        r = client.get(f"{BASE_URL}{url}")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")
        assert len(r.content) == len(PNG_BYTES)

    def test_upload_favicon_and_og(self, client):
        for kind in ("favicon", "og_image", "logo_dark"):
            r = client.post(
                f"{API}/branding/assets/{kind}",
                files={"file": (f"{kind}.png", io.BytesIO(PNG_BYTES), "image/png")},
            )
            assert r.status_code == 200
            assert r.json()["assets"][kind] is not None

    def test_delete_asset_resets_to_null(self, client):
        r = client.delete(f"{API}/branding/assets/logo_light")
        assert r.status_code == 200
        data = r.json()
        assert data["assets"]["logo_light"] is None

    def test_delete_unknown_kind_404(self, client):
        r = client.delete(f"{API}/branding/assets/bogus")
        assert r.status_code == 404


# ---------- Audit ----------

class TestBrandingAudit:
    def test_audit_entries_created(self, client):
        # NOTE: limit kept at 20 to avoid encountering pre-existing legacy audit
        # rows that leaked a Mongo ObjectId into the `request` field via
        # insert_one() mutation on first-time branding save (see report).
        r = client.get(f"{API}/audit-logs", params={"entity_type": "branding", "limit": 20})
        assert r.status_code == 200
        data = r.json()
        # Response may be list or dict-with-items
        items = data if isinstance(data, list) else data.get("items", data.get("data", []))
        assert isinstance(items, list)
        assert len(items) > 0, "expected at least one branding audit entry"
        # every entry must have entity_type=branding
        for it in items[:10]:
            assert it.get("entity_type") == "branding"


# ---------- Cleanup ----------

def teardown_module(module):
    s = requests.Session()
    # remove remaining assets (best-effort)
    for kind in ("logo_light", "logo_dark", "favicon", "og_image"):
        try:
            s.delete(f"{API}/branding/assets/{kind}", timeout=10)
        except Exception:
            pass
    # reset to sane defaults
    try:
        s.put(
            f"{API}/branding",
            json={
                "app_name": "Application Name",
                "tagline": "",
                "allow_indexing": True,
                "meta_description": "",
                "copyright_text": "",
            },
            timeout=10,
        )
    except Exception:
        pass
