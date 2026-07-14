import { useEffect, useState } from "react";
import { login as requestLogin, register as requestRegister, setAccessToken } from "../services/api";

const STORAGE_KEY = "finguard_user";
const TOKEN_KEY = "finguard_token";
const DEMO_USERS = [
  { name: "Emma Murphy", role: "user", email: "customer.demo@finguard.ai", password: "Password123" },
  { name: "FinGuard Auditor", role: "admin", email: "auditor@finguard.ai", password: "Password123" },
];

type AuthUser = {
  name: string;
  role: string;
  email?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = LoginInput & {
  name: string;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      setAccessToken(token);
    }
    if (stored) {
      const storedUser = JSON.parse(stored) as AuthUser;
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
      const demoUser = DEMO_USERS.find(
        (account) => account.email.toLowerCase() === email.toLowerCase() && account.password === password,
      );

      if (demoUser) {
        persistUser({ name: demoUser.name, role: demoUser.role, email: demoUser.email });
        return;
      }

      throw new Error("Invalid credentials");
    }
  };

  const register = async ({ name, email, password }: RegisterInput) => {
    const normalizedEmail = email.toLowerCase();
    const nextUser = { name, role: "customer", email: normalizedEmail };

    try {
      const data = await requestRegister(name, normalizedEmail, password);
      persistUser(data.user, data.accessToken);
      return;
    } catch {
      // Keep the demo usable when the backend or database is not running.
    }

    persistUser(nextUser);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setAccessToken(null);
    setUser(null);
  };

  return { user, login, register, logout };
}
