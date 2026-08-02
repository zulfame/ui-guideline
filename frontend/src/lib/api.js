import axios from "axios";

/** localStorage key that holds the JWT access token. */
export const TOKEN_KEY = "app.token";

/** Shared axios client — always uses the configured backend URL + /api prefix. */
const API = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
});

// Attach the Bearer token (when present) to every request.
API.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;

/**
 * Fetch ALL rows from a paginated list endpoint by following X-Total-Count.
 * Prevents silently truncating data at the backend page-size cap (500).
 */
export async function fetchAll(path, params = {}, pageSize = 500) {
  let skip = 0;
  let total = Infinity;
  let all = [];
  while (all.length < total) {
    const res = await API.get(path, { params: { ...params, skip, limit: pageSize } });
    const batch = res.data || [];
    const hdr = parseInt(res.headers["x-total-count"], 10);
    total = Number.isNaN(hdr) ? batch.length : hdr;
    all = all.concat(batch);
    if (batch.length < pageSize) break;
    skip += pageSize;
  }
  return all;
}
