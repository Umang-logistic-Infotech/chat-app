import db from "../config/db.js";
import { DataTypes } from "sequelize";

const Messages = db.define(
  "messages",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    message_type: {
      type: DataTypes.ENUM("text", "image"),
      defaultValue: "text",
      allowNull: false,
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    conversation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "conversations",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    status: {
      type: DataTypes.ENUM("sending", "sent", "delivered", "read"),
      defaultValue: "sending",
      allowNull: false,
    },
  },
  {
    timestamps: true,
  },
);

export default Messages;
