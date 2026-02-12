import express from "express";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import verifyJWTToken from "./middleware/verifyJwt.js";

import Conversations from "./Models/Conversations.js";
import "./config/db.js";
import UserRoutes from "./Routes/UserRoutes.js";
import TestRoutes from "./Routes/TestRoutes.js";
import Messages from "./Models/Messages.js";

const app = express();
const httpServer = http.createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Socket.io ────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONT_END_URL,
    credentials: true,
  },
});

const connectedUsers = {};

// Socket.IO connection
io.on("connection", (socket) => {
  socket.on("register", (userId) => {
    connectedUsers[userId] = socket.id;
  });

  socket.on(
    "send_message",
    async ({ senderUserId, receiverUserId, message }) => {
      try {
        const user1 = Math.min(senderUserId, receiverUserId);
        const user2 = Math.max(senderUserId, receiverUserId);

        const [conversation] = await Conversations.findOrCreate({
          where: { type: "private", user1_id: user1, user2_id: user2 },
          defaults: { type: "private", user1_id: user1, user2_id: user2 },
        });

        // Create message with 'sent' status
        const savedMessage = await Messages.create({
          sender_id: senderUserId,
          message,
          conversation_id: conversation.id,
          status: "sent", // Changed from 'sending' to 'sent'
        });

        // 1. FIRST: Emit confirmation to sender with conversationId
        socket.emit("message_sent", {
          messageId: savedMessage.id,
          conversationId: conversation.id,
          message: savedMessage,
        });

        // 2. SECOND: Send to receiver if online
        const receiverSocket = connectedUsers[receiverUserId];
        if (receiverSocket) {
          // Update status to delivered
          await savedMessage.update({ status: "delivered" });

          // Send message to receiver
          io.to(receiverSocket).emit("receive_message", {
            id: savedMessage.id,
            sender_id: senderUserId,
            receiver_id: receiverUserId,
            message: savedMessage.message,
            conversation_id: conversation.id,
            createdAt: savedMessage.createdAt,
            status: "delivered",
          });

          // 3. Notify sender that message was delivered
          socket.emit("message_delivered", {
            messageId: savedMessage.id,
            conversationId: conversation.id,
          });
        }
      } catch (err) {
        socket.emit("error_message", "Failed to send message");
      }
    },
  );

  // When receiver acknowledges delivery
  socket.on("message_delivered", async (messageId) => {
    try {
      const message = await Messages.findByPk(messageId);
      if (message) {
        await message.update({ status: "delivered" });

        // IMPORTANT: Notify the SENDER (not the current socket)
        const senderSocket = connectedUsers[message.sender_id];
        if (senderSocket) {
          io.to(senderSocket).emit("message_delivered", {
            messageId: message.id,
            conversationId: message.conversation_id,
          });
        }
      }
    } catch (err) {
      console.error("❌ message_delivered error:", err);
    }
  });

  // When receiver marks message as read
  socket.on("message_read", async (messageId) => {
    try {
      const message = await Messages.findByPk(messageId);
      if (message) {
        await message.update({ status: "read" });

        // IMPORTANT: Notify the SENDER (not the current socket)
        const senderSocket = connectedUsers[message.sender_id];
        if (senderSocket) {
          io.to(senderSocket).emit("message_read", {
            messageId: message.id,
            conversationId: message.conversation_id,
          });
        }
      }
    } catch (err) {
      console.error("❌ message_read error:", err);
    }
  });

  socket.on("disconnect", () => {
    const userId = Object.keys(connectedUsers).find(
      (key) => connectedUsers[key] === socket.id,
    );
    if (userId) delete connectedUsers[userId];
  });
});
// ─── Middleware ───────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONT_END_URL,
    credentials: true,
  }),
);

// app.use((req, res, next) => {
//   const publicRoutes = ["users/login", "users/register"];

//   if (publicRoutes.some((r) => req.path.includes(r))) {
//     return next();
//   }

//   verifyJWTToken(req, res, next);
// });
app.use(express.json());
app.use(cookieParser());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/users", UserRoutes);
app.use("/test", TestRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// ─── Listen (use httpServer, not app) ─────────────────────────
const PORT = process.env.PORT;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
