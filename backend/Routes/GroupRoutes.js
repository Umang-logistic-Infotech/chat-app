import express from "express";
import {
  Messages,
  Conversations,
  ConversationParticipants,
  Users,
} from "../Models/index.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/create", upload.single("group_photo"), async (req, res) => {
  try {
    const { name, description, memberIds, createdBy } = req.body;

    console.log("Creating group with data:", {
      name,
      description,
      memberIds,
      createdBy,
      file: req.file,
    });

    const parsedMemberIds = JSON.parse(memberIds);

    if (!name || !parsedMemberIds || parsedMemberIds.length < 2) {
      return res.status(400).json({
        error: "Group name and at least 2 members are required",
      });
    }

    let groupPhotoUrl = null;
    if (req.file) {
      groupPhotoUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

    const conversation = await Conversations.create({
      type: "group",
      name,
      description,
      created_by: createdBy,
      group_photo: groupPhotoUrl,
    });

    console.log("Conversation created:", conversation.id);

    const participantsData = parsedMemberIds.map((userId) => ({
      conversation_id: conversation.id,
      user_id: userId,
      role: String(userId) === String(createdBy) ? "admin" : "member",
    }));

    await ConversationParticipants.bulkCreate(participantsData);

    console.log("Participants created");

    const groupData = await Conversations.findOne({
      where: { id: conversation.id },
      include: [
        {
          model: ConversationParticipants,
          as: "participants",
          include: [
            {
              model: Users,
              as: "user",
              attributes: ["id", "name", "profile_photo", "phone_number"],
            },
          ],
        },
        {
          model: Users,
          as: "creator",
          attributes: ["id", "name", "profile_photo"],
        },
      ],
    });

    console.log("Group data fetched:", groupData);

    res.status(201).json({
      success: true,
      group: groupData,
      message: "Group created successfully",
    });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const groups = await Conversations.findAll({
      where: { type: "group" },
      include: [
        {
          model: ConversationParticipants,
          as: "participants",
          where: { user_id: userId },
          required: true,
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    res.json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Conversations.findOne({
      where: { id: groupId, type: "group" },
      include: [
        {
          model: ConversationParticipants,
          as: "participants",
          include: [
            {
              model: Users,
              as: "user",
              attributes: ["id", "name", "profile_photo", "phone_number"],
            },
          ],
        },
      ],
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.json(group);
  } catch (error) {
    console.error("Error fetching group details:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/:groupId/add-members", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds, addedBy } = req.body;

    const participant = await ConversationParticipants.findOne({
      where: {
        conversation_id: groupId,
        user_id: addedBy,
        role: "admin",
      },
    });

    if (!participant) {
      return res.status(403).json({
        error: "Only admins can add members",
      });
    }

    const memberPromises = memberIds.map((userId) =>
      ConversationParticipants.findOrCreate({
        where: {
          conversation_id: groupId,
          user_id: userId,
        },
        defaults: {
          role: "member",
        },
      }),
    );

    await Promise.all(memberPromises);

    res.json({
      success: true,
      message: "Members added successfully",
    });
  } catch (error) {
    console.error("Error adding members:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:groupId/remove-member/:userId", async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const { removedBy } = req.body;

    const adminParticipant = await ConversationParticipants.findOne({
      where: {
        conversation_id: groupId,
        user_id: removedBy,
        role: "admin",
      },
    });

    if (!adminParticipant) {
      return res.status(403).json({
        error: "Only admins can remove members",
      });
    }

    await ConversationParticipants.destroy({
      where: {
        conversation_id: groupId,
        user_id: userId,
      },
    });

    res.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/:groupId/leave", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    await ConversationParticipants.destroy({
      where: {
        conversation_id: groupId,
        user_id: userId,
      },
    });

    res.json({
      success: true,
      message: "Left group successfully",
    });
  } catch (error) {
    console.error("Error leaving group:", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/:groupId", upload.single("group_photo"), async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, updatedBy } = req.body;

    const participant = await ConversationParticipants.findOne({
      where: {
        conversation_id: groupId,
        user_id: updatedBy,
        role: "admin",
      },
    });

    if (!participant) {
      return res.status(403).json({
        error: "Only admins can update group info",
      });
    }

    const updateData = {
      name,
      description,
    };

    if (req.file) {
      updateData.group_photo = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }

    await Conversations.update(updateData, {
      where: { id: groupId, type: "group" },
    });

    const updatedGroup = await Conversations.findOne({
      where: { id: groupId },
      include: [
        {
          model: ConversationParticipants,
          as: "participants",
          include: [
            {
              model: Users,
              as: "user",
              attributes: ["id", "name", "profile_photo"],
            },
          ],
        },
      ],
    });

    res.json({
      success: true,
      group: updatedGroup,
      message: "Group updated successfully",
    });
  } catch (error) {
    console.error("Error updating group:", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/:groupId/make-admin/:userId", async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const { madeBy } = req.body;

    const adminParticipant = await ConversationParticipants.findOne({
      where: {
        conversation_id: groupId,
        user_id: madeBy,
        role: "admin",
      },
    });

    if (!adminParticipant) {
      return res.status(403).json({
        error: "Only admins can make others admin",
      });
    }

    await ConversationParticipants.update(
      { role: "admin" },
      {
        where: {
          conversation_id: groupId,
          user_id: userId,
        },
      },
    );

    res.json({
      success: true,
      message: "Member is now an admin",
    });
  } catch (error) {
    console.error("Error making member admin:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
