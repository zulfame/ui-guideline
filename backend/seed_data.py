"""Seed sample data for the CMS (Offices, Levels, Roles).

Two entry points share ONE source of truth (`build_documents()`):
- CLI (`python seed_data.py`): resets the collections and inserts the sample set.
- App startup (server.py lifespan): auto-seeds ONLY when the DB is empty and the
  AUTO_SEED toggle is enabled — so fresh deployments come pre-filled with examples.

Notes:
- Uses the SAME env config as the app (MONGO_URL, DB_NAME) — never hardcoded.
- Identities are UUID strings; timestamps are ISO-8601 UTC (matches server.py).
- Level `color` is user-facing swimlane data (hex), not a design token.
"""
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- Levels (swimlanes) -----------------------------------------------------
LEVELS = [
    {"name": "Executive", "order": 1, "color": "#111827"},
    {"name": "Management", "order": 2, "color": "#2563eb"},
    {"name": "Lead", "order": 3, "color": "#0891b2"},
    {"name": "Staff", "order": 4, "color": "#64748b"},
]

# --- Roles (hierarchy) — (name, level, parent, order, dotted_parent) --------
ROLES = [
    ("Chief Executive Officer", "Executive", None, 0, None),
    ("Chief Technology Officer", "Management", "Chief Executive Officer", 0, None),
    ("Chief Financial Officer", "Management", "Chief Executive Officer", 1, None),
    ("Chief Operating Officer", "Management", "Chief Executive Officer", 2, None),
    ("Engineering Manager", "Lead", "Chief Technology Officer", 0, None),
    ("QA Lead", "Lead", "Chief Technology Officer", 1, None),
    ("Senior Engineer", "Staff", "Engineering Manager", 0, None),
    ("Engineer", "Staff", "Engineering Manager", 1, None),
    ("QA Engineer", "Staff", "QA Lead", 0, "Senior Engineer"),
    ("Accountant", "Staff", "Chief Financial Officer", 0, "Chief Operating Officer"),
    ("Operations Lead", "Lead", "Chief Operating Officer", 0, None),
    ("Operations Staff", "Staff", "Operations Lead", 0, None),
]

# --- Offices ----------------------------------------------------------------
OFFICES = [
    {"code": "HQ", "name": "Head Office", "address": "Jl. Jenderal Sudirman No. 1, Jakarta",
     "telephone": "+62 21 5000 000", "latitude": -6.2088, "longitude": 106.8456, "radius": 150,
     "note": "Primary headquarters"},
    {"code": "BR-JKT", "name": "Jakarta Branch", "address": "Jl. Gatot Subroto No. 12, Jakarta",
     "telephone": "+62 21 5000 111", "latitude": -6.2350, "longitude": 106.8000, "radius": 100},
    {"code": "BR-BDG", "name": "Bandung Branch", "address": "Jl. Asia Afrika No. 8, Bandung",
     "telephone": "+62 22 4200 222", "latitude": -6.9175, "longitude": 107.6191, "radius": 100},
    {"code": "BR-SBY", "name": "Surabaya Branch", "address": "Jl. Tunjungan No. 5, Surabaya",
     "telephone": "+62 31 5300 333", "latitude": -7.2575, "longitude": 112.7521, "radius": 120},
]


def build_documents():
    """Build ready-to-insert docs (with UUID ids + ISO timestamps).

    Returns (level_docs, role_docs, office_docs). Parent/level references are
    resolved by pre-generating role ids so the hierarchy is valid on insert.
    """
    ts = _now_iso()

    level_id = {}
    level_docs = []
    for lvl in LEVELS:
        lid = str(uuid.uuid4())
        level_id[lvl["name"]] = lid
        level_docs.append({"id": lid, **lvl, "created_at": ts, "updated_at": ts})

    role_id = {name: str(uuid.uuid4()) for (name, *_rest) in ROLES}
    role_docs = []
    for name, level, parent, order, dotted in ROLES:
        role_docs.append({
            "id": role_id[name],
            "name": name,
            "parent_id": role_id.get(parent) if parent else None,
            "dotted_parent_id": role_id.get(dotted) if dotted else None,
            "level_id": level_id.get(level),
            "order": order,
            "created_at": ts,
            "updated_at": ts,
        })

    office_docs = [
        {"id": str(uuid.uuid4()), **o, "created_at": ts, "updated_at": ts} for o in OFFICES
    ]
    return level_docs, role_docs, office_docs


def _cli_seed():
    """Standalone CLI: reset the collections then insert the sample set."""
    from pymongo import MongoClient

    client = MongoClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    levels, roles, offices = build_documents()
    db.roles.delete_many({})
    db.levels.delete_many({})
    db.offices.delete_many({})
    db.levels.insert_many(levels)
    db.roles.insert_many(roles)
    db.offices.insert_many(offices)
    print(f"Seeded: {len(levels)} levels, {len(roles)} roles, {len(offices)} offices.")
    client.close()


if __name__ == "__main__":
    _cli_seed()
