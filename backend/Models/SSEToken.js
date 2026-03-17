// Models/SSEToken.js
//
// Stores short-lived one-time-use tokens for SSE authentication
// Token lifecycle:
//   Created  → when user calls POST /notifications/token
//   Valid    → for 30 seconds only
//   Deleted  → immediately after first use
//   Cleaned  → periodic job removes any expired unused tokens

import { DataTypes } from "sequelize";
import db from "../config/db.js";

const SSEToken = db.define(
  "SSEToken",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    // The actual token string
    // crypto.randomBytes(32) → 64 char hex string
    // Stored as unique so no two users can have same token
    token: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },

    // Which user this token belongs to
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // When this token expires
    // Set to NOW + 30 seconds at creation
    // After this time token is invalid even if not used
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "sse_tokens",
    timestamps: true,
  },
);

export default SSEToken;