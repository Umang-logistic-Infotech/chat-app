import express from "express";
import jwt from "jsonwebtoken";
// import Users from "../Models/Users.js";
import upload from "../middleware/upload.js";
import { Op } from "sequelize";
import {
  Users,
  Conversations,
  ConversationParticipants,
  Messages,
} from "../Models/index.js";

const router = express.Router();

router.get("/list/:currentUserId", async (req, res) => {
  try {
    const currentUserId = parseInt(req.params.currentUserId);

    if (isNaN(currentUserId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const users = await Users.findAll({
      where: {
        id: { [Op.ne]: currentUserId },
      },
      attributes: ["id", "name", "phone_number", "profile_photo"],
      order: [["name", "ASC"]],
    });

    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Find user by phone number
router.get("/find-by-phone/:phoneNumber", async (req, res) => {
  try {
    const phoneNumber = req.params.phoneNumber;

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    const user = await Users.findOne({
      where: { phone_number: phoneNumber },
      attributes: ["id", "name", "phone_number", "profile_photo"],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error finding user by phone:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all users with their conversation IDs
router.get("/test/:id", async (req, res) => {
  try {
    const currentUserId = parseInt(req.params.id);

    if (isNaN(currentUserId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Get all users except current user
    const users = await Users.findAll({
      where: {
        id: { [Op.ne]: currentUserId },
      },
      attributes: ["id", "name", "phone_number", "profile_photo"],
    });

    // Get all private conversations where current user is a participant
    const userParticipations = await ConversationParticipants.findAll({
      where: { user_id: currentUserId },
      include: [
        {
          model: Conversations,
          as: "conversation",
          where: { type: "private" },
          include: [
            {
              model: ConversationParticipants,
              as: "participantsList",
              where: { user_id: { [Op.ne]: currentUserId } },
              include: [
                {
                  model: Users,
                  as: "user",
                  attributes: ["id"],
                },
              ],
            },
          ],
        },
      ],
    });

    // Create a map of userId -> conversationId for quick lookup
    const conversationMap = {};
    userParticipations.forEach((participation) => {
      const otherParticipant = participation.conversation.participantsList[0];
      if (otherParticipant) {
        conversationMap[otherParticipant.user_id] =
          participation.conversation_id;
      }
    });

    // Map users with their conversation IDs
    const usersWithConversations = users.map((user) => ({
      ...user.toJSON(),
      conversationId: conversationMap[user.id] || null,
    }));

    res.json(usersWithConversations);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get messages by conversation ID
router.get("/:conversationId", async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);

    if (isNaN(conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID" });
    }

    // Verify conversation exists
    const conversation = await Conversations.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Get all messages for this conversation
    const messages = await Messages.findAll({
      where: { conversation_id: conversationId },
      order: [["createdAt", "ASC"]],
      include: [
        {
          model: Users,
          as: "sender",
          attributes: ["id", "name", "profile_photo"],
        },
      ],
    });

    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all conversations for a user (both private and group)
router.get("/conversations/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const conversations = await Conversations.findAll({
      include: [
        {
          model: ConversationParticipants,
          as: "participantsList",
          where: { user_id: userId },
          attributes: ["role", "joined_at"],
        },
        {
          model: Users,
          as: "participants",
          attributes: ["id", "name", "profile_photo", "phone_number"],
          through: { attributes: [] },
        },
        {
          model: Messages,
          as: "messages",
          limit: 1,
          order: [["createdAt", "DESC"]],
          required: false,
          include: [
            {
              model: Users,
              as: "sender",
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: Users,
          as: "creator",
          attributes: ["id", "name"],
          required: false,
        },
      ],
      order: [["updatedAt", "DESC"]],
    });
    if (!conversations) {
      return res.status(404).message("No Conversations Found");
    }

    // Format response
    const formattedConversations = conversations.map((conv) => {
      const convData = conv.toJSON();

      // For private chats, get the other participant
      if (conv.type === "private") {
        const otherParticipant = convData.participants.find(
          (p) => p.id !== userId,
        );
        return {
          id: conv.id,
          type: "private",
          conversationId: conv.id,
          name: otherParticipant?.name,
          profile_photo: otherParticipant?.profile_photo,
          phone_number: otherParticipant?.phone_number,
          lastMessage: convData.messages[0] || null,
          participantCount: convData.participants.length,
          myRole: convData.participantsList[0]?.role,
        };
      } else {
        // Group chat
        return {
          id: conv.id,
          type: "group",
          conversationId: conv.id,
          name: conv.name,
          group_photo: conv.group_photo,
          description: conv.description,
          lastMessage: convData.messages[0] || null,
          participantCount: convData.participants.length,
          myRole: convData.participantsList[0]?.role,
          createdBy: convData.creator,
        };
      }
    });

    res.json(formattedConversations);
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get conversation details by ID
router.get("/conversation/:conversationId", async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);

    if (isNaN(conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID" });
    }

    const conversation = await Conversations.findByPk(conversationId, {
      include: [
        {
          model: Users,
          as: "participants",
          attributes: ["id", "name", "profile_photo", "phone_number"],
          through: {
            attributes: ["role", "joined_at"],
            as: "participantInfo",
          },
        },
        {
          model: Users,
          as: "creator",
          attributes: ["id", "name"],
          required: false,
        },
      ],
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json(conversation);
  } catch (err) {
    console.error("Error fetching conversation details:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new group conversation
router.post("/create-group", async (req, res) => {
  try {
    const { name, description, group_photo, created_by, participant_ids } =
      req.body;

    // Validation
    if (
      !name ||
      !created_by ||
      !participant_ids ||
      participant_ids.length < 2
    ) {
      return res.status(400).json({
        error: "Group name, creator, and at least 2 participants are required",
      });
    }

    // Create the group conversation
    const conversation = await Conversations.create({
      type: "group",
      name,
      description,
      group_photo,
      created_by,
    });

    // Add all participants (including creator as admin)
    const participantsData = participant_ids.map((userId) => ({
      conversation_id: conversation.id,
      user_id: userId,
      role: userId === created_by ? "admin" : "member",
    }));

    await ConversationParticipants.bulkCreate(participantsData);

    // Fetch the complete conversation with participants
    const completeConversation = await Conversations.findByPk(conversation.id, {
      include: [
        {
          model: Users,
          as: "participants",
          attributes: ["id", "name", "profile_photo"],
          through: { attributes: ["role"] },
        },
      ],
    });

    res.status(201).json(completeConversation);
  } catch (err) {
    console.error("Error creating group:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add participant to group
router.post("/add-participant", async (req, res) => {
  try {
    const { conversation_id, user_id, added_by } = req.body;

    if (!conversation_id || !user_id || !added_by) {
      return res.status(400).json({
        error: "conversation_id, user_id, and added_by are required",
      });
    }

    // Verify conversation exists and is a group
    const conversation = await Conversations.findByPk(conversation_id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    if (conversation.type !== "group") {
      return res
        .status(400)
        .json({ error: "Can only add participants to group chats" });
    }

    // Verify the person adding is an admin
    const adderParticipant = await ConversationParticipants.findOne({
      where: { conversation_id, user_id: added_by },
    });

    if (!adderParticipant || adderParticipant.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can add participants" });
    }

    // Check if user is already a participant
    const existingParticipant = await ConversationParticipants.findOne({
      where: { conversation_id, user_id },
    });

    if (existingParticipant) {
      return res.status(400).json({ error: "User is already a participant" });
    }

    // Add the participant
    const newParticipant = await ConversationParticipants.create({
      conversation_id,
      user_id,
      role: "member",
    });

    // Get user details
    const user = await Users.findByPk(user_id, {
      attributes: ["id", "name", "profile_photo"],
    });

    res.status(201).json({
      ...newParticipant.toJSON(),
      user,
    });
  } catch (err) {
    console.error("Error adding participant:", err);
    res.status(500).json({ error: err.message });
  }
});

// Remove participant from group
router.delete("/remove-participant", async (req, res) => {
  try {
    const { conversation_id, user_id, removed_by } = req.body;

    if (!conversation_id || !user_id || !removed_by) {
      return res.status(400).json({
        error: "conversation_id, user_id, and removed_by are required",
      });
    }

    // Verify the person removing is an admin
    const removerParticipant = await ConversationParticipants.findOne({
      where: { conversation_id, user_id: removed_by },
    });

    if (!removerParticipant || removerParticipant.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can remove participants" });
    }

    // Remove the participant
    const deleted = await ConversationParticipants.destroy({
      where: { conversation_id, user_id },
    });

    if (deleted === 0) {
      return res.status(404).json({ error: "Participant not found" });
    }

    res.json({ message: "Participant removed successfully" });
  } catch (err) {
    console.error("Error removing participant:", err);
    res.status(500).json({ error: err.message });
  }
});

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { name, phone_number, password } = req.body;

    if (!name || !phone_number || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const phoneNum = parseInt(phone_number);
    if (isNaN(phoneNum)) {
      return res.status(400).json({ message: "Phone number must be numeric" });
    }

    if (phone_number.toString().length !== 10) {
      return res
        .status(400)
        .json({ message: "Phone number must be exactly 10 digits" });
    }

    const newUser = await Users.create({
      name,
      phone_number: phoneNum,
      password,
    });

    const token = jwt.sign(
      { id: newUser.id },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "24h" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
    });

    res.cookie(
      "user",
      JSON.stringify({
        id: newUser.id,
        name: newUser.name,
        phone_number: newUser.phone_number,
        profile_photo: newUser.profile_photo || null,
      }),
      {
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    );

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        phone_number: newUser.phone_number,
        profile_photo: newUser.profile_photo || null,
      },
    });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ message: "Phone number already exists" });
    }
    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({ message: err.errors[0].message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { phone_number, password } = req.body;

    if (!phone_number || !password) {
      return res
        .status(400)
        .json({ message: "Phone number and password are required" });
    }

    const phoneNum = parseInt(phone_number);
    if (isNaN(phoneNum)) {
      return res.status(400).json({ message: "Phone number must be numeric" });
    }

    if (phone_number.toString().length !== 10) {
      return res
        .status(400)
        .json({ message: "Phone number must be exactly 10 digits" });
    }

    const user = await Users.getUserByCredentials(phoneNum, password);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "24h" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
    });

    res.cookie(
      "user",
      JSON.stringify({
        id: user.id,
        name: user.name,
        phone_number: user.phone_number,
        profile_photo: user.profile_photo || null,
      }),
      {
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    );

    res.json({
      message: "Login successful",
      user: user,
      token: token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout user
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.clearCookie("user");
  res.json({ message: "Logged out successfully" });
});

// Get current authenticated user
router.get("/me", async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    const user = await Users.getUserById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// Update user (with profile photo upload)
router.put("/:id", upload.single("profile_photo"), async (req, res) => {
  try {
    const updateData = {};

    // Add name if provided
    if (req.body.name) {
      updateData.name = req.body.name;
    }

    // Store the image URL if file was uploaded
    if (req.file) {
      // Store the URL that the frontend can use to access the image
      updateData.profile_photo = `process.env.REACT_APP_API_URL/uploads/${req.file.filename}`;
    }

    const updatedUser = await Users.updateUser(req.params.id, updateData);

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return user data without password
    const userData = {
      id: updatedUser.id,
      name: updatedUser.name,
      profile_photo: updatedUser.profile_photo,
    };

    // Update user cookie
    res.cookie("user", JSON.stringify(userData), {
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
    });

    res.json({ message: "User updated successfully", data: userData });
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({ message: err.errors[0].message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete("/:id", async (req, res) => {
  try {
    const deletedUser = await Users.deleteUser(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify token
router.get("/verify/token", (req, res) => {
  try {
    const token =
      req.cookies?.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    res.json({ message: "Token verified", decoded });
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

export default router;
