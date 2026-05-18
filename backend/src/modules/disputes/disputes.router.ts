import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";
import { prisma } from "../../lib/prisma";

const router = Router();

router.get("/", authMiddleware, async (_req, res) => {
  const disputes = await prisma.dispute.findMany({
    orderBy: { createdAt: "desc" },
  });

  res.json({
    data: disputes.map((item) => ({
      id: item.id,
      transactionId: item.transactionId,
      reason: item.reason,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
    })),
  });
});

router.patch("/:id/status", authMiddleware, async (req, res) => {
  const { status } = req.body;
  if (!["open", "resolved", "escalated"].includes(status)) {
    return res.status(400).json({ message: "Invalid dispute status" });
  }

  const dispute = await prisma.dispute.findUnique({ where: { id: req.params.id } });
  if (!dispute) {
    return res.status(404).json({ message: "Dispute not found" });
  }

  const updatedDispute = await prisma.dispute.update({
    where: { id: req.params.id },
    data: { status },
  });

  return res.json({
    data: {
      id: updatedDispute.id,
      transactionId: updatedDispute.transactionId,
      reason: updatedDispute.reason,
      status: updatedDispute.status,
      createdAt: updatedDispute.createdAt.toISOString(),
    },
  });
});

router.post("/:id/resolve", authMiddleware, async (req, res) => {
  const updatedDispute = await prisma.dispute.update({
    where: { id: req.params.id },
    data: { status: "resolved" },
  });

  return res.json({
    data: {
      id: updatedDispute.id,
      transactionId: updatedDispute.transactionId,
      reason: updatedDispute.reason,
      status: updatedDispute.status,
      createdAt: updatedDispute.createdAt.toISOString(),
    },
  });
});

export { router as disputesRouter };
