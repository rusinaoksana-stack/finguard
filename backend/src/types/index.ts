export interface User {
  id: string;
  email: string;
  role: "admin" | "user";
  name: string;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "review";
  createdAt: string;
  description: string;
}

export interface Dispute {
  id: string;
  transactionId: string;
  reason: string;
  status: "open" | "resolved" | "escalated";
  createdAt: string;
}

export interface AiAnalysisRequest {
  transaction: Transaction;
}

export interface AiAnalysisResponse {
  score: number;
  riskLabel: string;
  recommendation: string;
}

export interface SupportChatMessage {
  role: "user" | "assistant";
  content: string;
}
