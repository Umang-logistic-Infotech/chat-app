import Users from "../Models/Users";
import Conversations from "../Models/Conversations";
import Conversation_Members from "../Models/Conversation_Members";
import Messages from "../Models/Messages";

// // 2. Then, define all associations after all models are loaded
Messages.belongsTo(Users, { foreignKey: "sender_user_id", as: "sender" });
Messages.belongsTo(Users, { foreignKey: "receiver_user_id", as: "receiver" });
Messages.belongsTo(Conversations, { foreignKey: "conversation_id" });

Conversations.hasMany(Messages, { foreignKey: "conversation_id" });
Conversations.hasMany(Conversation_Members, { foreignKey: "conversation_id" });

Conversation_Members.belongsTo(Conversations, {
  foreignKey: "conversation_id",
});
Conversation_Members.belongsTo(Users, { foreignKey: "user_id" });
