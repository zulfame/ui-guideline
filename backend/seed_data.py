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
from datetime import datetime, timezone, timedelta
from pathlib import Path

import bcrypt
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


# --- Users — (name, email, username, role_name, office_code, alias, mso, collector) ---
DEFAULT_USER_PASSWORD = os.environ.get("DEFAULT_USER_PASSWORD", "bpr2026")
PASSWORD_EXPIRY_DAYS = int(os.environ.get("PASSWORD_EXPIRY_DAYS", "90"))
USERS = [
    ("Andi Wijaya", "andi@bpr.co.id", "andi", "Chief Executive Officer", "HQ", "AW", "MSO001", "COL001"),
    ("Budi Santoso", "budi@bpr.co.id", "budi", "Operations Staff", "BR-JKT", "BS", "MSO002", "COL002"),
    ("Citra Lestari", "citra@bpr.co.id", "citra", "Accountant", "BR-BDG", "CL", "MSO003", "COL003"),
]


def build_documents():
    """Build ready-to-insert docs (with UUID ids + ISO timestamps).

    Returns (level_docs, role_docs, office_docs, user_docs). Parent/level/role/
    office references are resolved by pre-generating ids so relations are valid.
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

    office_id = {}
    office_docs = []
    for o in OFFICES:
        oid = str(uuid.uuid4())
        office_id[o["code"]] = oid
        office_docs.append({"id": oid, **o, "created_at": ts, "updated_at": ts})

    pw_hash = bcrypt.hashpw(DEFAULT_USER_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    expires = (datetime.now(timezone.utc) + timedelta(days=PASSWORD_EXPIRY_DAYS)).isoformat()
    user_docs = []
    for name, email, username, role_name, office_code, alias, mso, collector in USERS:
        user_docs.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "email": email,
            "username": username,
            "phone": None,
            "role_id": role_id.get(role_name),
            "office_id": office_id.get(office_code),
            "alias": alias,
            "mso_code": mso,
            "collector_code": collector,
            "device_identifier": None,
            "device_name": None,
            "device_os": None,
            "fcm_token": None,
            "password": pw_hash,
            "password_history": [pw_hash],
            "password_changed_at": ts,
            "password_expires_at": expires,
            "must_change_password": True,
            "deleted_at": None,
            "created_at": ts,
            "updated_at": ts,
        })

    return level_docs, role_docs, office_docs, user_docs


def _cli_seed():
    """Standalone CLI: reset the collections then insert the sample set."""
    from pymongo import MongoClient

    client = MongoClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    levels, roles, offices, users = build_documents()
    db.users.delete_many({})
    db.roles.delete_many({})
    db.levels.delete_many({})
    db.offices.delete_many({})
    db.levels.insert_many(levels)
    db.roles.insert_many(roles)
    db.offices.insert_many(offices)
    db.users.insert_many(users)
    print(f"Seeded: {len(levels)} levels, {len(roles)} roles, {len(offices)} offices, {len(users)} users.")
    client.close()


if __name__ == "__main__":
    _cli_seed()
