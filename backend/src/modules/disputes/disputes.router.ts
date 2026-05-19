import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import { prisma } from "../../lib/prisma";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  const user = (req as any).user;
  const disputes = await prisma.dispute.findMany({
    where: {
      transaction: {
        account: {
          userId: user.id,
        },
      },
    },
    include: {
      transaction: {
        include: {
          account: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    data: disputes.map((item) => ({
      id: item.id,
      transactionId: item.transactionId,
      reason: item.reason,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      accountNumber: item.transaction.account.accountNumber,
    })),
  });
});

router.post("/", authMiddleware, async (req, res) => {
  const user = (req as any).user;
  const { transactionId, reason } = req.body;

  if (!transactionId || !reason || reason.trim().length < 3) {
    return res.status(400).json({ message: "Transaction and reason are required" });
  }

  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      account: {
        userId: user.id,
      },
    },
    include: {
      account: true,
    },
  });

  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  const existingDispute = await prisma.dispute.findUnique({ where: { transactionId } });
  if (existingDispute) {
    return res.status(409).json({ message: "This transaction already has a review case" });
  }

  const dispute = await prisma.dispute.create({
    data: {
      id: `disp_${Date.now()}`,
      transactionId,
      reason: reason.trim(),
      status: "open",
      notes: "Created from the customer cabinet.",
    },
  });

  return res.status(201).json({
    data: {
      id: dispute.id,
      transactionId: dispute.transactionId,
      reason: dispute.reason,
      status: dispute.status,
      createdAt: dispute.createdAt.toISOString(),
      accountNumber: transaction.account.accountNumber,
    },
  });
});

router.patch("/:id/status", authMiddleware, async (req, res) => {
  const { status } = req.body;
  if (!["open", "resolved", "escalated"].includes(status)) {
    return res.status(400).json({ message: "Invalid dispute status" });
  }

  const user = (req as any).user;
  const dispute = await prisma.dispute.findFirst({
    where: {
      id: req.params.id,
      transaction: {
        account: {
          userId: user.id,
        },
      },
    },
  });
  if (!dispute) {
    return res.status(404).json({ message: "Dispute not found" });
  }

  const updatedDispute = await prisma.dispute.update({
    where: { id: req.params.id },
    data: { status },
    include: {
      transaction: {
        include: {
          account: true,
        },
      },
    },
  });

  return res.json({
    data: {
      id: updatedDispute.id,
      transactionId: updatedDispute.transactionId,
      reason: updatedDispute.reason,
      status: updatedDispute.status,
      createdAt: updatedDispute.createdAt.toISOString(),
      accountNumber: updatedDispute.transaction.account.accountNumber,
    },
  });
});

router.post("/:id/resolve", authMiddleware, async (req, res) => {
  const user = (req as any).user;
  const dispute = await prisma.dispute.findFirst({
    where: {
      id: req.params.id,
      transaction: {
        account: {
          userId: user.id,
        },
      },
    },
  });
  if (!dispute) {
    return res.status(404).json({ message: "Dispute not found" });
  }

  const updatedDispute = await prisma.dispute.update({
    where: { id: req.params.id },
    data: { status: "resolved" },
    include: {
      transaction: {
        include: {
          account: true,
        },
      },
    },
  });

  return res.json({
    data: {
      id: updatedDispute.id,
      transactionId: updatedDispute.transactionId,
      reason: updatedDispute.reason,
      status: updatedDispute.status,
      createdAt: updatedDispute.createdAt.toISOString(),
      accountNumber: updatedDispute.transaction.account.accountNumber,
    },
  });
});

export { router as disputesRouter };
