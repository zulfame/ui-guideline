# UI Guidelines CMS

Full-stack enterprise CMS template — **React** (frontend) + **FastAPI** (backend) + **MongoDB**.
Modules: Users, Roles, Offices, Levels, Audit Log, Database Backup/Restore (GridFS),
Broadcast channels, Branding, dynamic Sitemap/Robots, plus an in-app Design System & Dev Guidelines.

## Project Structure

```
.
├── backend/          # FastAPI app — entrypoint: server:app (uvicorn server:app --host 0.0.0.0 --port 8001)
│   ├── server.py     # All API routes, prefixed with /api
│   ├── seed_data.py  # Sample data seeder (shared by CLI + startup auto-seed)
│   └── requirements.txt
└── frontend/         # React (CRA) — build with: yarn build
    └── src/
```

- **Backend entrypoint:** `server:app` (run from `backend/`).
- **All API routes are prefixed with `/api`** (Kubernetes/ingress friendly).
- **Frontend** talks to the backend exclusively via `REACT_APP_BACKEND_URL` (+ `/api`).
- Uploaded assets and DB backups persist in **MongoDB GridFS** (no host disk required).

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required/Optional | Default Value | Description |
| --- | --- | --- | --- |
| `MONGO_URL` | Required | - | MongoDB connection string (e.g. `mongodb://localhost:27017`). |
| `DB_NAME` | Required | - | MongoDB database name. |
| `CORS_ORIGINS` | Optional | `*` | Comma-separated list of allowed CORS origins. `*` disables credentials. |
| `JWT_SECRET` | Optional | `dev-insecure-jwt-secret-change-me` | Secret used to sign JWT tokens. **Set a strong value in production.** |
| `JWT_EXPIRY_HOURS` | Optional | `12` | Access-token lifetime in hours. |
| `LOGIN_MAX_ATTEMPTS` | Optional | `5` | Failed login attempts (per IP+identifier) before a temporary lockout. |
| `LOGIN_LOCKOUT_MINUTES` | Optional | `15` | Lockout duration (minutes) after too many failed logins. |
| `APIKEY_RATE_LIMIT` | Optional | `60` | Max requests per API key within the rate window. |
| `APIKEY_RATE_WINDOW_SECONDS` | Optional | `60` | Length of the API-key rate-limit window, in seconds. |
| `MAX_REQUEST_BYTES` | Optional | `2097152` | Max JSON request body size in bytes (2 MB); larger JSON bodies get `413`. Multipart uploads are exempt (guarded per-endpoint). |
| `IDEMPOTENCY_TTL_SECONDS` | Optional | `86400` | Replay window (seconds) for stored `Idempotency-Key` responses before they expire (24 h). |
| `ADMIN_EMAIL` | Optional | `admin@example.com` | Email of the admin account seeded on startup (idempotent). |
| `ADMIN_PASSWORD` | Optional | `admin123` | Password for the seeded admin account (stored bcrypt-hashed). |
| `LOCAL_STORAGE_DIR` | Optional | `/app/data` | Directory for any files that must persist to disk (created on startup). |
| `AUTO_SEED` | Optional | `true` | Seed sample Offices/Roles/Levels/Users when the DB is empty. |
| `PASSWORD_EXPIRY_DAYS` | Optional | `90` | Days before a user password expires. |
| `PASSWORD_HISTORY_LIMIT` | Optional | `3` | Number of previous passwords a user cannot reuse. |
| `DEFAULT_USER_PASSWORD` | Optional | `bpr2026` | Default password assigned to newly created / imported users. |
| `PASSWORD_RESET_TOKEN_MINUTES` | Optional | `30` | Lifetime (minutes) of a self-service password-reset link. |
| `EMERGENT_LLM_KEY` | Optional | - | Reserved for optional future LLM features (currently unused). |

### Frontend (`frontend/.env`)

| Variable | Required/Optional | Default Value | Description |
| --- | --- | --- | --- |
| `REACT_APP_BACKEND_URL` | Required | - | Base URL of the backend API (frontend appends `/api`). |
| `WDS_SOCKET_PORT` | Optional | - | Dev-server websocket port (dev only). |
| `ENABLE_HEALTH_CHECK` | Optional | `false` | Dev-server health check toggle (dev only). |
| `DISABLE_ESLINT_PLUGIN` | Optional | `true` | Disables the CRA ESLint plugin so `yarn build` never fails on warnings. |

## Nexus Panel Deployment (backend `.env`)

Ready-to-paste backend environment for the Nexus Panel deployment. `MONGO_URL`,
`DB_NAME` and `CORS_ORIGINS` are provided/managed by the panel — set the rest as
below. Values shown are the recommended defaults with this project's admin.

```env
# --- Required (set by panel / your infra) ---
MONGO_URL=mongodb://localhost:27017
DB_NAME=auth-service_db
CORS_ORIGINS=*

# --- Auth / seeding ---
JWT_SECRET=010cc419ec7423715c849d4dc6211f62636de378154fd672ef3b7b91a20c1b578cd5d12bb320b5cded21bc6e56963bbb
JWT_EXPIRY_HOURS=12
ADMIN_EMAIL=sa@bprbangunarta.co.id
ADMIN_PASSWORD=SA@4dm1n
AUTO_SEED=true
DEFAULT_USER_PASSWORD=bpr2026
PASSWORD_EXPIRY_DAYS=90
PASSWORD_HISTORY_LIMIT=3
PASSWORD_RESET_TOKEN_MINUTES=30

# --- Security / limits ---
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
APIKEY_RATE_LIMIT=60
APIKEY_RATE_WINDOW_SECONDS=60
IDEMPOTENCY_TTL_SECONDS=86400
MAX_REQUEST_BYTES=2097152

# --- Storage ---
LOCAL_STORAGE_DIR=/app/data
```

> **Note:** `ADMIN_EMAIL`/`ADMIN_PASSWORD` must match your intended admin
> (`sa@bprbangunarta.co.id` / `SA@4dm1n`). On every startup the app re-syncs the
> admin from these values; if they point to a non-existent email it will create a
> fresh admin with default credentials. Set `AUTO_SEED=false` if you deploy onto
> an empty DB and immediately restore from a backup (so sample data is not seeded
> before your restore).

## Running Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001

# Frontend
cd frontend
yarn install
yarn start        # dev
yarn build        # production build
```

On startup the backend ensures indexes, seeds an admin account from
`ADMIN_EMAIL`/`ADMIN_PASSWORD`, and (when `AUTO_SEED=true` and the DB is empty)
inserts sample master data.
