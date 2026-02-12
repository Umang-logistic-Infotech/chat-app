import {
  Conversations,
  ConversationParticipants,
  Users,
} from "../Models/index.js";
import express from "express";

const router = express.Router();

// Create a new conversation (private or group)
router.post("/create", async (req, res) => {
  try {
    const {
      sender_id,
      receiver_id,
      type,
      name,
      description,
      group_photo,
      participant_ids,
    } = req.body;

    // Validation based on conversation type
    if (type === "private") {
      // For private chat: need sender_id and receiver_id
      if (!sender_id || !receiver_id) {
        return res.status(400).json({
          error:
            "sender_id and receiver_id are required for private conversations",
        });
      }

      if (sender_id === receiver_id) {
        return res.status(400).json({
          error: "Cannot create conversation with yourself",
        });
      }

      // Check if private conversation already exists between these two users
      const existingConversations = await ConversationParticipants.findAll({
        where: { user_id: [sender_id, receiver_id] },
        attributes: ["conversation_id"],
        include: [
          {
            model: Conversations,
            as: "conversation",
            where: { type: "private" },
          },
        ],
      });

      // Check if any conversation has exactly these 2 participants
      const conversationIds = existingConversations.map(
        (p) => p.conversation_id,
      );
      const uniqueConvIds = [...new Set(conversationIds)];

      for (const convId of uniqueConvIds) {
        const participantCount = await ConversationParticipants.count({
          where: { conversation_id: convId },
        });

        if (participantCount === 2) {
          // Conversation already exists
          const existingConversation = await Conversations.findByPk(convId, {
            include: [
              {
                model: Users,
                as: "participants",
                attributes: ["id", "name", "profile_photo", "phone_number"],
                through: { attributes: ["role"] },
              },
            ],
          });

          return res.status(200).json({
            message: "Conversation already exists",
            conversation: existingConversation,
            isNew: false,
          });
        }
      }

      // Create new private conversation
      const conversation = await Conversations.create({
        type: "private",
      });

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

      // Fetch complete conversation with participants
      const completeConversation = await Conversations.findByPk(
        conversation.id,
        {
          include: [
            {
              model: Users,
              as: "participants",
              attributes: ["id", "name", "profile_photo", "phone_number"],
              through: { attributes: ["role"] },
            },
          ],
        },
      );

      return res.status(201).json({
        message: "Private conversation created successfully",
        conversation: completeConversation,
        isNew: true,
      });
    } else if (type === "group") {
      // For group chat: need name, sender_id (creator), and participant_ids
      if (!name || !sender_id) {
        return res.status(400).json({
          error:
            "name and sender_id (creator) are required for group conversations",
        });
      }

      if (
        !participant_ids ||
        !Array.isArray(participant_ids) ||
        participant_ids.length < 2
      ) {
        return res.status(400).json({
          error: "At least 2 participants are required for group conversations",
        });
      }

      // Ensure sender is in participant list
      const allParticipants = [...new Set([sender_id, ...participant_ids])];

      // Create group conversation
      const conversation = await Conversations.create({
        type: "group",
        name,
        description: description || null,
        group_photo: group_photo || null,
        created_by: sender_id,
      });

      // Add all participants (creator as admin, others as members)
      const participantsData = allParticipants.map((userId) => ({
        conversation_id: conversation.id,
        user_id: userId,
        role: userId === sender_id ? "admin" : "member",
      }));

      await ConversationParticipants.bulkCreate(participantsData);

      // Fetch complete conversation with participants
      const completeConversation = await Conversations.findByPk(
        conversation.id,
        {
          include: [
            {
              model: Users,
              as: "participants",
              attributes: ["id", "name", "profile_photo", "phone_number"],
              through: { attributes: ["role"] },
            },
            {
              model: Users,
              as: "creator",
              attributes: ["id", "name", "profile_photo"],
            },
          ],
        },
      );

      return res.status(201).json({
        message: "Group conversation created successfully",
        conversation: completeConversation,
        isNew: true,
      });
    } else {
      return res.status(400).json({
        error: "Invalid conversation type. Must be 'private' or 'group'",
      });
    }
  } catch (err) {
    console.error("Error creating conversation:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
