import express from "express";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import cors from "cors";
import verifyJWTToken from "./middleware/verifyJwt.js";
import setupSocketHandlers from "./socket/socketHandler.js";

import "./config/db.js";
import "./Models/index.js";
import UserRoutes from "./Routes/UserRoutes.js";
import ConversationRoutes from "./Routes/ConversationRoutes.js";
import GroupRoutes from "./Routes/GroupRoutes.js";
import MessageRoutes from "./Routes/MessageRoutes.js";
import notificationRouter from "./Routes/NotificationRoutes.js";
import startSSETokenCleanup from "./utils/cleanupSSETokens.js";
import callRoutes from "./Routes/callRoutes.js";
const app = express();
const httpServer = http.createServer(app);

// ─── Step 1: CORS first (must be before everything) ──────────
app.use(
  cors({
    origin: [process.env.FRONT_END_URL_NETWORK, process.env.FRONT_END_URL],
    credentials: true,
  }),
);

// ─── Step 2: Body parsers (must be before any route) ─────────
app.use(express.json());
app.use(cookieParser());

// ─── Step 3: Public routes (no JWT needed) ───────────────────
app.use("/users", UserRoutes); // login + register are public

// ─── Step 4: JWT verification for all routes below ───────────
app.use((req, res, next) => {
  const publicRoutes = ["users/login", "users/register","notifications/stream"]; // add any other public routes here
  if (publicRoutes.some((r) => req.path.includes(r))) {
    return next();
  }
  verifyJWTToken(req, res, next);
});

// ─── Step 5: Protected routes (JWT verified above) ───────────
app.use("/notifications", notificationRouter); // ✅ now JWT protected
app.use("/conversations", ConversationRoutes);
app.use("/api", MessageRoutes);
app.use("/conversations/group", GroupRoutes);
app.use("/calls", callRoutes);

app.get("/", (req, res) => res.send("Hello World!"));

// ─── Step 6: Socket.io Setup ─────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: [process.env.FRONT_END_URL_NETWORK, process.env.FRONT_END_URL],
    credentials: true,
  },
});

setupSocketHandlers(io);

// ─── Step 7: SSE Token Cleanup Job ───────────────────────────
startSSETokenCleanup();

// ─── Step 8: Start Server ─────────────────────────────────────
const PORT = process.env.PORT;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port http://192.168.0.131:${PORT}`);
});