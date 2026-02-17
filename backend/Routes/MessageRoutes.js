import express from "express";
import { chatImageUpload } from "../middleware/upload.js";

const router = express.Router();

// POST /api/messages/upload-image/:conversationId
router.post(
  "/messages/upload-image/:conversationId",
  (req, res, next) => {
    chatImageUpload.single("image")(req, res, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image provided" });
    }
    res.json({ image_url: req.file.path });
  },
);

export default router;
