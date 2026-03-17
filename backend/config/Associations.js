import Users from "../Models/Users";
import Conversations from "../Models/Conversations";
import Conversation_Members from "../Models/Conversation_Members";
import Messages from "../Models/Messages";
import QueuedNotification from "../Models/QueuedNotification.js";

// // 2. Then, define all associations after all models are loaded
Messages.belongsTo(Users, { foreignKey: "sender_user_id", as: "sender" });
Messages.belongsTo(Users, { foreignKey: "receiver_user_id", as: "receiver" });
Messages.belongsTo(Conversations, { foreignKey: "conversation_id" });

Conversations.hasMany(Messages, { foreignKey: "conversation_id" });
Conversations.hasMany(Conversation_Members, { foreignKey: "conversation_id" });

// One User can have many queued notifications
// When we query notifications for a user, we use user_id as the foreign key
Users.hasMany(QueuedNotification, {
  foreignKey: "user_id",
  onDelete: "CASCADE", // if user is deleted, their notifications are too
});

QueuedNotification.belongsTo(Users, {
  foreignKey: "user_id",
});

Conversation_Members.belongsTo(Conversations, {
  foreignKey: "conversation_id",
});
Conversation_Members.belongsTo(Users, { foreignKey: "user_id" });
