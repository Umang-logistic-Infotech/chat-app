import Conversations from "./Conversations.js"; // Assuming Conversations model
import Users from "./Users.js";

Users.hasMany(Conversations, {
  foreignKey: "user1_id", // Adjust this if you need other fields
  as: "conversations_user1",
});

Users.hasMany(Conversations, {
  foreignKey: "user2_id", // Adjust this if you need other fields
  as: "conversations_user2",
});

export default Users;
