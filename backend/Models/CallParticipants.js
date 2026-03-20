import db from "../config/db.js";
import { DataTypes } from "sequelize";

const CallParticipants = db.define(
  "call_participants",
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
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    role: {
      type: DataTypes.ENUM("caller", "receiver"),
      allowNull: false,
    },

    status: {
      type: DataTypes.ENUM(
        "invited",
        "joined",
        "left",
        "rejected",
        "missed"
      ),
      defaultValue: "invited",
    },

    joined_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    left_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

export default CallParticipants;