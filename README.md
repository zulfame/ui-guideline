# UI Guidelines CMS

Full-stack enterprise CMS template — **React** (frontend) + **FastAPI** (backend) + **MongoDB**.
Modules: Users, Roles, Offices, Levels, Audit Log, Database Backup/Restore (GridFS),
Broadcast channels, Branding, dynamic Sitemap/Robots, API Clients (API keys),
Mobile/External Auth API (JWT + credential verification + user create/update/deactivate),
Push Notifications (Firebase FCM), Active Sessions (admin) & self-service My Devices,
plus an in-app Design System & Dev Guidelines.

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
| `JWT_SECRET` | **Required** | - | Secret used to sign JWT tokens. **No default — the app fails to start if unset.** Use a strong 64-char random hex value. |
| `JWT_EXPIRY_HOURS` | Optional | `12` | Access-token lifetime in hours. |
| `LOGIN_MAX_ATTEMPTS` | Optional | `5` | Failed login attempts (per IP+identifier) before a temporary lockout. |
| `LOGIN_LOCKOUT_MINUTES` | Optional | `15` | Lockout duration (minutes) after too many failed logins. |
| `APIKEY_RATE_LIMIT` | Optional | `60` | Max requests per API key within the rate window. |
| `APIKEY_RATE_WINDOW_SECONDS` | Optional | `60` | Length of the API-key rate-limit window, in seconds. |
| `MAX_REQUEST_BYTES` | Optional | `2097152` | Max JSON request body size in bytes (2 MB); larger JSON bodies get `413`. Multipart uploads are exempt (guarded per-endpoint). |
| `IDEMPOTENCY_TTL_SECONDS` | Optional | `86400` | Replay window (seconds) for stored `Idempotency-Key` responses before they expire (24 h). |
| `ADMIN_EMAIL` | Optional | `admin@example.com` | Email of the admin account seeded on startup (idempotent). |
| `ADMIN_PASSWORD` | **Required** | - | Password for the seeded admin account (stored bcrypt-hashed). **No default — the app fails to start if unset.** |
| `LOCAL_STORAGE_DIR` | Optional | `/app/data` | Directory for any files that must persist to disk (created on startup). |
| `AUTO_SEED` | Optional | `true` | Seed sample Offices/Roles/Levels/Users when the DB is empty. |
| `PASSWORD_EXPIRY_DAYS` | Optional | `90` | Days before a user password expires. |
| `PASSWORD_HISTORY_LIMIT` | Optional | `3` | Number of previous passwords a user cannot reuse. |
| `DEFAULT_USER_PASSWORD` | Optional | `bpr2026` | Default password assigned to newly created / imported users. |
| `PASSWORD_RESET_TOKEN_MINUTES` | Optional | `30` | Lifetime (minutes) of a self-service password-reset link. |
| `FORGOT_PASSWORD_MAX` | Optional | `5` | Max forgot-password requests per IP and per email within the window (extra requests are silently ignored to prevent reset-email flooding). |
| `FORGOT_PASSWORD_WINDOW_MINUTES` | Optional | `60` | Length (minutes) of the forgot-password rate-limit window. |
| `MOBILE_JWT_EXPIRY_SECONDS` | Optional | `3600` | Access-token lifetime (seconds) for the mobile `/api/jwt-auth` flow. |
| `MOBILE_JWT_REFRESH_DAYS` | Optional | `30` | How long a mobile session can be refreshed before requiring a fresh login. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Optional | - | Firebase service-account **JSON string** for FCM push. Leave blank to disable push (endpoints report `configured:false`). |
| `FIREBASE_SERVICE_ACCOUNT_FILE` | Optional | - | Alternative to the above: filesystem **path** to the service-account JSON file. |
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

# --- Mobile / External API ---
MOBILE_JWT_EXPIRY_SECONDS=3600
MOBILE_JWT_REFRESH_DAYS=30

