// Central source of truth for the External / Mobile API documentation.
// Rendered by the dedicated ApiDocsPage (System → API Docs).
export const API_BASE = process.env.REACT_APP_BACKEND_URL;

const TOKEN_JSON = `{
  "success": true,
  "data": {
    "token_type": "bearer",
    "expires_in": 3600,
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}`;

const PROFILE_JSON = `{
  "success": true,
  "data": {
    "user": {
      "id": 42,
      "name": "Budi Santoso",
      "username": "309011221",
      "email": "budi@example.com",
      "role": "Collector",
      "office": "KC Bangunarta",
      "alias": "Budi",
      "mso_code": "MSO01",
      "collector_code": "COL07",
      "is_active": true
    },
    "office": {
      "code": "001",
      "name": "KC Bangunarta",
      "address": "Jl. Merdeka No. 10",
      "telephone": "0281-000000",
      "longitude": 109.2409,
      "latitude": -7.4256,
      "radius": 100,
      "coa": null
    },
    "device": {
      "device_identifier": "DEVICE-UUID",
      "device_name": "Pixel 9",
      "device_os": "Android 16",
      "fmc_token": "fcm-token"
    }
  }
}`;

export function authBadge(auth) {
  if (auth === "apikey") return { label: "Requires X-API-Key", variant: "outline" };
  if (auth === "bearer") return { label: "Requires Bearer token", variant: "outline" };
  return { label: "Public", variant: "secondary" };
}

// Logical groups shown in the left-hand index of the docs page.
export const API_DOC_GROUPS = [
  {
    id: "mobile",
    title: "Mobile App (JWT)",
    description:
      "Token-based auth for your mobile app. Login binds the account to a single device; use the Bearer access_token for the rest.",
  },
  {
    id: "server",
    title: "Server-to-Server (API Key)",
    description:
      "Backend integrations authenticated with an X-API-Key header. Create the key under Clients.",
  },
];

