// Models/QueuedNotification.js

import { DataTypes } from "sequelize";
import db from "../config/db.js";

const QueuedNotification = db.define(
  "QueuedNotification",

  {
    // Primary key — auto incrementing unique ID for each notification
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    // Which user should receive this notification
    // This is the RECEIVER's user ID, not the sender
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // What kind of notification is this?
    // 'new_message'   → personal chat message
    // 'group_message' → group chat message
    type: {
      type: DataTypes.ENUM("new_message", "group_message"),
      allowNull: false,
      defaultValue: "new_message",
    },

    // The actual notification data stored as JSON
    // Contains: sender_id, sender_name, sender_photo,
    //           message preview, conversation_id, message_type
    // We store it as JSON so we can send it directly over SSE later
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
    },

    // Delivery flag
    // false → notification is waiting to be delivered
    // true  → notification was flushed to user via SSE
    // We use this to avoid sending the same notification twice
    is_delivered: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },

  {
    // Sequelize will look for / create table named 'queued_notifications'
    tableName: "queued_notifications",

    // createdAt → tells us when notification was queued (oldest first flush)
    // updatedAt → tells us when is_delivered was flipped to true
    timestamps: true,
  },
);

export default QueuedNotification;