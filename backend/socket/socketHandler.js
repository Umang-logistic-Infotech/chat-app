import {
  Conversations,
  Messages,
  ConversationParticipants,
  ActiveUsers,
} from "../Models/index.js";

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

    // ─── SEND MESSAGE (PRIVATE OR GROUP) ────────────────────────────
    socket.on(
      "send_message",
      async ({
        senderUserId,
        conversationId,
        receiverUserId,
        message,
        conversationType,
      }) => {
        try {
          let conversation;

          // ─── PRIVATE CHAT ─────────────────────────────────────────
          if (conversationType === "private" || receiverUserId) {
            const user1 = Math.min(senderUserId, receiverUserId);
            const user2 = Math.max(senderUserId, receiverUserId);

            // Find existing private conversation between these two users
            const existingConversations =
              await ConversationParticipants.findAll({
                where: { user_id: [user1, user2] },
                attributes: ["conversation_id"],
                include: [
                  {
                    model: Conversations,
                    as: "conversation",
                    where: { type: "private" },
                  },
                ],
              });

            // Group by conversation_id and find one with exactly 2 participants
            const conversationIds = existingConversations.map(
              (p) => p.conversation_id,
            );
            const uniqueConvIds = [...new Set(conversationIds)];

            let foundConversation = null;
            for (const convId of uniqueConvIds) {
              const participantCount = await ConversationParticipants.count({
                where: { conversation_id: convId },
              });
              if (participantCount === 2) {
                foundConversation = await Conversations.findByPk(convId);
                break;
              }
            }

            if (!foundConversation) {
              // Create new private conversation
              conversation = await Conversations.create({
                type: "private",
              });

              // Add both participants
              await ConversationParticipants.bulkCreate([
                {
                  conversation_id: conversation.id,
                  user_id: user1,
                  role: "member",
                },
                {
                  conversation_id: conversation.id,
                  user_id: user2,
                  role: "member",
                },
              ]);
            } else {
              conversation = foundConversation;
            }
          }
          // ─── GROUP CHAT ───────────────────────────────────────────
          else if (conversationId) {
            conversation = await Conversations.findByPk(conversationId);

            if (!conversation) {
              return socket.emit("error_message", "Conversation not found");
            }

            // Verify sender is a participant
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
          } else {
            return socket.emit(
              "error_message",
              "Invalid request: provide either receiverUserId or conversationId",
            );
          }

          // Create message with 'sent' status
          const savedMessage = await Messages.create({
            sender_id: senderUserId,
            message,
            conversation_id: conversation.id,
            status: "sent",
          });

          // 1. FIRST: Emit confirmation to sender
          socket.emit("message_sent", {
            messageId: savedMessage.id,
            conversationId: conversation.id,
            message: savedMessage,
          });

          // 2. SECOND: Send to all participants
          if (conversation.type === "private") {
            // ─── PRIVATE CHAT: Send to receiver ─────────────────────
            const receiverStatus = await ActiveUsers.findOne({
              where: { user_id: receiverUserId },
            });

            if (
              receiverStatus &&
              receiverStatus.status === "online" &&
              receiverStatus.socket_id
            ) {
              await savedMessage.update({ status: "delivered" });

              io.to(receiverStatus.socket_id).emit("receive_message", {
                id: savedMessage.id,
                sender_id: senderUserId,
                receiver_id: receiverUserId,
                message: savedMessage.message,
                conversation_id: conversation.id,
                createdAt: savedMessage.createdAt,
                status: "delivered",
              });

              socket.emit("message_delivered", {
                messageId: savedMessage.id,
                conversationId: conversation.id,
              });
            }
          } else {
            // ─── GROUP CHAT: Send to all participants except sender ─────
            const participants = await ConversationParticipants.findAll({
              where: { conversation_id: conversation.id },
            });

            let deliveredToAtLeastOne = false;

            for (const participant of participants) {
              // Skip sender
              if (participant.user_id === senderUserId) continue;

              // Get participant's active status
              const participantStatus = await ActiveUsers.findOne({
                where: { user_id: participant.user_id },
              });

              if (
                participantStatus &&
                participantStatus.status === "online" &&
                participantStatus.socket_id
              ) {
                deliveredToAtLeastOne = true;

                io.to(participantStatus.socket_id).emit("receive_message", {
                  id: savedMessage.id,
                  sender_id: senderUserId,
                  message: savedMessage.message,
                  conversation_id: conversation.id,
                  createdAt: savedMessage.createdAt,
                  status: "delivered",
                });
              }
            }

            // Update status to delivered if at least one participant is online
            if (deliveredToAtLeastOne) {
              await savedMessage.update({ status: "delivered" });

              socket.emit("message_delivered", {
                messageId: savedMessage.id,
                conversationId: conversation.id,
              });
            }
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

          // Get sender's active status
          const senderStatus = await ActiveUsers.findOne({
            where: { user_id: message.sender_id },
          });

          if (senderStatus && senderStatus.socket_id) {
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

          // Get sender's active status
          const senderStatus = await ActiveUsers.findOne({
            where: { user_id: message.sender_id },
          });

          if (senderStatus && senderStatus.socket_id) {
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
        // Find user by socket_id
        const activeUser = await ActiveUsers.findOne({
          where: { socket_id: socket.id },
        });

        if (activeUser) {
          // Update status to offline
          await activeUser.update({
            status: "offline",
            last_seen: new Date(),
            socket_id: null,
          });

          // Broadcast to all clients that this user is offline
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
