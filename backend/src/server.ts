import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import { config } from "./config";
import { authRouter } from "./modules/auth/auth.router";
import { accountsRouter } from "./modules/accounts/accounts.router";
import { transactionsRouter } from "./modules/transactions/transactions.router";
import { disputesRouter } from "./modules/disputes/disputes.router";
import { supportRouter } from "./modules/support/support.router";

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

app.use(cors(corsOptions));
app.use(express.json());

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

io.on("connection", (socket) => {
  console.log("Socket connected", socket.id);
  socket.on("admin:updateStatus", (payload) => {
    socket.broadcast.emit("status:updated", payload);
  });
});

const port = config.PORT || 4000;
server.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
