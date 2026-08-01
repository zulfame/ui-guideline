"""Backend tests for audit-log server-side sorting (sort_by/sort_dir)."""
import os
import time
from pathlib import Path

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break
API = f"{BASE_URL.rstrip('/')}/api"
TS = str(int(time.time()))
PREFIX = f"SORT_TEST_{TS}_"


@pytest.fixture(scope="module")
def sess():
    s = requests.Session()
    yield s
    s.close()


@pytest.fixture(scope="module", autouse=True)
def seed(sess):
    """Generate a few audit rows via office CRUD so we have material to sort."""
    created = []
    for i in range(3):
        r = sess.post(f"{API}/offices",
                      json={"code": f"{PREFIX}O{i}", "name": f"{PREFIX}Office {i}"}, timeout=15)
        if r.status_code == 201:
            created.append(r.json()["id"])
            time.sleep(0.05)
    for oid in created:
        sess.put(f"{API}/offices/{oid}", json={"name": f"{PREFIX}Office X {oid[:4]}"}, timeout=15)
    yield
    if created:
        sess.post(f"{API}/offices/bulk-delete", json={"ids": created}, timeout=20)


def _is_sorted(values, direction):
    coerced = [("" if v is None else v) for v in values]
    return coerced == sorted(coerced, reverse=(direction == "desc"),
                             key=lambda x: str(x).lower())


@pytest.mark.parametrize("field", ["created_at", "actor", "action", "entity_type", "summary"])
@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_sort_by_valid_fields(sess, field, direction):
    r = sess.get(f"{API}/audit-logs",
                 params={"sort_by": field, "sort_dir": direction, "limit": 50}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    values = [d.get(field) for d in data]
    # created_at values are ISO strings - lexicographic order matches chronological
    assert _is_sorted(values, direction), \
        f"Not sorted by {field} {direction}: sample={values[:5]}"


def test_invalid_sort_by_falls_back_to_created_at(sess):
    r = sess.get(f"{API}/audit-logs",
                 params={"sort_by": "nonexistent_field", "sort_dir": "desc", "limit": 10},
                 timeout=15)
    assert r.status_code == 200
    data = r.json()
    if len(data) >= 2:
        # Newest-first when fallback applies
        assert data[0]["created_at"] >= data[1]["created_at"]


def test_x_total_count_unchanged_across_sort(sess):
    r1 = sess.get(f"{API}/audit-logs",
                  params={"sort_by": "created_at", "sort_dir": "desc", "limit": 1}, timeout=15)
    r2 = sess.get(f"{API}/audit-logs",
                  params={"sort_by": "actor", "sort_dir": "asc", "limit": 1}, timeout=15)
    r3 = sess.get(f"{API}/audit-logs", params={"limit": 1}, timeout=15)
    assert r1.headers["X-Total-Count"] == r2.headers["X-Total-Count"] == r3.headers["X-Total-Count"]


def test_sort_is_global_not_per_page(sess):
    """First page's max asc value must be <= second page's min asc value."""
    r1 = sess.get(f"{API}/audit-logs",
                  params={"sort_by": "created_at", "sort_dir": "asc",
                          "limit": 5, "skip": 0}, timeout=15)
    r2 = sess.get(f"{API}/audit-logs",
                  params={"sort_by": "created_at", "sort_dir": "asc",
                          "limit": 5, "skip": 5}, timeout=15)
    d1 = r1.json()
    d2 = r2.json()
    if len(d1) == 5 and len(d2) >= 1:
        assert d1[-1]["created_at"] <= d2[0]["created_at"]


def test_sort_combined_with_filter(sess):
    r = sess.get(f"{API}/audit-logs",
                 params={"entity_type": "office", "sort_by": "action",
                         "sort_dir": "asc", "limit": 20}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    for row in data:
        assert row["entity_type"] == "office"
    actions = [d["action"] for d in data]
    assert _is_sorted(actions, "asc")


def test_sort_combined_with_q_and_date_filter(sess):
    r = sess.get(f"{API}/audit-logs",
                 params={"q": PREFIX, "date_from": "2026-01-01",
                         "sort_by": "summary", "sort_dir": "desc", "limit": 20}, timeout=15)
    assert r.status_code == 200
    data = r.json()
    summaries = [d.get("summary", "") for d in data]
    assert _is_sorted(summaries, "desc")
