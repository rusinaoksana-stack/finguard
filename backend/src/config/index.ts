import dotenv from "dotenv";

dotenv.config();

export const config = {
  PORT: process.env.PORT || "4000",
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/finguard",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  JWT_SECRET: process.env.JWT_SECRET || "supersecretjwtkey",
};
