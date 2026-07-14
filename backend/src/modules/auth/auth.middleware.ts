import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { config } from "../../config";

type TokenPayload = {
  sub?: string;
  email?: string;
  role?: UserRole;
};

export function verifyAccessToken(token: string): Express.UserContext {
  const payload = jwt.verify(token, config.JWT_SECRET) as TokenPayload;

  if (!payload.sub || !payload.email || !payload.role) {
    throw new Error("Invalid token payload");
  }

  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
