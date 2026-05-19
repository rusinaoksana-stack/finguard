import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import { prisma } from "../../lib/prisma";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  const user = (req as any).user;
  const transactions = await prisma.transaction.findMany({
    where: {
      account: {
        userId: user.id,
      },
    },
    include: {
      account: true,
    },
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
      accountId: item.accountId,
      accountNumber: item.account.accountNumber,
    })),
  });
});

export { router as transactionsRouter };
