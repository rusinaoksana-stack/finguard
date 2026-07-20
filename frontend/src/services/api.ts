import axios from "axios";
import type { AuditorCustomer, BankAccount, Dispute, DisputeStatus, Transaction } from "../types/domain";

type ApiEnvelope<T> = {
  data: T;
};

export type AuthUser = {
  id?: string;
  name: string;
  role: "user" | "admin";
  email?: string;
};

type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

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

async function apiData<T>(request: Promise<{ data: ApiEnvelope<T> }>) {
  const response = await request;
  return response.data.data;
}

export async function fetchTransactions() {
  return apiData<Transaction[]>(api.get<ApiEnvelope<Transaction[]>>("/transactions"));
}

export async function fetchAccounts() {
  return apiData<BankAccount[]>(api.get<ApiEnvelope<BankAccount[]>>("/accounts"));
}

export async function fetchDisputes() {
  return apiData<Dispute[]>(api.get<ApiEnvelope<Dispute[]>>("/disputes"));
}

export async function fetchAuditorCustomers() {
  return apiData<AuditorCustomer[]>(api.get<ApiEnvelope<AuditorCustomer[]>>("/auditor/customers"));
}

export async function createDispute(transactionId: string, reason: string) {
  return apiData<Dispute>(api.post<ApiEnvelope<Dispute>>("/disputes", { transactionId, reason }));
}

export async function updateDisputeStatus(id: string, status: DisputeStatus) {
  return apiData<Dispute>(api.patch<ApiEnvelope<Dispute>>(`/disputes/${id}/status`, { status }));
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/login", { email, password });
  return response.data;
}

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/register", { name, email, password });
  return response.data;
}

export type SupportChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function sendSupportChatMessage(messages: SupportChatMessage[]) {
  return apiData<{ reply: string }>(api.post<ApiEnvelope<{ reply: string }>>("/support/chat", { messages }));
}
