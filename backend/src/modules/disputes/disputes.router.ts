import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware";

const router = Router();

const disputeList = [
  {
    id: "disp_001",
    transactionId: "txn_001",
    reason: "Duplicate payment",
    status: "open",
    createdAt: new Date().toISOString(),
  },
];

router.get("/", authMiddleware, (_req, res) => {
  res.json({ data: disputeList });
});

router.post("/:id/resolve", authMiddleware, (req, res) => {
  const dispute = disputeList.find((item) => item.id === req.params.id);
  if (!dispute) {
    return res.status(404).json({ message: "Dispute not found" });
  }

  dispute.status = "resolved";
  return res.json({ data: dispute });
});

export { router as disputesRouter };
