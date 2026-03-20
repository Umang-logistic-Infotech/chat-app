import express from "express";
import CallController from "../controllers/CallController.js";

const router = express.Router();

router.get("/:conversation_id", CallController.getCallsByConversation);
router.get("/details/:id", CallController.getCallDetails);

router.get("/history/:user_id", CallController.getUserCallHistory);
export default router;