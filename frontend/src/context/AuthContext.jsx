import { createContext, useContext, useEffect, useState, useCallback } from "react";

import API, { TOKEN_KEY } from "@/lib/api";

const AuthContext = createContext(null);

/**
 * AuthProvider
 * Holds the authenticated user and exposes login/logout. On mount it validates
 * any stored JWT via /api/auth/me. Token is a Bearer token in localStorage
 * (attached to every request by the axios client).
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setInitializing(false);
      return;
    }
    API.get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => window.localStorage.removeItem(TOKEN_KEY))
      .finally(() => setInitializing(false));
  }, []);

  const login = useCallback(async (identifier, password) => {
    const { data } = await API.post("/auth/login", { identifier, password });
    window.localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, initializing, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
