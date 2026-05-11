import { useState, useCallback } from "react";

const ADMIN_KEY = "sahseh_admin_token";
const ADMIN_TOKEN = "admin_sahseh_2025_token";

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem(ADMIN_KEY) === ADMIN_TOKEN;
  });

  const login = useCallback((token: string) => {
    if (token === ADMIN_TOKEN) {
      localStorage.setItem(ADMIN_KEY, token);
      setIsAdmin(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_KEY);
    setIsAdmin(false);
  }, []);

  return { isAdmin, login, logout };
}
