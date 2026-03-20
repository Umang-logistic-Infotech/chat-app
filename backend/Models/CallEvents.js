import db from "../config/db.js";
import { DataTypes } from "sequelize";

const CallEvents = db.define(
  "call_events",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    call_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "calls",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },

    event_type: {
      type: DataTypes.ENUM(
        "initiated",
        "ringing",
        "accepted",
        "rejected",
        "missed",
        "busy",
        "connected",
        "ended",
        "failed"
      ),
      allowNull: false,
    },

    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

export default CallEvents;