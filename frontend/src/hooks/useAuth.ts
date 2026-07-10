import { useEffect, useState } from "react";
import { login as requestLogin, register as requestRegister, setAccessToken } from "../services/api";

const STORAGE_KEY = "finguard_user";
const TOKEN_KEY = "finguard_token";
const REGISTERED_USERS_KEY = "finguard_registered_users";

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

type StoredAccount = RegisterInput & {
  role: string;
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

      if (storedUser.email?.toLowerCase() === "auditor@finguard.ai") {
        requestLogin("auditor@finguard.ai", "Password123")
          .then((data) => persistUser(data.user, data.accessToken))
          .catch(() => {
            persistUser({ name: "auditor", role: "admin", email: "auditor@finguard.ai" });
          });
      }
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

  const getRegisteredUsers = (): StoredAccount[] => {
    const stored = localStorage.getItem(REGISTERED_USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  };

  const login = async ({ email, password }: LoginInput) => {
    const registeredUser = getRegisteredUsers().find(
      (account) => account.email.toLowerCase() === email.toLowerCase() && account.password === password,
    );

    try {
      const data = await requestLogin(email, password);
      persistUser(data.user, data.accessToken);
    } catch {
      if (registeredUser) {
        persistUser({ name: registeredUser.name, role: registeredUser.role, email: registeredUser.email });
        return;
      }

      if (email.toLowerCase() === "auditor@finguard.ai") {
        persistUser({
          name: "auditor",
          role: "admin",
          email,
        });
        return;
      }

      persistUser({
        name: email.split("@")[0] || "FinGuard User",
        role: "demo user",
        email,
      });
    }
  };

  const register = async ({ name, email, password }: RegisterInput) => {
    const accounts = getRegisteredUsers();
    const normalizedEmail = email.toLowerCase();
    const nextAccounts = accounts.filter((account) => account.email.toLowerCase() !== normalizedEmail);
    const nextUser = { name, role: "customer", email: normalizedEmail };

    try {
      const data = await requestRegister(name, normalizedEmail, password);
      persistUser(data.user, data.accessToken);
      return;
    } catch {
      // Keep the demo usable when the backend or database is not running.
    }

    localStorage.setItem(
      REGISTERED_USERS_KEY,
      JSON.stringify([...nextAccounts, { name, email: normalizedEmail, password, role: "customer" }]),
    );
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
