// Routes/NotificationRoutes.js

import express from "express";
import crypto from "crypto";
import { addClient, removeClient } from "../sse/sseManager.js";
import { QueuedNotification, SSEToken } from "../Models/index.js";
import verifyJwt from "../middleware/verifyJwt.js";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /notifications/token
//
// PURPOSE: Generate a short-lived SSE token
//
// FLOW:
//   1. Client sends request with JWT in header (your Interceptor does this)
//   2. verifyJwt middleware verifies JWT → attaches userId to req
//   3. We generate a random 32-byte hex token
//   4. Save it to DB with 30 second expiry
//   5. Return token to client
//
// WHY JWT HERE?
//   This endpoint uses normal HTTP so JWT in header works perfectly
//   We verify identity HERE so the SSE stream itself doesn't need to
// ─────────────────────────────────────────────────────────────────────────────
router.post("/token", verifyJwt, async (req, res) => {
  try {
    const userId = req.user.id; // attached by verifyJwt middleware

    // Generate cryptographically secure random token
    // 32 bytes → 64 character hex string
    // Example: "a3f9b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1"
    const token = crypto.randomBytes(32).toString("hex");

    // Set expiry to 30 seconds from now
    // Why 30 seconds? Client only needs this token long enough to open
    // the EventSource connection. Once connected, token is deleted anyway.
    const expiresAt = new Date(Date.now() + 30 * 1000);

    // Delete any existing unused tokens for this user
    // Prevents token accumulation if user refreshes rapidly
    await SSEToken.destroy({ where: { user_id: userId } });

    // Save new token to DB
    await SSEToken.create({
      token,
      user_id: userId,
      expires_at: expiresAt,
    });

    console.log(`🔑 SSE token created for userId: ${userId} | expires in 30s`);

    // Return token to client
    // Client will immediately use this to open EventSource
    return res.status(200).json({ token });

  } catch (err) {
    console.error("❌ Error creating SSE token:", err);
    return res.status(500).json({ error: "Failed to create SSE token" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /notifications/stream?token=<sseToken>
//
// PURPOSE: Open the SSE stream after verifying the one-time token
//
// FLOW:
//   1. Client passes SSE token as query param
//   2. We look it up in DB
//   3. Check it exists + not expired
//   4. Delete it immediately (one-time use)
//   5. Open SSE stream for that userId
//   6. Flush any queued notifications
// ─────────────────────────────────────────────────────────────────────────────
router.get("/stream", async (req, res) => {
  const { token } = req.query;

  // ── Guard: token is required ──────────────────────────────────────────────
  if (!token) {
    return res.status(401).json({ error: "SSE token is required" });
  }

  try {
    // ── Step 1: Find token in DB ───────────────────────────────────────────
    const sseToken = await SSEToken.findOne({ where: { token } });

    // ── Step 2: Check token exists ────────────────────────────────────────
    if (!sseToken) {
      return res.status(401).json({ error: "Invalid SSE token" });
    }

    // ── Step 3: Check token not expired ───────────────────────────────────
    // Compare expiry time with current time
    if (new Date() > new Date(sseToken.expires_at)) {
      await sseToken.destroy(); // clean up expired token
      return res.status(401).json({ error: "SSE token expired" });
    }

    // ── Step 4: Get userId BEFORE deleting token ───────────────────────────
    const userId = sseToken.user_id;

    // ── Step 5: Delete token immediately (one-time use) ────────────────────
    // Even if attacker intercepts the URL, token is already gone
    await sseToken.destroy();
    console.log(`🗑️  SSE token consumed for userId: ${userId}`);

    // ── Step 6: Set SSE Headers ────────────────────────────────────────────
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // ── Step 7: Send confirmation event ───────────────────────────────────
    res.write(
      `event: connected\ndata: ${JSON.stringify({
        message: "SSE connected",
        userId,
      })}\n\n`
    );

    // ── Step 8: Register in sseManager ────────────────────────────────────
    addClient(userId, res);

    // ── Step 9: Flush queued notifications ────────────────────────────────
    // User just came online → deliver anything queued while they were offline
    const pending = await QueuedNotification.findAll({
      where: { user_id: userId, is_delivered: false },
      order: [["createdAt", "ASC"]],
    });

    if (pending.length > 0) {
      console.log(
        `📬 Flushing ${pending.length} queued notifications → userId: ${userId}`
      );

      for (const notification of pending) {
        res.write(
          `event: notification\ndata: ${JSON.stringify(notification.payload)}\n\n`
        );
        await notification.update({ is_delivered: true });
      }
    }

    // ── Step 10: Cleanup on disconnect ────────────────────────────────────
    req.on("close", () => {
      removeClient(userId);
    });

  } catch (err) {
    console.error("❌ SSE stream error:", err);
    return res.status(500).json({ error: "SSE stream failed" });
  }
});

export default router;