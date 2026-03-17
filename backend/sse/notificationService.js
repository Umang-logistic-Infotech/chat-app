// sse/notificationService.js
//
// The brain of the notification system.
// Single responsibility: given a userId and payload,
// either push it live via SSE or queue it in DB.
//
// Usage from anywhere in backend:
//   import { sendNotification } from "../sse/notificationService.js";
//   await sendNotification(userId, payload);

import { hasClient, getClient } from "./sseManager.js";
import { QueuedNotification } from "../Models/index.js";

/**
 * Send a notification to a user
 *
 * Decision flow:
 *   User online  → push SSE event instantly
 *   User offline → save to DB queue
 *
 * @param {number|string} userId  - receiver's user ID
 * @param {object}        payload - notification data to send
 *
 * Payload shape:
 * {
 *   senderId:       number,   // who sent the message
 *   senderName:     string,   // sender's display name
 *   senderPhoto:    string,   // sender's profile photo URL
 *   messagePreview: string,   // truncated message text
 *   conversationId: number,   // which conversation
 *   type:           string,   // 'new_message' | 'group_message'
 *   messageType:    string,   // 'text' | 'image'
 *   timestamp:      string,   // ISO date string
 * }
 */
const sendNotification = async (userId, payload) => {
  try {

    // ── Case 1: User is ONLINE ─────────────────────────────────────────────
    // hasClient checks our in-memory Map in sseManager
    // If found → user has an active SSE connection → push immediately
    if (hasClient(userId)) {

      const res = getClient(userId);

      // SSE event format (strict):
      // event: <name>\n
      // data: <json>\n
      // \n   ← blank line = end of event
      //
      // Frontend listens for 'notification' event:
      // eventSource.addEventListener('notification', handler)
      res.write(
        `event: notification\ndata: ${JSON.stringify(payload)}\n\n`
      );

      console.log(`🔔 SSE notification pushed → userId: ${userId} | from: ${payload.senderName}`);

    // ── Case 2: User is OFFLINE ────────────────────────────────────────────
    // No active SSE connection → save to DB
    // Will be flushed when user comes back online and reconnects SSE
    } else {

      await QueuedNotification.create({
        user_id: userId,

        // Type helps frontend decide notification icon/behavior
        type: payload.type || "new_message",

        // Store entire payload as JSON
        // We send this exact object over SSE when user comes online
        payload: payload,

        is_delivered: false,
      });

      console.log(`📥 Notification queued in DB → userId: ${userId} | from: ${payload.senderName}`);
    }

  } catch (err) {
    console.error(`❌ sendNotification error for userId ${userId}:`, err);
    // We don't throw here — notification failure should never
    // break the main message sending flow
  }
};

/**
 * Build a notification payload from message data
 *
 * Helper function to create consistent payload shape
 * Called from socketHandler before sendNotification
 *
 * @param {object} messageData  - the messageData object from your send_message handler
 * @param {string} type         - 'new_message' | 'group_message'
 * @returns {object}            - formatted payload
 */
const buildNotificationPayload = (messageData, type = "new_message") => {
  // Truncate message preview to 60 chars
  // For image messages show a placeholder text
  const messagePreview =
    messageData.message_type === "image"
      ? "📷 Image"
      : messageData.message?.length > 60
        ? `${messageData.message.substring(0, 60)}...`
        : messageData.message || "";

  return {
    senderId:       messageData.sender_id,
    senderName:     messageData.sender_name,
    senderPhoto:    messageData.sender_photo,
    messagePreview: messagePreview,
    conversationId: messageData.conversation_id,
    type:           type,
    messageType:    messageData.message_type || "text",
    timestamp:      messageData.createdAt || new Date().toISOString(),
  };
};

export { sendNotification, buildNotificationPayload };
// ```

// ---

// ## How It Connects To Everything
// ```
// socketHandler.js
//       ↓
// calls buildNotificationPayload(messageData, type)
//       ↓
// calls sendNotification(receiverUserId, payload)
//       ↓
//       ├── hasClient(userId) = true
//       │     → getClient(userId) → res.write(SSE event) → frontend gets it instantly
//       │
//       └── hasClient(userId) = false
//             → QueuedNotification.create() → saved to DB
//             → flushed next time user connects to /notifications/stream
// ```

// ---

// ## Crystal Clear Summary
// ```
// notificationService.js exports 2 functions:

// 1. buildNotificationPayload(messageData, type)
//    → creates consistent payload object from your existing messageData
//    → handles image preview ("📷 Image") vs text preview (truncated)

// 2. sendNotification(userId, payload)
//    → checks sseManager Map
//    → online  → res.write() → instant SSE push
//    → offline → QueuedNotification.create() → DB queue
//    → never throws → won't break message flow if it fails