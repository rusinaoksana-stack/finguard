import { useEffect, useState } from "react";
import { isPreviewAccessEnabled } from "../config/preview";
import { AUTH_STORAGE_KEY, AUTH_TOKEN_KEY, getStorageItem, removeStorageItem, setStorageItem } from "../config/storage";
import { login as requestLogin, register as requestRegister, setAccessToken, type AuthUser } from "../services/api";

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
  const stored = getStorageItem(AUTH_STORAGE_KEY);
  if (!stored) return null;

  try {
    const storedUser = JSON.parse(stored) as AuthUser;
    if (!storedUser.name || (storedUser.role !== "user" && storedUser.role !== "admin")) {
      throw new Error("Invalid stored user");
    }

    return storedUser;
  } catch {
    removeStorageItem(AUTH_STORAGE_KEY);
    removeStorageItem(AUTH_TOKEN_KEY);
    setAccessToken(null);
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = getStorageItem(AUTH_TOKEN_KEY);
    if (token) {
      setAccessToken(token);
    }
    const storedUser = readStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  const persistUser = (nextUser: AuthUser, token?: string) => {
    setStorageItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
    if (token) {
      setStorageItem(AUTH_TOKEN_KEY, token);
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
    removeStorageItem(AUTH_STORAGE_KEY);
    removeStorageItem(AUTH_TOKEN_KEY);
    setAccessToken(null);
    setUser(null);
  };

  return { user, login, register, logout, startPreviewSession };
}
