import { Router } from "express";
import jwt from "jsonwebtoken";
import { config } from "../../config";
import { authMiddleware } from "./auth.middleware";
import { User } from "../../types";

const router = Router();

const demoUser: User = {
  id: "user-1",
  email: "compliance@finguard.ai",
  role: "admin",
  name: "FinGuard Admin",
};

router.post("/login", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const token = jwt.sign({ sub: demoUser.id, email, role: demoUser.role }, config.JWT_SECRET, {
    expiresIn: "8h",
  });

  return res.json({ user: demoUser, accessToken: token });
});

router.get("/me", authMiddleware, (req, res) => {
  return res.json({ user: (req as any).user });
});

export { router as authRouter };
