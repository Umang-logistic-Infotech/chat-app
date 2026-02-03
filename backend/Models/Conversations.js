import { DataTypes } from "sequelize";
import db from "../config/db.js";
// import Conversations_Members from "./Conversation_Members.js";

const Conversations = db.define(
  "conversations",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
    },
    type: {
      type: DataTypes.ENUM("private", "group"),
      allowNull: false,
      unique: false,
    },
  },
  {
    timestamps: true,
  },
);

// Conversations.getAllMembers = async (id) => {
//   try {
//     return await Conversations.findAll({
//       include: [
//         {
//           model: Conversations_Members,
//           where: { user_id: id },
//         },
//       ],
//     });
//   } catch (error) {
//     throw error;
//   }
// };

export default Conversations;
