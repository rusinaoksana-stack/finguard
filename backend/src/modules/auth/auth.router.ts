import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { config } from "../../config";
import { authMiddleware } from "./auth.middleware";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { validateBody } from "../../lib/validation";

const router = Router();

function createAccountNumber() {
  return `FG-${crypto.randomInt(10000000, 100000000)}`;
}

function createToken(user: { id: string; email: string; role: string }) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.JWT_SECRET, {
    expiresIn: "8h",
  });
}

async function createUniqueAccountNumber() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const accountNumber = createAccountNumber();
    const existing = await prisma.account.findUnique({ where: { accountNumber } });
    if (!existing) return accountNumber;
  }

  throw new Error("Unable to generate a unique account number");
}

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

router.post("/register", authRateLimit, validateBody(registerSchema), asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

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
          accountNumber: await createUniqueAccountNumber(),
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
}));

router.post("/login", authRateLimit, validateBody(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;

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
}));

router.get("/me", authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});

export { router as authRouter };
