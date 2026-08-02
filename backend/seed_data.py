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
- Branding logo/favicon/og-image are stored as base64 in the snapshot
  (`branding_assets`) and recreated in GridFS with their original ids on seed, so
  a fresh deployment is branded without any manual re-upload.
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


def load_branding_assets() -> list:
    """Return [{kind, file_id, filename, content_type, length, data_b64}, ...]."""
    if not SNAPSHOT_PATH.exists():
        return []
    with open(SNAPSHOT_PATH, encoding="utf-8") as f:
        return list(json.load(f).get("branding_assets", []))


def _cli_seed():
    """Standalone CLI: reset the seeded collections then insert the snapshot."""
    import base64
    import io
    from bson import ObjectId
    from gridfs import GridFSBucket
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

    # Recreate branding GridFS assets with their original ids (so branding refs resolve).
    assets = load_branding_assets()
    db["branding_assets.files"].delete_many({})
    db["branding_assets.chunks"].delete_many({})
    bucket = GridFSBucket(db, bucket_name="branding_assets")
    for a in assets:
        data = base64.b64decode(a["data_b64"])
        bucket.upload_from_stream_with_id(
            ObjectId(a["file_id"]),
            a.get("filename") or a.get("kind"),
            io.BytesIO(data),
            metadata={"kind": a.get("kind"), "content_type": a.get("content_type")},
        )
    summary["branding_assets"] = len(assets)
    print("Seeded from snapshot:", summary)
    client.close()


if __name__ == "__main__":
    _cli_seed()
