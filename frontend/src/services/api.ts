import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export function setAccessToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export async function fetchTransactions() {
  const response = await api.get("/transactions");
  return response.data.data;
}

export async function fetchDisputes() {
  const response = await api.get("/disputes");
  return response.data.data;
}

export async function login(email: string) {
  const response = await api.post("/auth/login", { email });
  return response.data;
}
