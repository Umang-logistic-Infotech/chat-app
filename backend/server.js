import express from "express";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const httpServer = http.createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import Conversations from "./TestModels/Conversations.js";
import "./config/db.js";
import UserRoutes from "./Routes/UserRoutes.js";
// import ConversationRoutes from "./Routes/ConversationRoutes.js";
import TestRoutes from "./Routes/TestRoutes.js";
import Messages from "./TestModels/Messages.js";

// ─── Socket.io ────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONT_END_URL,
    credentials: true,
  },
});

// Store connected users: { userId: socketId }
const connectedUsers = {};

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("🔗 Connected:", socket.id);

  // Register user
  socket.on("register", (userId) => {
    connectedUsers[userId] = socket.id;
    console.log(`✅ User ${userId} registered`);
  });

  // Send message
  socket.on(
    "send_message",
    async ({ senderUserId, receiverUserId, message }) => {
      try {
        // Normalize user order (user1 < user2)
        const user1 = Math.min(senderUserId, receiverUserId);
        const user2 = Math.max(senderUserId, receiverUserId);

        // Find or create conversation
        const [conversation] = await Conversations.findOrCreate({
          where: { type: "private", user1_id: user1, user2_id: user2 },
          defaults: { type: "private", user1_id: user1, user2_id: user2 },
        });

        // Save message in DB
        const savedMessage = await Messages.create({
          sender_id: senderUserId,
          message,
          conversation_id: conversation.id,
        });

        // Emit to receiver if online
        const receiverSocket = connectedUsers[receiverUserId];
        if (receiverSocket) {
          io.to(receiverSocket).emit("receive_message", savedMessage);
        }

        // Emit ack to sender
        socket.emit("message_sent", savedMessage);
      } catch (err) {
        console.error("❌ send_message error:", err);
        socket.emit("error_message", "Failed to send message");
      }
    },
  );

  // Disconnect
  socket.on("disconnect", () => {
    const userId = Object.keys(connectedUsers).find(
      (key) => connectedUsers[key] === socket.id,
    );
    if (userId) delete connectedUsers[userId];
    console.log(`👋 Disconnected: ${socket.id}`);
  });
});

// ─── Middleware ───────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONT_END_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Routes ───────────────────────────────────────────────────
app.use("/users", UserRoutes);
// app.use("/conversations", ConversationRoutes);
app.use("/test", TestRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// ─── Listen (use httpServer, not app) ─────────────────────────
const PORT = process.env.PORT;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
