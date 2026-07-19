import type { AuditorCustomer, BankAccount, Dispute, PreviewWorkspaceData, Transaction } from "../types/domain";

export function createPreviewWorkspaceData(now = Date.now()): PreviewWorkspaceData {
  const accounts: BankAccount[] = [
    {
      id: "acc_preview",
      accountNumber: "FG-10293847",
      balance: 2450.8,
      currency: "EUR",
      status: "active",
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 120).toISOString(),
    },
  ];

  const transactions: Transaction[] = [
    {
      id: "txn_001",
      accountId: "acc_preview",
      accountNumber: "FG-10293847",
      amount: 48.75,
      currency: "EUR",
      status: "review",
      createdAt: new Date(now).toISOString(),
      description: "Refund request for duplicate charge",
    },
    {
      id: "txn_002",
      accountId: "acc_preview",
      accountNumber: "FG-10293847",
      amount: 12.5,
      currency: "EUR",
      status: "completed",
      createdAt: new Date(now - 1000 * 60 * 38).toISOString(),
      description: "Merchant settlement",
    },
    {
      id: "txn_003",
      accountId: "acc_preview",
      accountNumber: "FG-10293847",
      amount: 734.2,
      currency: "EUR",
      status: "pending",
      createdAt: new Date(now - 1000 * 60 * 94).toISOString(),
      description: "Cross-border wallet transfer",
    },
  ];

  const disputes: Dispute[] = [
    {
      id: "disp_001",
      transactionId: "txn_001",
      accountNumber: "FG-10293847",
      reason: "Duplicate payment",
      status: "open",
      createdAt: new Date(now).toISOString(),
    },
    {
      id: "disp_002",
      transactionId: "txn_003",
      accountNumber: "FG-10293847",
      reason: "Unusual transfer pattern",
      status: "escalated",
      createdAt: new Date(now - 1000 * 60 * 90).toISOString(),
    },
  ];

  const auditorCustomers: AuditorCustomer[] = [
    {
      id: "preview_customer_001",
      name: "Emma Murphy",
      email: "customer@finguard.ai",
      role: "user",
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 120).toISOString(),
      accounts: accounts.map((account) => ({
        ...account,
        transactions: transactions.map((transaction) => ({
          ...transaction,
          dispute: disputes.find((dispute) => dispute.transactionId === transaction.id) ?? null,
        })),
      })),
      summary: {
        accountCount: accounts.length,
        transactionCount: transactions.length,
        reviewCount: transactions.filter((transaction) => transaction.status === "review").length,
        openDisputeCount: disputes.filter((dispute) => dispute.status !== "resolved").length,
        totalBalance: accounts.reduce((sum, account) => sum + account.balance, 0),
        totalVolume: transactions.reduce((sum, transaction) => sum + transaction.amount, 0),
      },
    },
  ];

  return { accounts, transactions, disputes, auditorCustomers };
}
