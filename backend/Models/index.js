import Users from "./Users.js";
import Conversations from "./Conversations.js";
import ConversationParticipants from "./Conversation_Participants.js";
import Messages from "./Messages.js";
import ActiveUsers from "./ActiveUsers.js";

// Conversations <-> ConversationParticipants
Conversations.hasMany(ConversationParticipants, {
  foreignKey: "conversation_id",
  as: "participants",
});

ConversationParticipants.belongsTo(Conversations, {
  foreignKey: "conversation_id",
  as: "conversation",
});

// Users <-> ConversationParticipants
Users.hasMany(ConversationParticipants, {
  foreignKey: "user_id",
  as: "participations",
});

ConversationParticipants.belongsTo(Users, {
  foreignKey: "user_id",
  as: "user",
});

// Conversations <-> Users (for created_by)
Conversations.belongsTo(Users, {
  foreignKey: "created_by",
  as: "creator",
});

Users.hasMany(Conversations, {
  foreignKey: "created_by",
  as: "createdConversations",
});

// Conversations <-> Messages
Conversations.hasMany(Messages, {
  foreignKey: "conversation_id",
  as: "messages",
});

Messages.belongsTo(Conversations, {
  foreignKey: "conversation_id",
  as: "conversation",
});

// Users <-> Messages (sender)
Users.hasMany(Messages, {
  foreignKey: "sender_id",
  as: "sentMessages",
});

Messages.belongsTo(Users, {
  foreignKey: "sender_id",
  as: "sender",
});

// Users <-> ActiveUsers
Users.hasOne(ActiveUsers, {
  foreignKey: "user_id",
  as: "activeStatus",
});

ActiveUsers.belongsTo(Users, {
  foreignKey: "user_id",
  as: "user",
});

export {
  Users,
  Conversations,
  ConversationParticipants,
  Messages,
  ActiveUsers,
};
