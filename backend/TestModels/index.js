import { DataTypes } from "sequelize";
import db from "../config/db.js";
import Conversations from "./Conversations.js"; // Assuming Conversations model

const Users = db.define("users", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  profile_photo: { type: DataTypes.STRING },
});

Users.hasMany(Conversations, {
  foreignKey: "user1_id", // Adjust this if you need other fields
  as: "conversations_user1",
});

Users.hasMany(Conversations, {
  foreignKey: "user2_id", // Adjust this if you need other fields
  as: "conversations_user2",
});

export default Users;
