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
      type: DataTypes.ENUM("private", "group"),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Group name - only used for group chats",
    },
    group_photo: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Group photo URL - only used for group chats",
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "User ID who created the group - only for group chats",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Group description - optional",
    },
  },
  {
    timestamps: true,
  },
);

export default Conversations;
