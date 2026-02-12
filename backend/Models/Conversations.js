import db from "../config/db.js";
import { DataTypes } from "sequelize";

const Conversations = db.define(
  "conversations",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.ENUM("private", "group"), // e.g. "private", "group"
      allowNull: false,
    },
    user1_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user2_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["type", "user1_id", "user2_id"],
      },
    ],
  },
);

export default Conversations;
