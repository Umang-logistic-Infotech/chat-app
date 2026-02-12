import db from "../config/db.js";
import { DataTypes } from "sequelize";

const ActiveUsers = db.define(
  "active_users",
  {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true, // Each user can only have one status record
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    status: {
      type: DataTypes.ENUM("online", "offline"),
      defaultValue: "offline",
      allowNull: false,
    },
    last_seen: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
      comment: "Last time user was active",
    },
    socket_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Current socket connection ID",
    },
  },
  {
    timestamps: true,
    // Remove the default primary key
    id: false,
  },
);

export default ActiveUsers;
