import express from "express";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import verifyJWTToken from "./middleware/verifyJwt.js";
import setupSocketHandlers from "./socket/socketHandler.js";

import "./config/db.js";
import "./Models/index.js";
import UserRoutes from "./Routes/UserRoutes.js";
import ConversationRoutes from "./Routes/ConversationRoutes.js";
import GroupRoutes from "./Routes/GroupRoutes.js";
import TestRoutes from "./Routes/TestRoutes.js";

const app = express();
const httpServer = http.createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Middleware ───────────────────────────────────────────────
app.use(
  cors({
    origin: "http://192.168.0.131:3000",
    credentials: true,
  }),
);

app.use((req, res, next) => {
  const publicRoutes = ["users/login", "users/register"];

  if (publicRoutes.some((r) => req.path.includes(r))) {
    return next();
  }

  verifyJWTToken(req, res, next);
});
app.use(express.json());
app.use(cookieParser());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/users", UserRoutes);
app.use("/conversations", ConversationRoutes);
app.use("/conversations/group", GroupRoutes);
app.use("/test", TestRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// ─── Socket.io Setup ────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONT_END_URL,
    credentials: true,
  },
});

// ─── Setup Socket Handlers ──────────────────────────────────
setupSocketHandlers(io);

// ─── Listen (use httpServer, not app) ─────────────────────────
const PORT = process.env.PORT;
// httpServer.listen(PORT, () => {
httpServer.listen(PORT, "192.168.0.131", () => {
  console.log(`🚀 Server running on port http://192.168.0.131:${PORT}`);
});
