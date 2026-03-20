import db from "../config/db.js";
import { DataTypes } from "sequelize";

const Calls = db.define(
  "calls",
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
    },

    caller_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    receiver_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    type: {
      type: DataTypes.ENUM("audio", "video"),
      defaultValue: "audio",
    },

    status: {
      type: DataTypes.ENUM(
        "initiated",
        "ringing",
        "accepted",
        "connecting",
        "connected",
        "ended",
        "rejected",
        "missed",
        "busy",
        "failed"
      ),
      defaultValue: "initiated",
      allowNull: false,
    },

    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    ended_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    duration: {
      type: DataTypes.INTEGER, // seconds
      allowNull: true,
    },

    ended_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    timestamps: true,
  }
);

export default Calls;