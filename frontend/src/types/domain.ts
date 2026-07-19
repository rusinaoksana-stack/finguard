export type TransactionStatus = "pending" | "completed" | "review";
export type DisputeStatus = "open" | "resolved" | "escalated";

export type Transaction = {
  id: string;
  accountId?: string;
  accountNumber?: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  createdAt: string;
  description: string;
};

export type Dispute = {
  id: string;
  transactionId: string;
  accountNumber?: string;
  reason: string;
  status: DisputeStatus;
  createdAt: string;
};

export type BankAccount = {
  id: string;
  accountNumber: string;
  balance: number;
  currency: string;
  status: "active" | "frozen" | "closed";
  createdAt: string;
};

export type AuditorDispute = Dispute & {
  notes?: string | null;
};

export type AuditorTransaction = Transaction & {
  dispute?: AuditorDispute | null;
};

export type AuditorAccount = BankAccount & {
  transactions: AuditorTransaction[];
};

export type AuditorCustomer = {
  id: string;
  name: string;
  email: string;
  role: "user";
  createdAt: string;
  accounts: AuditorAccount[];
  summary: {
    accountCount: number;
    transactionCount: number;
    reviewCount: number;
    openDisputeCount: number;
    totalBalance: number;
    totalVolume: number;
  };
};

export type PreviewWorkspaceData = {
  accounts: BankAccount[];
  transactions: Transaction[];
  disputes: Dispute[];
  auditorCustomers: AuditorCustomer[];
};
