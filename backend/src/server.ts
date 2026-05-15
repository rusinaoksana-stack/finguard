import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import { config } from "./config";
import { authRouter } from "./modules/auth/auth.router";
import { transactionsRouter } from "./modules/transactions/transactions.router";
import { disputesRouter } from "./modules/disputes/disputes.router";

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: config.FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: config.FRONTEND_ORIGIN }));
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/disputes", disputesRouter);

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
