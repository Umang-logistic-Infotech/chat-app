import Conversations from "../TestModels/Conversations.js";
import Messages from "../TestModels/Messages.js";
import Users from "../Models/Users.js";
import express from "express";

const router = express.Router();

// Get all users
router.get("/", async (req, res) => {
  try {
    const conversations = await Conversations.findAll();
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/conversations/:userId", async (req, res) => {
  const { userId } = req.params;
  const conversations = await Conversations.findAll({
    where: {
      type: "private",
      [Op.or]: [{ user1_id: userId }, { user2_id: userId }],
    },
    order: [["updatedAt", "DESC"]],
  });
  res.json(conversations);
});

router.get("/messages/:conversationId", async (req, res) => {
  const messages = await Messages.findAll({
    where: { conversation_id: req.params.conversationId },
    order: [["createdAt", "ASC"]],
  });
  res.json(messages);
});

export default router;
