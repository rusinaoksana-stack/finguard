import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import { prisma } from "../../lib/prisma";

const router = Router();

router.get("/", authMiddleware, async (_req, res) => {
  const transactions = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
  });

  res.json({
    data: transactions.map((item) => ({
      id: item.id,
      amount: Number(item.amount),
      currency: item.currency,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      description: item.description,
    })),
  });
});

export { router as transactionsRouter };
