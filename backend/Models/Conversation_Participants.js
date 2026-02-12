import db from "../config/db.js";
import { DataTypes } from "sequelize";

const ConversationParticipants = db.define(
  "conversation_participants",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    conversation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "conversations",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    role: {
      type: DataTypes.ENUM("admin", "member"),
      defaultValue: "member",
      allowNull: false,
      comment: "Admin can add/remove members, change group settings",
    },
    joined_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  },
);

export default ConversationParticipants;
