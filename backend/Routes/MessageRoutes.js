// routes/message.route.js
import express from "express";

import { upload } from "../middleware/upload";
const router = express.Router();

// Only upload image and return URL - saving happens via socket
router.post(
  "/upload-image",
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
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
