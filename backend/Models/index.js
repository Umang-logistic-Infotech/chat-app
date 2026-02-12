import Users from "./Users.js";
import Conversations from "./Conversations.js";
import ConversationParticipants from "./Conversation_Participants.js";
import Messages from "./Messages.js";
import ActiveUsers from "./ActiveUsers.js";

// ============================================
// Define all relationships
// ============================================

// Users <-> Conversations (Many-to-Many)
Users.belongsToMany(Conversations, {
  through: ConversationParticipants,
  foreignKey: "user_id",
  otherKey: "conversation_id",
  as: "conversations",
});

Conversations.belongsToMany(Users, {
  through: ConversationParticipants,
  foreignKey: "conversation_id",
  otherKey: "user_id",
  as: "participants",
});

// Direct access to ConversationParticipants
Conversations.hasMany(ConversationParticipants, {
  foreignKey: "conversation_id",
  as: "participantsList",
  onDelete: "CASCADE",
});

Users.hasMany(ConversationParticipants, {
  foreignKey: "user_id",
  as: "participantsList",
  onDelete: "CASCADE",
});

ConversationParticipants.belongsTo(Users, {
  foreignKey: "user_id",
  as: "user",
});

ConversationParticipants.belongsTo(Conversations, {
  foreignKey: "conversation_id",
  as: "conversation",
});

// Conversations <-> Messages (One-to-Many)
Conversations.hasMany(Messages, {
  foreignKey: "conversation_id",
  as: "messages",
  onDelete: "CASCADE",
});

Messages.belongsTo(Conversations, {
  foreignKey: "conversation_id",
  as: "conversation",
});

// Users <-> Messages (One-to-Many)
Users.hasMany(Messages, {
  foreignKey: "sender_id",
  as: "sentMessages",
});

Messages.belongsTo(Users, {
  foreignKey: "sender_id",
  as: "sender",
});

// User who created the group
Conversations.belongsTo(Users, {
  foreignKey: "created_by",
  as: "creator",
});

// Users <-> ActiveUsers (One-to-One)
Users.hasOne(ActiveUsers, {
  foreignKey: "user_id",
  as: "activeStatus",
  onDelete: "CASCADE",
});

ActiveUsers.belongsTo(Users, {
  foreignKey: "user_id",
  as: "user",
});

// Export all models
export {
  Users,
  Conversations,
  ConversationParticipants,
  Messages,
  ActiveUsers,
};
