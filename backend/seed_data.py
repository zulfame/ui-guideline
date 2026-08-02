"""Default seed for the CMS — a SNAPSHOT of the live master data.

Source of truth is `seed_snapshot.json` (generated from the configured
database): Levels, Roles, Offices, the Super Admin user, Broadcast channels,
Email templates and Branding config. Two entry points share it:

- CLI (`python seed_data.py`): resets the seeded collections and inserts the snapshot.
- App startup (server.py lifespan): auto-seeds ONLY when the DB is empty and the
  AUTO_SEED toggle is enabled — so fresh deployments come pre-filled.

Notes:
- Uses the SAME env config as the app (MONGO_URL, DB_NAME) — never hardcoded.
- Docs are inserted AS-IS (they already carry UUID `id`s + ISO timestamps), so
  all relations (role→level, user→role/office, …) stay intact.
- SECURITY: the snapshot includes Broadcast channel `config` (e.g. Telegram bot
  token, SMTP password). Treat `seed_snapshot.json` as sensitive — do NOT publish
  it to a public repository.
- Branding logo/favicon are binary (GridFS) and are NOT part of the snapshot;
  re-upload them from the Branding page on a fresh deployment.
"""
import os
import json
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

SNAPSHOT_PATH = ROOT_DIR / "seed_snapshot.json"

# Collections seeded from the snapshot, in insertion order (parents first).
SEED_COLLECTIONS = [
    "levels", "roles", "offices", "users",
    "broadcast_configs", "email_templates", "branding",
]


def load_seed_snapshot() -> dict:
    """Return {collection: [docs...]} from seed_snapshot.json (empty if missing)."""
    if not SNAPSHOT_PATH.exists():
        return {name: [] for name in SEED_COLLECTIONS}
    with open(SNAPSHOT_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return {name: list(data.get(name, [])) for name in SEED_COLLECTIONS}


def _cli_seed():
    """Standalone CLI: reset the seeded collections then insert the snapshot."""
    from pymongo import MongoClient

    client = MongoClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    snap = load_seed_snapshot()
    summary = {}
    for coll in SEED_COLLECTIONS:
        docs = snap.get(coll) or []
        db[coll].delete_many({})
        if docs:
            db[coll].insert_many([dict(d) for d in docs])
        summary[coll] = len(docs)
    print("Seeded from snapshot:", summary)
    client.close()


if __name__ == "__main__":
    _cli_seed()
