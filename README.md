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
| `ADMIN_EMAIL` | Optional | `admin@example.com` | Email of the admin account seeded on startup (idempotent). |
| `ADMIN_PASSWORD` | Optional | `admin123` | Password for the seeded admin account (stored bcrypt-hashed). |
| `LOCAL_STORAGE_DIR` | Optional | `/app/data` | Directory for any files that must persist to disk (created on startup). |
| `AUTO_SEED` | Optional | `true` | Seed sample Offices/Roles/Levels/Users when the DB is empty. |
| `PASSWORD_EXPIRY_DAYS` | Optional | `90` | Days before a user password expires. |
| `PASSWORD_HISTORY_LIMIT` | Optional | `3` | Number of previous passwords a user cannot reuse. |
| `DEFAULT_USER_PASSWORD` | Optional | `bpr2026` | Default password assigned to newly created / imported users. |
| `EMERGENT_LLM_KEY` | Optional | - | Reserved for optional future LLM features (currently unused). |

### Frontend (`frontend/.env`)

| Variable | Required/Optional | Default Value | Description |
| --- | --- | --- | --- |
| `REACT_APP_BACKEND_URL` | Required | - | Base URL of the backend API (frontend appends `/api`). |
| `WDS_SOCKET_PORT` | Optional | - | Dev-server websocket port (dev only). |
| `ENABLE_HEALTH_CHECK` | Optional | `false` | Dev-server health check toggle (dev only). |
| `DISABLE_ESLINT_PLUGIN` | Optional | `true` | Disables the CRA ESLint plugin so `yarn build` never fails on warnings. |

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
