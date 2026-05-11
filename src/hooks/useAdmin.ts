import { useState, useCallback } from "react";

const ADMIN_KEY = "sahseh_admin_token";

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(() => {
    return Boolean(localStorage.getItem(ADMIN_KEY));
  });

  const login = useCallback((token: string) => {
    if (token) {
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
