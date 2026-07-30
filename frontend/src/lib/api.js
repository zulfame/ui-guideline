import axios from "axios";

/** Shared axios client — always uses the configured backend URL + /api prefix. */
const API = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
});

export default API;
