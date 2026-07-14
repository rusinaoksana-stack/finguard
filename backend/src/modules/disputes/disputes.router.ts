import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { authMiddleware } from "../auth/auth.middleware";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { validateBody } from "../../lib/validation";
import { requireRole } from "../auth/role.middleware";

const router = Router();

const disputeStatusSchema = z.object({
  status: z.enum(["open", "resolved", "escalated"]),
  reason: z.string().trim().max(500).optional(),
});

const createDisputeSchema = z.object({
  transactionId: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(3).max(1000),
});

router.get("/", authMiddleware, asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

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
}));

router.post("/", authMiddleware, validateBody(createDisputeSchema), asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const { transactionId, reason } = req.body;

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
      id: `disp_${crypto.randomUUID()}`,
      transactionId,
      reason,
      status: "open",
      notes: "Created from the customer cabinet.",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorEmail: user.email,
      action: "dispute.created",
      entityType: "dispute",
      entityId: dispute.id,
      disputeId: dispute.id,
      nextStatus: "open",
      reason,
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
}));

router.patch("/:id/status", authMiddleware, requireRole("admin"), validateBody(disputeStatusSchema), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const dispute = await prisma.dispute.findFirst({
    where: {
      id: req.params.id,
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

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorEmail: user.email,
      action: "dispute.status_changed",
      entityType: "dispute",
      entityId: req.params.id,
      disputeId: req.params.id,
      previousStatus: dispute.status,
      nextStatus: status,
      reason: req.body.reason,
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
}));

router.post("/:id/resolve", authMiddleware, requireRole("admin"), asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const dispute = await prisma.dispute.findFirst({
    where: {
      id: req.params.id,
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

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorEmail: user.email,
      action: "dispute.resolved",
      entityType: "dispute",
      entityId: req.params.id,
      disputeId: req.params.id,
      previousStatus: dispute.status,
      nextStatus: "resolved",
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
}));

export { router as disputesRouter };
