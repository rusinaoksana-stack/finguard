import dotenv from "dotenv";

dotenv.config();

const nodeEnv = process.env.NODE_ENV || "development";

function requiredEnv(name: string, fallback?: string) {
  const value = process.env[name];
  if (value) return value;

  if (nodeEnv !== "production" && fallback) {
    process.stderr.write(`Missing ${name}; using development fallback.\n`);
    return fallback;
  }

  throw new Error(`Missing required environment variable: ${name}`);
}

export const config = {
  NODE_ENV: nodeEnv,
  PORT: process.env.PORT || "4000",
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  DATABASE_URL: requiredEnv("DATABASE_URL", "postgresql://user:password@localhost:5432/finguard"),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  JWT_SECRET: requiredEnv("JWT_SECRET", "development-only-jwt-secret-change-me"),
};
