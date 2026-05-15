import { useEffect, useState } from "react";
import { login as requestLogin, setAccessToken } from "../services/api";

const STORAGE_KEY = "finguard_user";
const TOKEN_KEY = "finguard_token";

export function useAuth() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      setAccessToken(token);
    }
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const login = async () => {
    const demoUser = { name: "FinGuard Admin", role: "admin" };

    try {
      const data = await requestLogin("compliance@finguard.ai");
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
      setAccessToken(data.accessToken);
      setUser(data.user);
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
      setUser(demoUser);
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setAccessToken(null);
    setUser(null);
  };

  return { user, login, logout };
}
