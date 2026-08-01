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
