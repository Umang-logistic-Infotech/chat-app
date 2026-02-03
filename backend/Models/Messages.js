import { DataTypes } from "sequelize";
import db from "../config/db.js";
import Users from "./Users.js";
import Conversations from "./Conversations.js";

const Messages = db.define(
  "messages",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sender_user_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Users,
        key: "id",
      },
      allowNull: false,
    },
    receiver_user_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Users,
        key: "id",
      },
      allowNull: false,
    },
    message_text: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sent_datetime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    conversation_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Conversations,
        key: "id",
      },
      allowNull: false,
    },
  },
  {
    timestamps: false,
  },
);

// Set up associations
Messages.belongsTo(Users, { foreignKey: "sender_user_id", as: "sender" }); // Define relationship to the sender
Messages.belongsTo(Users, { foreignKey: "receiver_user_id", as: "receiver" }); // Define relationship to the receiver
Messages.belongsTo(Conversations, { foreignKey: "conversation_id" }); // Define relationship to the conversation

export default Messages;
