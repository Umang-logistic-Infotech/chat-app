import {
  Conversations,
  ConversationParticipants,
  Users,
} from "../Models/index.js";
import express from "express";
import { Op } from "sequelize";

const router = express.Router();

// Create a new private conversation
router.post("/create", async (req, res) => {
  try {
    const { sender_id, receiver_id } = req.body;

    // Validation
    if (!sender_id || !receiver_id) {
      return res.status(400).json({
        error: "sender_id and receiver_id are required",
      });
    }

    if (sender_id === receiver_id) {
      return res.status(400).json({
        error: "Cannot create conversation with yourself",
      });
    }

    // Check if both users exist in database
    const users = await Users.findAll({
      where: {
        id: {
          [Op.in]: [sender_id, receiver_id],
        },
      },
      attributes: ["id", "name", "profile_photo", "phone_number"],
    });

    if (users.length !== 2) {
      return res.status(404).json({
        error: "One or both users not found",
      });
    }

    // Check if private conversation already exists between these two users
    const existingConversations = await ConversationParticipants.findAll({
      where: {
        user_id: {
          [Op.in]: [sender_id, receiver_id],
        },
      },
      attributes: ["conversation_id"],
      include: [
        {
          model: Conversations,
          as: "conversation",
          where: { type: "private" },
          required: true,
        },
      ],
    });

    // Group by conversation_id and find one with exactly 2 participants
    const conversationIds = existingConversations.map((p) => p.conversation_id);
    const uniqueConvIds = [...new Set(conversationIds)];

    for (const convId of uniqueConvIds) {
      const participants = await ConversationParticipants.findAll({
        where: { conversation_id: convId },
        attributes: ["user_id"],
      });

      const participantIds = participants.map((p) => p.user_id);

      // Check if this conversation has exactly these 2 users
      if (
        participants.length === 2 &&
        participantIds.includes(sender_id) &&
        participantIds.includes(receiver_id)
      ) {
        // Conversation already exists - get the other user's info
        const existingConversation = await Conversations.findByPk(convId);

        const otherUser = users.find((u) => u.id !== sender_id);

        return res.status(200).json({
          message: "Conversation already exists",
          conversationId: existingConversation.id,
          ...otherUser.toJSON(),
          isNew: false,
        });
      }
    }

    // Create new private conversation
    const conversation = await Conversations.create({
      type: "private",
    });

    console.log("✅ Created new conversation with ID:", conversation.id);

    // Add both participants
    await ConversationParticipants.bulkCreate([
      {
        conversation_id: conversation.id,
        user_id: sender_id,
        role: "member",
      },
      {
        conversation_id: conversation.id,
        user_id: receiver_id,
        role: "member",
      },
    ]);

    // Get the other user's info
    const otherUser = users.find((u) => u.id !== sender_id);

    return res.status(201).json({
      message: "Private conversation created successfully",
      conversationId: conversation.id,
      ...otherUser.toJSON(),
      isNew: true,
    });
  } catch (err) {
    console.error("❌ Error creating conversation:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
