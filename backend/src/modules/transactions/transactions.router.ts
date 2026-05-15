import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import { Transaction } from "../../types";

const router = Router();

const sampleTransactions: Transaction[] = [
  {
    id: "txn_001",
    amount: 48.75,
    currency: "EUR",
    status: "review",
    createdAt: new Date().toISOString(),
    description: "Refund request for duplicate charge",
  },
  {
    id: "txn_002",
    amount: 12.5,
    currency: "EUR",
    status: "completed",
    createdAt: new Date().toISOString(),
    description: "Merchant settlement",
  },
];

router.get("/", authMiddleware, (_req, res) => {
  res.json({ data: sampleTransactions });
});

export { router as transactionsRouter };
