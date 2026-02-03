import { DataTypes } from "sequelize";
import db from "../config/db.js";
import Users from "./Users.js";
import Conversations from "./Conversations.js";
import Messages from "./Messages.js";

const Conversations_Members = db.define(
  "conversations_members",
  {
    user_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Users, // Reference to the User model
        key: "id", // The primary key of the User model is "id"
      },
      allowNull: false, // Ensure user_id can't be null
    },
    conversation_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Conversations, // Reference to the Conversations model
        key: "id", // The primary key of the Conversations model is "id"
      },
      allowNull: false,
    },
    joined_datetime: {
      type: DataTypes.DATE,
      allowNull: false,
      unique: false,
    },
    left_datetime: {
      type: DataTypes.DATE,
      allowNull: true,
      unique: false,
    },
  },
  {
    timestamps: true,
  },
);

Conversations_Members.belongsTo(Users, { foreignKey: "user_id" });
Conversations_Members.belongsTo(Conversations, {
  foreignKey: "conversation_id",
});

Conversations_Members.getConversationsByUserId = async (id) => {
  try {
    return await Conversations_Members.findAll({
      where: { user_id: id },
      include: [
        {
          model: Conversations,
        },
      ],
    });
  } catch (error) {
    throw error;
  }
};

export default Conversations_Members;
