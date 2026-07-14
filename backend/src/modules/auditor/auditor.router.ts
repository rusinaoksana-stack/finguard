import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import { requireRole } from "../auth/role.middleware";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("admin"));

router.get("/customers", asyncHandler(async (_req, res) => {
  const customers = await prisma.user.findMany({
    where: { role: "user" },
    include: {
      accounts: {
        include: {
          transactions: {
            include: {
              dispute: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return res.json({
    data: customers.map((customer) => {
      const accounts = customer.accounts.map((account) => ({
        id: account.id,
        accountNumber: account.accountNumber,
        balance: Number(account.balance),
        currency: account.currency,
        status: account.status,
        createdAt: account.createdAt.toISOString(),
        transactions: account.transactions.map((transaction) => ({
          id: transaction.id,
          accountId: transaction.accountId,
          accountNumber: account.accountNumber,
          amount: Number(transaction.amount),
          currency: transaction.currency,
          status: transaction.status,
          createdAt: transaction.createdAt.toISOString(),
          description: transaction.description,
          dispute: transaction.dispute
            ? {
                id: transaction.dispute.id,
                transactionId: transaction.dispute.transactionId,
                reason: transaction.dispute.reason,
                status: transaction.dispute.status,
                notes: transaction.dispute.notes,
                createdAt: transaction.dispute.createdAt.toISOString(),
              }
            : null,
        })),
      }));

      const transactions = accounts.flatMap((account) => account.transactions);
      const disputes = transactions
        .map((transaction) => transaction.dispute)
        .filter((dispute): dispute is NonNullable<typeof dispute> => Boolean(dispute));

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        role: customer.role,
        createdAt: customer.createdAt.toISOString(),
        accounts,
        summary: {
          accountCount: accounts.length,
          transactionCount: transactions.length,
          reviewCount: transactions.filter((transaction) => transaction.status === "review").length,
          openDisputeCount: disputes.filter((dispute) => dispute.status !== "resolved").length,
          totalBalance: accounts.reduce((sum, account) => sum + account.balance, 0),
          totalVolume: transactions.reduce((sum, transaction) => sum + transaction.amount, 0),
        },
      };
    }),
  });
}));

export { router as auditorRouter };
