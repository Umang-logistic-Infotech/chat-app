// utils/cleanupSSETokens.js
//
// Cleans up expired SSE tokens that were never used
// Example: user generated a token but closed the tab before connecting
// Runs every 60 seconds
// In production: increase interval to 5-10 minutes

import { Op } from "sequelize";
import SSEToken from "../Models/SSEToken.js";

const startSSETokenCleanup = () => {
  setInterval(async () => {
    try {
      const deleted = await SSEToken.destroy({
        where: {
          // Delete all tokens where expires_at is in the past
          expires_at: { [Op.lt]: new Date() },
        },
      });

      if (deleted > 0) {
        console.log(`🧹 Cleaned up ${deleted} expired SSE token(s)`);
      }
    } catch (err) {
      console.error("❌ SSE token cleanup error:", err);
    }
  }, 60 * 1000); // runs every 60 seconds
};

export default startSSETokenCleanup;