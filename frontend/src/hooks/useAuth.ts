import { useEffect, useState } from "react";
import { isPreviewAccessEnabled } from "../config/preview";
import { login as requestLogin, register as requestRegister, setAccessToken, type AuthUser } from "../services/api";

const STORAGE_KEY = "finguard_user";
const TOKEN_KEY = "finguard_token";

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = LoginInput & {
  name: string;
};

export type PreviewProfile = {
  name: string;
  role: "user" | "admin";
  email: string;
};

function readStoredUser() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const storedUser = JSON.parse(stored) as AuthUser;
    if (!storedUser.name || (storedUser.role !== "user" && storedUser.role !== "admin")) {
      throw new Error("Invalid stored user");
    }

    return storedUser;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setAccessToken(null);
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      setAccessToken(token);
    }
    const storedUser = readStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  const persistUser = (nextUser: AuthUser, token?: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      setAccessToken(token);
    }
    setUser(nextUser);
  };

  const login = async ({ email, password }: LoginInput) => {
    try {
      const data = await requestLogin(email, password);
      persistUser(data.user, data.accessToken);
    } catch {
      throw new Error("Invalid credentials");
    }
  };

  const register = async ({ name, email, password }: RegisterInput) => {
    const normalizedEmail = email.toLowerCase();
    const nextUser: AuthUser = { name, role: "user", email: normalizedEmail };

    try {
      const data = await requestRegister(name, normalizedEmail, password);
      persistUser(data.user, data.accessToken);
      return;
    } catch {
      if (!isPreviewAccessEnabled) {
        throw new Error("Registration service unavailable");
      }
    }

    persistUser(nextUser);
  };

  const startPreviewSession = (profile: PreviewProfile) => {
    if (!isPreviewAccessEnabled) {
      throw new Error("Preview access is unavailable");
    }

    persistUser(profile);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setAccessToken(null);
    setUser(null);
  };

  return { user, login, register, logout, startPreviewSession };
}
