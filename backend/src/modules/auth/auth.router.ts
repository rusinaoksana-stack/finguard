import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../../config";
import { authMiddleware } from "./auth.middleware";
import { prisma } from "../../lib/prisma";

const router = Router();

function createAccountNumber() {
  return `FG-${Math.floor(10000000 + Math.random() * 90000000)}`;
}

function createToken(user: { id: string; email: string; role: string }) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.JWT_SECRET, {
    expiresIn: "8h",
  });
}

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ message: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "user",
      accounts: {
        create: {
          accountNumber: createAccountNumber(),
          balance: 0,
          currency: "EUR",
          status: "active",
        },
      },
    },
  });
  const token = createToken(user);

  return res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    accessToken: token,
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = createToken(user);

  return res.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    accessToken: token,
  });
});

router.get("/me", authMiddleware, (req, res) => {
  return res.json({ user: (req as any).user });
});

export { router as authRouter };
