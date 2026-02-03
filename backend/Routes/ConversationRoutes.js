import Conversations from "../Models/Conversations.js";
import Conversations_Members from "../Models/Conversation_Members.js";
import Messages from "../Models/Messages.js";
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

router.get("/:id", async (req, res) => {
  try {
    const members = await Conversations_Members.getConversationsByUserId(
      req.params.id,
    );
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/members", async (req, res) => {
  try {
    const members = await Conversations_Members.findAll();
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/messages", async (req, res) => {
  try {
    const messages = await Messages.findAll();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
