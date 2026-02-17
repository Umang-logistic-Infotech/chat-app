import multer from "multer";
import path from "path";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|avif/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

// ─── Profile Images Storage ─────────────────────────────────────────────────
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile-images",
    allowed_formats: ["jpeg", "jpg", "png", "gif", "webp", "avif"],
  },
});

// ─── Chat Images Storage ────────────────────────────────────────────────────
const chatStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    const conversationId = req.params.conversationId;
    return {
      folder: `chat-images/${conversationId}`,
      allowed_formats: ["jpeg", "jpg", "png", "gif", "webp", "avif"],
    };
  },
});

// ─── Profile Upload ─────────────────────────────────────────────────────────
export const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter,
});

// ─── Chat Image Upload ──────────────────────────────────────────────────────
export const chatImageUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter,
});
