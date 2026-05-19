import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import { prisma } from "../../lib/prisma";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  const user = (req as any).user;
  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  res.json({
    data: accounts.map((item) => ({
      id: item.id,
      accountNumber: item.accountNumber,
      balance: Number(item.balance),
      currency: item.currency,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
    })),
  });
});

export { router as accountsRouter };
