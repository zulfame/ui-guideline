"""Shared pytest fixtures.

The backend now requires a Bearer token on /api routes (mutations require the
admin role). This autouse fixture logs in as the seeded admin once and injects
the Authorization header into every `requests` call (both Session-based tests
and plain `requests.get/post`, which internally use a Session).
"""
import os
from pathlib import Path

import pytest
import requests


def _base_url():
    b = os.environ.get("REACT_APP_BACKEND_URL")
    if not b:
        env_file = Path("/app/frontend/.env")
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if line.startswith("REACT_APP_BACKEND_URL="):
                    b = line.split("=", 1)[1].strip()
                    break
    return (b or "").rstrip("/")


@pytest.fixture(scope="session", autouse=True)
def _admin_auth():
    api = f"{_base_url()}/api"
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    resp = requests.post(
        f"{api}/auth/login",
        json={"identifier": admin_email, "password": admin_password},
        timeout=20,
    )
    resp.raise_for_status()
    token = resp.json()["token"]

    original = requests.sessions.Session.request

    def patched(self, method, url, **kwargs):
        headers = dict(kwargs.get("headers") or {})
        has_auth = any(k.lower() == "authorization" for k in headers)
        if not has_auth:
            headers["Authorization"] = f"Bearer {token}"
            kwargs["headers"] = headers
        return original(self, method, url, **kwargs)

    requests.sessions.Session.request = patched
    yield token
    requests.sessions.Session.request = original
