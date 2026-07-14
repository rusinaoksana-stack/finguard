import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Server as SocketIOServer } from "socket.io";
import { config } from "./config";
import { authRouter } from "./modules/auth/auth.router";
import { accountsRouter } from "./modules/accounts/accounts.router";
import { transactionsRouter } from "./modules/transactions/transactions.router";
import { disputesRouter } from "./modules/disputes/disputes.router";
import { supportRouter } from "./modules/support/support.router";
import { auditorRouter } from "./modules/auditor/auditor.router";
import { verifyAccessToken } from "./modules/auth/auth.middleware";
import { HttpError } from "./lib/http-error";

const app = express();
const server = http.createServer(app);

const allowedOrigins = new Set([
  config.FRONTEND_ORIGIN,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
};

const io = new SocketIOServer(server, {
  cors: {
    origin: Array.from(allowedOrigins),
    methods: ["GET", "POST"],
  },
});

const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "256kb" }));
app.use(generalRateLimit);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "finguard-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/disputes", disputesRouter);
app.use("/api/support", supportRouter);
app.use("/api/auditor", auditorRouter);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message, details: error.details });
  }

  console.error("Unhandled API error", error);
  return res.status(500).json({ message: "Internal server error" });
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    next(new Error("Unauthorized"));
    return;
  }

  try {
    socket.data.user = verifyAccessToken(String(token));
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  console.log("Socket connected", socket.id);
  socket.on("admin:updateStatus", (payload) => {
    if (socket.data.user?.role !== "admin") {
      socket.emit("error", { message: "Auditor access is required" });
      return;
    }

    socket.broadcast.emit("status:updated", payload);
  });
});

const port = config.PORT || 4000;
server.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
