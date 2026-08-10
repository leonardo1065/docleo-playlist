import { useState, useEffect, useCallback } from "react";

const AUTH_KEY = "playlist-auth:v1";

export type AuthState = {
  isAuthenticated: boolean;
  username: string | null;
  email: string | null;
};

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(() => {
    if (typeof window === "undefined") return { isAuthenticated: false, username: null, email: null };
    const stored = window.localStorage.getItem(AUTH_KEY);
    return stored ? JSON.parse(stored) : { isAuthenticated: false, username: null, email: null };
  });

  const login = useCallback((username: string, password: string) => {
    // Requisito: usuário 'admin' e senha numérica de 6 dígitos
    if (username === "admin" && /^\d{6}$/.test(password)) {
      const newState = { isAuthenticated: true, username: "admin", email: auth.email };
      window.localStorage.setItem(AUTH_KEY, JSON.stringify(newState));
      setAuth(newState);
      return true;
    }
    return false;
  }, [auth.email]);

  const register = useCallback((email: string) => {
    const stored = window.localStorage.getItem(AUTH_KEY);
    const current = stored ? JSON.parse(stored) : { isAuthenticated: false, username: null, email: null };
    const newState = { ...current, email };
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(newState));
    setAuth(newState);
  }, []);

  const logout = useCallback(() => {
    const newState = { isAuthenticated: false, username: null, email: auth.email };
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(newState));
    setAuth(newState);
  }, [auth.email]);

  return { ...auth, login, logout, register };
}
