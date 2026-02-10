import express from "express";
import jwt from "jsonwebtoken";
import Users from "../Models/Users.js";
import upload from "../middleware/upload.js";
import { Op } from "sequelize";
import Conversations from "../TestModels/Conversations.js";
import Messages from "../TestModels/Messages.js";

const router = express.Router();

// Get all users
router.get("/test/:id", async (req, res) => {
  try {
    const currentUserId = parseInt(req.params.id);
    const users = await Users.getAllUsers();

    // Get all conversations involving the current user
    const conversations = await Conversations.findAll({
      where: {
        [Op.or]: [{ user1_id: currentUserId }, { user2_id: currentUserId }],
      },
    });

    // Map users with their conversation IDs
    const usersWithConversations = users.map((user) => {
      // Find conversation between current user and this user
      const conversation = conversations.find(
        // ← Changed from Conversations.findAll to conversations.find
        (conv) =>
          (conv.user1_id === currentUserId && conv.user2_id === user.id) ||
          (conv.user2_id === currentUserId && conv.user1_id === user.id),
      );

      return {
        ...user.toJSON(),
        conversationId: conversation ? conversation.id : null,
      };
    });

    res.json(usersWithConversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user by ID
router.get("/:conversationId", async (req, res) => {
  try {
    const conversationId = parseInt(req.params.conversationId);

    if (isNaN(conversationId)) {
      return res.status(400).json({ error: "Invalid conversation ID" });
    }

    const messages = await Messages.findAll({
      where: { conversation_id: conversationId },
      order: [["createdAt", "ASC"]],
      offset: 5,
    });

    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
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
      updateData.profile_photo = `http://localhost:5000/uploads/${req.file.filename}`;
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
