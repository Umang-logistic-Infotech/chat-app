import {
  Conversations,
  Messages,
  ConversationParticipants,
  ActiveUsers,
  Users,
} from "../Models/index.js";
import { Op } from "sequelize";
import { sendNotification,buildNotificationPayload } from "../sse/notificationService.js";



export default function setupSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("register", async (userId) => {
      try {
        // ── Step 1: Mark user online (unchanged) ────────────────────────────
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

        // ── Step 2: Find all undelivered messages for this user ──────────────
        // These are messages sent while user was offline
        // status "sent" means saved in DB but never delivered to receiver
        const undeliveredMessages = await Messages.findAll({
          where: {
            status: "sent",                    // only "sent" → not yet delivered
            conversation_id: {
              // Only messages in conversations this user participates in
              [Op.in]: (
                await ConversationParticipants.findAll({
                  where: { user_id: userId },
                  attributes: ["conversation_id"],
                })
              ).map((p) => p.conversation_id),
            },
            sender_id: { [Op.ne]: userId },    // not their own messages
          },
        });

        if (undeliveredMessages.length === 0) return;

        console.log(
          `📬 ${undeliveredMessages.length} undelivered messages found for userId: ${userId}`
        );

        // ── Step 3: Group messages by sender ────────────────────────────────
        // We need to notify each sender about their message status update
        // Grouping avoids redundant DB lookups for same sender
        const senderMap = new Map();

        for (const msg of undeliveredMessages) {

          // ── Update message status to "delivered" in DB ───────────────────
          await msg.update({ status: "delivered" });

          // ── Group by sender_id ───────────────────────────────────────────
          if (!senderMap.has(msg.sender_id)) {
            senderMap.set(msg.sender_id, []);
          }
          senderMap.get(msg.sender_id).push(msg);
        }

        // ── Step 4: Notify each sender their messages were delivered ─────────
        // For each unique sender → find their socket → emit status update
        for (const [senderId, msgs] of senderMap) {

          const senderStatus = await ActiveUsers.findOne({
            where: { user_id: senderId },
          });

          // Only notify if sender is currently online
          // If sender is also offline → they'll see status when they come back
          if (senderStatus?.status === "online" && senderStatus.socket_id) {

            for (const msg of msgs) {
              io.to(senderStatus.socket_id).emit("message_status_update", {
                messageId: msg.id,
                conversationId: msg.conversation_id,
                status: "delivered",
              });
            }

            console.log(
              `✅ Delivered status synced → senderId: ${senderId} | ${msgs.length} message(s)`
            );
          }
        }

      } catch (error) {
        console.error("❌ Error updating user status:", error);
      }
    });

    // socket.on(
    //   "send_message",
    //   async ({
    //     senderUserId,
    //     conversationId,
    //     message,
    //     message_type,
    //     image_url,
    //   }) => {
    //     try {
    //       if (!conversationId) {
    //         return socket.emit("error_message", "Conversation ID is required");
    //       }

    //       if (!senderUserId) {
    //         return socket.emit("error_message", "Sender ID is required");
    //       }

    //       // ← Old code was: if (!message) which blocked image messages
    //       if (message_type === "text" && !message) {
    //         return socket.emit("error_message", "Message is required");
    //       }

    //       if (message_type === "image" && !image_url) {
    //         return socket.emit("error_message", "Image URL is required");
    //       }

    //       const conversation = await Conversations.findByPk(conversationId);

    //       if (!conversation) {
    //         return socket.emit("error_message", "Conversation not found");
    //       }

    //       const isParticipant = await ConversationParticipants.findOne({
    //         where: {
    //           conversation_id: conversationId,
    //           user_id: senderUserId,
    //         },
    //       });

    //       if (!isParticipant) {
    //         return socket.emit(
    //           "error_message",
    //           "You are not a participant in this conversation",
    //         );
    //       }

    //       // ← Now saves message_type and image_url too
    //       const savedMessage = await Messages.create({
    //         sender_id: senderUserId,
    //         message: message || null,
    //         message_type: message_type || "text",
    //         image_url: image_url || null,
    //         conversation_id: conversationId,
    //         status: "sent",
    //       });

    //       const sender = await Users.findByPk(senderUserId, {
    //         attributes: ["id", "name", "profile_photo"],
    //       });

    //       // ← Now includes message_type and image_url in messageData
    //       const messageData = {
    //         id: savedMessage.id,
    //         sender_id: senderUserId,
    //         sender_name: sender.name,
    //         sender_photo: sender.profile_photo,
    //         message: savedMessage.message,
    //         message_type: savedMessage.message_type,
    //         image_url: savedMessage.image_url,
    //         conversation_id: conversationId,
    //         createdAt: savedMessage.createdAt,
    //         status: "sent",
    //         type: conversation.type,
    //       };

    //       socket.emit("message_sent", {
    //         messageId: savedMessage.id,
    //         conversationId: conversationId,
    //         message: messageData,
    //       });

    //       const participants = await ConversationParticipants.findAll({
    //         where: {
    //           conversation_id: conversationId,
    //           user_id: { [Op.ne]: senderUserId },
    //         },
    //       });

    //       let deliveredToAtLeastOne = false;

    //       for (const participant of participants) {
    //         const receiverUserId = participant.user_id;

    //         const receiverStatus = await ActiveUsers.findOne({
    //           where: { user_id: receiverUserId },
    //         });

    //         // ── Determine conversation type for notification ───────────────────
    //         // 'group_message' if group conversation, 'new_message' if private
    //         const notificationType =
    //           conversation.type === "group" ? "group_message" : "new_message";

    //         // ── Build notification payload from existing messageData ───────────
    //         // buildNotificationPayload shapes the data for the frontend toast
    //         const notificationPayload = buildNotificationPayload(
    //           messageData,
    //           notificationType
    //         );

    //         if (
    //           receiverStatus?.status === "online" &&
    //           receiverStatus.socket_id
    //         ) {
    //           deliveredToAtLeastOne = true;

    //           // ── Existing socket emit (unchanged) ────────────────────────────
    //           io.to(receiverStatus.socket_id).emit("receive_message", {
    //             ...messageData,
    //             receiver_id: receiverUserId,
    //             status: "delivered",
    //           });

    //           // ── NEW: Push SSE notification to online user ────────────────────
    //           // Runs alongside socket emit — separate concern
    //           // If user has SSE connection → instant push
    //           // If not (SSE not yet connected) → queued in DB
    //           await sendNotification(receiverUserId, notificationPayload);

    //         } else {
    //           console.log(`⚠️ User ${receiverUserId} is offline`);

    //           // ── NEW: Queue SSE notification for offline user ─────────────────
    //           // Saved to queued_notifications table
    //           // Flushed when user reconnects SSE stream
    //           await sendNotification(receiverUserId, notificationPayload);
    //         }
    //       }

    //       if (deliveredToAtLeastOne) {
    //         await savedMessage.update({ status: "delivered" });

    //         socket.emit("message_status_update", {
    //           messageId: savedMessage.id,
    //           conversationId: conversationId,
    //           status: "delivered",
    //         });
    //       } else {
    //         console.log(
    //           `⚠️ No participants online, message will be delivered later`,
    //         );
    //       }
    //     } catch (err) {
    //       console.error("❌ send_message error:", err);
    //       socket.emit("error_message", "Failed to send message");
    //     }
    //   },
    // );





    socket.on(
  "send_message",
  async ({
    senderUserId,
    conversationId,
    message,
    message_type,
    image_url,
  }) => {
    try {
      if (!conversationId) {
        return socket.emit("error_message", "Conversation ID is required");
      }

      if (!senderUserId) {
        return socket.emit("error_message", "Sender ID is required");
      }

      if (message_type === "text" && !message) {
        return socket.emit("error_message", "Message is required");
      }

      if (message_type === "image" && !image_url) {
        return socket.emit("error_message", "Image URL is required");
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
        message: message || null,
        message_type: message_type || "text",
        image_url: image_url || null,
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
        message_type: savedMessage.message_type,
        image_url: savedMessage.image_url,
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

        // ── Determine notification type ──────────────────────────────────
        // group_message if group conversation, new_message if private
        const notificationType =
          conversation.type === "group" ? "group_message" : "new_message";

        // ── Build notification payload from existing messageData ─────────
        // Shapes the data consistently for the frontend toast
        const notificationPayload = buildNotificationPayload(
          messageData,
          notificationType
        );

        if (
          receiverStatus?.status === "online" &&
          receiverStatus.socket_id
        ) {
          deliveredToAtLeastOne = true;

          // ── Existing socket emit (unchanged) ────────────────────────
          io.to(receiverStatus.socket_id).emit("receive_message", {
            ...messageData,
            receiver_id: receiverUserId,
            status: "delivered",
          });

          // ── NEW: Push SSE notification to online user ────────────────
          // Runs alongside socket emit — completely separate concern
          // Socket → delivers the actual message to chat UI
          // SSE    → delivers the notification toast
          await sendNotification(receiverUserId, notificationPayload);

        } else {
          console.log(`⚠️ User ${receiverUserId} is offline`);

          // ── NEW: Queue SSE notification for offline user ─────────────
          // No SSE connection → saved to queued_notifications table
          // Flushed automatically when user reconnects SSE stream
          await sendNotification(receiverUserId, notificationPayload);
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