export const ENDPOINT_DOCS = [
  {
    id: "jwt-auth",
    group: "mobile",
    method: "POST",
    path: "/api/jwt-auth",
    title: "Mobile login",
    auth: "public",
    note: "Public (no API key). device_identifier, device_name and device_os are REQUIRED and must match the account's bound device — logging in from a different device returns \"This account is already linked to another device\". Username can be email, username, or phone.",
    curl: `curl -X POST "${API_BASE}/api/jwt-auth" \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "309011221",
    "password": "secret",
    "device_identifier": "DEVICE-UUID",
    "device_name": "Pixel 9",
    "device_os": "Android 16",
    "fmc_token": "fcm-token"
  }'`,
    success: TOKEN_JSON,
    errorStatus: 401,
    error: `{
  "success": false,
  "message": "The credentials you entered are incorrect"
}`,
  },
  {
    id: "jwt-me",
    group: "mobile",
    method: "GET",
    path: "/api/jwt-me",
    title: "Current profile",
    auth: "bearer",
    note: "Requires the Bearer access_token from /api/jwt-auth. Returns the current user's profile, office, and bound device.",
    curl: `curl -X GET "${API_BASE}/api/jwt-me" \\
  -H "Authorization: Bearer ACCESS_TOKEN"`,
    success: PROFILE_JSON,
    errorStatus: 401,
    error: `{
  "success": false,
  "message": "Session ended. Please sign in again."
}`,
  },
  {
    id: "jwt-refresh",
    group: "mobile",
    method: "POST",
    path: "/api/jwt-refresh",
    title: "Refresh token",
    auth: "bearer",
    note: "Issues a fresh access_token. Accepts an expired-but-valid token within the refresh window while the device is still bound.",
    curl: `curl -X POST "${API_BASE}/api/jwt-refresh" \\
  -H "Authorization: Bearer ACCESS_TOKEN"`,
    success: TOKEN_JSON,
    errorStatus: 401,
    error: `{
  "success": false,
  "message": "Session ended. Please sign in again."
}`,
  },
  {
    id: "jwt-logout",
    group: "mobile",
    method: "POST",
    path: "/api/jwt-logout",
    title: "Logout",
    auth: "bearer",
    note: "Ends the mobile session, unbinds the device, and revokes the token server-side so it can no longer be used.",
    curl: `curl -X POST "${API_BASE}/api/jwt-logout" \\
  -H "Authorization: Bearer ACCESS_TOKEN"`,
    success: `{
  "success": true,
  "message": "Logged out successfully."
}`,
    errorStatus: 401,
    error: `{
  "success": false,
  "message": "Invalid token."
}`,
  },
  {
    id: "user-auth",
    group: "server",
    method: "POST",
    path: "/api/user-auth",
    title: "Verify credentials",
    auth: "apikey",
    note: "Requires X-API-Key. Only verifies the credential is correct (no device binding). Returns the profile even for inactive users — check the `is_active` field in the response.",
    curl: `curl -X POST "${API_BASE}/api/user-auth" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "username": "309011221",
    "password": "secret"
  }'`,
    success: PROFILE_JSON,
    errorStatus: 401,
    error: `{
  "success": false,
  "message": "The credentials you entered are incorrect"
}`,
  },
  {
    id: "user-password",
    group: "server",
    method: "POST",
    path: "/api/user-password",
    title: "Change password",
    auth: "apikey",
    note: "Requires X-API-Key. Verifies current_password, then sets the new password (password must equal confirmed_password).",
    curl: `curl -X POST "${API_BASE}/api/user-password" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "username": "309011221",
    "current_password": "bpr2026",
    "password": "newpass",
    "confirmed_password": "newpass"
  }'`,
    success: PROFILE_JSON,
    errorStatus: 400,
    error: `{
  "success": false,
  "message": "Password confirmation does not match"
}`,
  },
  {
    id: "user-create",
    group: "server",
    method: "POST",
    path: "/api/user-create",
    title: "Create user",
    auth: "apikey",
    note: "Requires X-API-Key. Creates a user. If password is omitted the system default is used and the user must change it on first login. role_id is required. Tip: get role_id / office_id from the Roles / Offices page → row menu (⋯) → Copy ID.",
    curl: `curl -X POST "${API_BASE}/api/user-create" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "role_id": "ROLE_UUID",
    "office_id": "",
    "username": "",
    "phone": "",
    "alias": "",
    "mso_code": "",
    "collector_code": "",
    "password": ""
  }'`,
    success: PROFILE_JSON,
    successLabel: "201 Created",
    errorStatus: 409,
    error: `{
  "success": false,
  "message": "User email already exists"
}`,
  },
  {
    id: "user-update",
    group: "server",
    method: "POST",
    path: "/api/user-update",
    title: "Update user",
    auth: "apikey",
    note: "Requires X-API-Key. Locate the user by `username` (email, username, or phone) and send only the fields to change. Empty string / null leaves a field unchanged. Use `new_username` to change the username. To activate/deactivate a user, use /api/user-deactivate instead. Tip: get role_id / office_id from the Roles / Offices page → row menu (⋯) → Copy ID.",
    curl: `curl -X POST "${API_BASE}/api/user-update" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "username": "budi@example.com",
    "name": "",
    "email": "",
    "role_id": "",
    "office_id": "",
    "phone": "",
    "alias": "",
    "mso_code": "",
    "collector_code": "",
    "new_username": ""
  }'`,
    success: PROFILE_JSON,
    errorStatus: 404,
    error: `{
  "success": false,
  "message": "User not found"
}`,
  },
  {
    id: "user-deactivate",
    group: "server",
    method: "POST",
    path: "/api/user-deactivate",
    title: "Deactivate / reactivate user",
    auth: "apikey",
    note: "Requires X-API-Key. Set active=false (default) to deactivate — the user can no longer log in and existing tokens are rejected. Set active=true to reactivate.",
    curl: `curl -X POST "${API_BASE}/api/user-deactivate" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "username": "budi@example.com",
    "active": false
  }'`,
    success: PROFILE_JSON,
    errorStatus: 404,
    error: `{
  "success": false,
  "message": "User not found"
}`,
  },
];
