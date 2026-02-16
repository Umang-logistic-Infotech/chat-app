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
      } catch (error) {
        console.error("❌ Error updating user status:", error);
      }
    });

    socket.on(
      "send_message",
      async ({ senderUserId, conversationId, message }) => {
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

          const conversation = await Conversations.findByPk(conversationId);

          if (!conversation) {
            return socket.emit("error_message", "Conversation not found");
          }

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

          const savedMessage = await Messages.create({
            sender_id: senderUserId,
            message,
            conversation_id: conversationId,
            status: "sent",
          });

          const sender = await Users.findByPk(senderUserId, {
            attributes: ["id", "name", "profile_photo"],
          });

          const messageData = {
            id: savedMessage.id,
            sender_id: senderUserId,
            sender_name: sender.name,
            sender_photo: sender.profile_photo,
            message: savedMessage.message,
            conversation_id: conversationId,
            createdAt: savedMessage.createdAt,
            status: "sent",
            type: conversation.type,
          };

          socket.emit("message_sent", {
            messageId: savedMessage.id,
            conversationId: conversationId,
            message: messageData,
          });

          const participants = await ConversationParticipants.findAll({
            where: {
              conversation_id: conversationId,
              user_id: { [Op.ne]: senderUserId },
            },
          });

          let deliveredToAtLeastOne = false;

          for (const participant of participants) {
            const receiverUserId = participant.user_id;

            const receiverStatus = await ActiveUsers.findOne({
              where: { user_id: receiverUserId },
            });

            if (
              receiverStatus?.status === "online" &&
              receiverStatus.socket_id
            ) {
              deliveredToAtLeastOne = true;

              io.to(receiverStatus.socket_id).emit("receive_message", {
                ...messageData,
                receiver_id: receiverUserId,
                status: "delivered",
              });
            } else {
              console.log(`⚠️ User ${receiverUserId} is offline`);
            }
          }

          if (deliveredToAtLeastOne) {
            await savedMessage.update({ status: "delivered" });

            socket.emit("message_status_update", {
              messageId: savedMessage.id,
              conversationId: conversationId,
              status: "delivered",
            });
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

    socket.on("message_delivered", async (messageId) => {
      try {
        const message = await Messages.findByPk(messageId);
        if (message && message.status !== "read") {
          await message.update({ status: "delivered" });

          const senderStatus = await ActiveUsers.findOne({
            where: { user_id: message.sender_id },
          });

          if (senderStatus?.socket_id) {
            io.to(senderStatus.socket_id).emit("message_status_update", {
              messageId: message.id,
              conversationId: message.conversation_id,
              status: "delivered",
            });
          }
        }
      } catch (err) {
        console.error("❌ message_delivered error:", err);
      }
    });

    socket.on("message_read", async (messageId) => {
      try {
        const message = await Messages.findByPk(messageId);
        if (message) {
          await message.update({ status: "read" });

          const senderStatus = await ActiveUsers.findOne({
            where: { user_id: message.sender_id },
          });

          if (senderStatus?.socket_id) {
            io.to(senderStatus.socket_id).emit("message_status_update", {
              messageId: message.id,
              conversationId: message.conversation_id,
              status: "read",
            });
          }
        }
      } catch (err) {
        console.error("❌ message_read error:", err);
      }
    });

    socket.on("typing_start", async ({ conversationId, userId, userName }) => {
      try {
        const participants = await ConversationParticipants.findAll({
          where: {
            conversation_id: conversationId,
            user_id: { [Op.ne]: userId },
          },
        });

        for (const participant of participants) {
          const receiverStatus = await ActiveUsers.findOne({
            where: { user_id: participant.user_id },
          });

          if (receiverStatus?.status === "online" && receiverStatus.socket_id) {
            io.to(receiverStatus.socket_id).emit("user_typing", {
              conversationId,
              userId,
              userName,
              isTyping: true,
            });
          }
        }
      } catch (err) {
        console.error("❌ typing_start error:", err);
      }
    });

    socket.on("typing_stop", async ({ conversationId, userId }) => {
      try {
        const participants = await ConversationParticipants.findAll({
          where: {
            conversation_id: conversationId,
            user_id: { [Op.ne]: userId },
          },
        });

        for (const participant of participants) {
          const receiverStatus = await ActiveUsers.findOne({
            where: { user_id: participant.user_id },
          });

          if (receiverStatus?.status === "online" && receiverStatus.socket_id) {
            io.to(receiverStatus.socket_id).emit("user_typing", {
              conversationId,
              userId,
              isTyping: false,
            });
          }
        }
      } catch (err) {
        console.error("❌ typing_stop error:", err);
      }
    });

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

          console.log(`✅ User ${activeUser.user_id} marked as offline`);
        }
      } catch (error) {
        console.error("❌ Error updating user status on disconnect:", error);
      }
    });
  });
}