# --- Push notifications (Firebase FCM) — leave blank to disable ---
FIREBASE_SERVICE_ACCOUNT_JSON=
FIREBASE_SERVICE_ACCOUNT_FILE=
```

> **Note:** `ADMIN_EMAIL`/`ADMIN_PASSWORD` must match your intended admin
> (`sa@bprbangunarta.co.id` / `SA@4dm1n`). On every startup the app re-syncs the
> admin from these values; if they point to a non-existent email it will create a
> fresh admin with default credentials. Set `AUTO_SEED=false` if you deploy onto
> an empty DB and immediately restore from a backup (so sample data is not seeded
> before your restore).

## External / Mobile API

Endpoints for mobile apps and third-party integrators. Errors use the unified
envelope `{"success": false, "message": "..."}`; successes use
`{"success": true, "data": {...}}`. The internal admin panel keeps its own
`{"detail": ...}` format. All example requests are also shown (with copy buttons)
inside the app on **System → … → Clients → API Documentation**.

| Method & Path | Auth | Purpose |
| --- | --- | --- |
| `POST /api/jwt-auth` | Public | Mobile login. Verifies credentials and **binds the account to a single device**. Returns `{token_type, expires_in, access_token}`. `username` may be email, username, or phone. |
| `GET /api/jwt-me` | Bearer token | Returns the current user's `{user, office, device}` profile. |
| `POST /api/jwt-refresh` | Bearer token | Issues a fresh access token (accepts an expired-but-valid token within `MOBILE_JWT_REFRESH_DAYS`). |
| `POST /api/jwt-logout` | Bearer token | Ends the session, **unbinds the device**, and **revokes the token server-side**. |
| `POST /api/user-auth` | `X-API-Key` | Verifies a credential is correct (no device binding). Returns the same profile as `/api/jwt-me`. |
| `POST /api/user-password` | `X-API-Key` | Changes a user password. Locate the user by `email`; body `current_password` + `password` + `confirmed_password`; enforces the no-reuse history policy. |
| `POST /api/user-create` | `X-API-Key` | Creates a user. `email` required and unique; `role` required and `office` optional — both use the human-readable **name** (same as the Excel import), not a UUID; `password` optional (defaults to the system password, user must change on first login). Returns the created profile. |
| `POST /api/user-update` | `X-API-Key` | Updates a user located by `email`. Send only fields to change (empty/null leaves a field unchanged); `role`/`office` use the human-readable name, `username` changes the username, `id` sets the numeric user_id. To toggle status use `/api/user-deactivate`. |
| `POST /api/user-deactivate` | `X-API-Key` | Locate the user by `email` and deactivate (`active:false`, default) or reactivate (`active:true`). Deactivated users cannot log in and existing tokens are rejected. |

Admins can also manage the single-device binding and send push notifications:

- **Unbind device** and **Activate/Deactivate** are row actions on the Users page.
- **Push Notifications** (System → Notification): broadcast to all active users with
  a registered `fcm_token`. Requires a Firebase service account (see env vars);
  until configured, sending is disabled and the endpoint returns `400`.
  Per-user push is available from the Users row actions (`POST /api/notifications/user/{id}`).

## Auth Security

The web and mobile logins share the same hardening:

- **Fail-fast secrets** — `JWT_SECRET` and `ADMIN_PASSWORD` are required; the backend
  refuses to start if either is missing (no guessable defaults).
- **Inactive accounts** — a user with `is_active=false` cannot log in (403), and any
  existing token (web or mobile) is rejected on every request as soon as the account
  is deactivated.
- **Server-side revocation** — every issued token carries a `jti` and is tracked in the
  `sessions` collection. Logging out revokes that token immediately; a stolen token is
  useless after logout instead of remaining valid until expiry.
- **Brute-force throttling** — repeated failed logins lock an `IP+identifier` pair
  (`LOGIN_MAX_ATTEMPTS` / `LOGIN_LOCKOUT_MINUTES`).
- **Forgot-password rate limit** — capped per IP and per email
  (`FORGOT_PASSWORD_MAX` / `FORGOT_PASSWORD_WINDOW_MINUTES`) to prevent reset-email flooding.

### Active Sessions (admin: System → Sessions)

View every signed-in device (web + mobile) across all users and revoke them remotely.

| Method & Path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/sessions` | Admin | List sessions (active by default; `include_revoked=true` shows revoked/expired). `X-Total-Count` header. |
| `POST /api/sessions/{jti}/revoke` | Admin | Revoke one session — the device must sign in again on its next request. |
| `POST /api/sessions/revoke-user/{user_id}` | Admin | Force-logout: revoke all of a user's active sessions at once. |

Revoking a mobile session also blocks its `POST /api/jwt-refresh`, so it cannot silently
reissue a token.

### My Devices (self-service: Account page)

Every authenticated user can view and sign out of their **own** devices — no admin
needed. All queries are scoped to the caller, so a user can only ever see or revoke
their own sessions.

| Method & Path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/account/sessions` | Any user | List **my** active sessions (`is_current` flags the device making the request). |
| `POST /api/account/sessions/{jti}/revoke` | Any user | Sign out one of **my** devices (`404` if the session isn't mine). |
| `POST /api/account/sessions/revoke-others` | Any user | Sign out **all my other** devices, keeping the current one. |

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
