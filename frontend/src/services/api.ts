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

export async function fetchAccounts() {
  const response = await api.get("/accounts");
  return response.data.data;
}

export async function fetchDisputes() {
  const response = await api.get("/disputes");
  return response.data.data;
}

export async function fetchAuditorCustomers() {
  const response = await api.get("/auditor/customers");
  return response.data.data;
}

export async function createDispute(transactionId: string, reason: string) {
  const response = await api.post("/disputes", { transactionId, reason });
  return response.data.data;
}

export async function updateDisputeStatus(id: string, status: "open" | "resolved" | "escalated") {
  const response = await api.patch(`/disputes/${id}/status`, { status });
  return response.data.data;
}

export async function login(email: string, password: string) {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
}

export async function register(name: string, email: string, password: string) {
  const response = await api.post("/auth/register", { name, email, password });
  return response.data;
}

export type SupportChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function sendSupportChatMessage(messages: SupportChatMessage[]) {
  const response = await api.post("/support/chat", { messages });
  return response.data.data as { reply: string };
}
