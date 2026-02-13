import {
  Conversations,
  Messages,
  ConversationParticipants,
  ActiveUsers,
  Users,
} from "../Models/index.js";
import { Op } from "sequelize";

export default function setupSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    // User registers their socket connection
    socket.on("register", async (userId) => {
      try {
        await ActiveUsers.upsert({
          user_id: userId,
          status: "online",
          socket_id: socket.id,
          last_seen: new Date(),
        });

        io.emit("user_status_changed", {
          user_id: userId,
          status: "online",
        });

        console.log(`✅ User ${userId} is now online`);
      } catch (error) {
        console.error("❌ Error updating user status:", error);
      }
    });

    // ─── SEND MESSAGE TO CONVERSATION ────────────────────────────────
    socket.on(
      "send_message",
      async ({ senderUserId, conversationId, message }) => {
        console.log(
          "📨 Sending message from",
          senderUserId,
          "to conversation",
          conversationId,
        );

        try {
          if (!conversationId) {
            return socket.emit("error_message", "Conversation ID is required");
          }

          if (!senderUserId) {
            return socket.emit("error_message", "Sender ID is required");
          }

          if (!message) {
            return socket.emit("error_message", "Message is required");
          }

          // Find the conversation
          const conversation = await Conversations.findByPk(conversationId);

          if (!conversation) {
            return socket.emit("error_message", "Conversation not found");
          }

          // Verify sender is a participant in this conversation
          const isParticipant = await ConversationParticipants.findOne({
            where: {
              conversation_id: conversationId,
              user_id: senderUserId,
            },
          });

          if (!isParticipant) {
            return socket.emit(
              "error_message",
              "You are not a participant in this conversation",
            );
          }

          // Create the message
          const savedMessage = await Messages.create({
            sender_id: senderUserId,
            message,
            conversation_id: conversationId,
            status: "sent",
          });

          console.log(`✅ Message saved with ID: ${savedMessage.id}`);

          // Emit confirmation to sender
          socket.emit("message_sent", {
            messageId: savedMessage.id,
            conversationId: conversationId,
            message: savedMessage,
          });

          console.log(
            `✅ Sent confirmation to sender with conversationId: ${conversationId}`,
          );

          // Get all participants in this conversation (except the sender)
          const participants = await ConversationParticipants.findAll({
            where: {
              conversation_id: conversationId,
              user_id: { [Op.ne]: senderUserId }, // Exclude sender
            },
          });

          console.log(`📤 Sending to ${participants.length} participant(s)`);

          let deliveredToAtLeastOne = false;

          // Send message to all online participants
          for (const participant of participants) {
            const receiverUserId = participant.user_id;

            // Get participant's online status
            const receiverStatus = await ActiveUsers.findOne({
              where: { user_id: receiverUserId },
            });

            if (
              receiverStatus?.status === "online" &&
              receiverStatus.socket_id
            ) {
              deliveredToAtLeastOne = true;

              io.to(receiverStatus.socket_id).emit("receive_message", {
                id: savedMessage.id,
                sender_id: senderUserId,
                receiver_id: receiverUserId,
                message: savedMessage.message,
                conversation_id: conversationId,
                createdAt: savedMessage.createdAt,
                status: "delivered",
              });

              console.log(`✅ Message delivered to user ${receiverUserId}`);
            } else {
              console.log(`⚠️ User ${receiverUserId} is offline`);
            }
          }

          // Update message status to delivered if at least one participant received it
          if (deliveredToAtLeastOne) {
            await savedMessage.update({ status: "delivered" });

            socket.emit("message_delivered", {
              messageId: savedMessage.id,
              conversationId: conversationId,
            });

            console.log(`✅ Message status updated to delivered`);
          } else {
            console.log(
              `⚠️ No participants online, message will be delivered later`,
            );
          }
        } catch (err) {
          console.error("❌ send_message error:", err);
          socket.emit("error_message", "Failed to send message");
        }
      },
    );

    // ─── MESSAGE DELIVERED ──────────────────────────────────────
    socket.on("message_delivered", async (messageId) => {
      try {
        const message = await Messages.findByPk(messageId);
        if (message) {
          await message.update({ status: "delivered" });

          const senderStatus = await ActiveUsers.findOne({
            where: { user_id: message.sender_id },
          });

          if (senderStatus?.socket_id) {
            io.to(senderStatus.socket_id).emit("message_delivered", {
              messageId: message.id,
              conversationId: message.conversation_id,
            });
          }
        }
      } catch (err) {
        console.error("❌ message_delivered error:", err);
      }
    });

    // ─── MESSAGE READ ───────────────────────────────────────────
    socket.on("message_read", async (messageId) => {
      try {
        const message = await Messages.findByPk(messageId);
        if (message) {
          await message.update({ status: "read" });

          const senderStatus = await ActiveUsers.findOne({
            where: { user_id: message.sender_id },
          });

          if (senderStatus?.socket_id) {
            io.to(senderStatus.socket_id).emit("message_read", {
              messageId: message.id,
              conversationId: message.conversation_id,
            });
          }
        }
      } catch (err) {
        console.error("❌ message_read error:", err);
      }
    });

    // ─── DISCONNECT ─────────────────────────────────────────────
    socket.on("disconnect", async () => {
      try {
        const activeUser = await ActiveUsers.findOne({
          where: { socket_id: socket.id },
        });

        if (activeUser) {
          await activeUser.update({
            status: "offline",
            last_seen: new Date(),
            socket_id: null,
          });

          io.emit("user_status_changed", {
            user_id: activeUser.user_id,
            status: "offline",
            last_seen: activeUser.last_seen,
          });

          console.log(`❌ User ${activeUser.user_id} is now offline`);
        }
      } catch (error) {
        console.error("❌ Error updating user status on disconnect:", error);
      }
    });
  });
}
