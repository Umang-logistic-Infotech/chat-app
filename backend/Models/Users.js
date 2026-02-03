import { DataTypes } from "sequelize";
import db from "../config/db.js";
import bcrypt from "bcryptjs";
// import Conversations_Members from "./Conversation_Members.js";

const Users = db.define(
  "users",
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
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
    },
    profile_photo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone_number: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
      validate: {
        isNumeric: true,
        max: {
          args: [9999999999],
          msg: "Phone number must be 10 digits",
        },
      },
    },
  },
  {
    timestamps: true,
  },
);

// Hash password before creating user
Users.beforeCreate(async (user) => {
  const saltRounds = parseInt(process.env.DB_PASSWORD_SALTROUNDS) || 10;
  const salt = await bcrypt.genSalt(saltRounds);
  user.password = await bcrypt.hash(user.password, salt);
});

// Hash password before updating if password changed
Users.beforeUpdate(async (user) => {
  if (user.changed("password")) {
    const saltRounds = parseInt(process.env.DB_PASSWORD_SALTROUNDS) || 10;
    const salt = await bcrypt.genSalt(saltRounds);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

// Instance method to compare passwords
Users.prototype.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// Get user by credentials (for login)
Users.getUserByCredentials = async (phone_number, password) => {
  try {
    const user = await Users.findOne({ where: { phone_number } });
    if (!user) return null;

    const isMatch = await user.comparePassword(password);
    if (isMatch) {
      return {
        id: user.id,
        name: user.name,
        phone_number: user.phone_number,
        profile_photo: user.profile_photo,
      };
    }
    return null;
  } catch (error) {
    throw error;
  }
};

// Get all users
Users.getAllUsers = async () => {
  try {
    return await Users.findAll({
      attributes: { exclude: ["password"] }, // Don't return passwords
    });
  } catch (error) {
    throw error;
  }
};

// Get user by ID
Users.getUserById = async (id) => {
  try {
    return await Users.findByPk(id, {
      attributes: { exclude: ["password"] }, // Don't return password
    });
  } catch (error) {
    throw error;
  }
};

// Update user
Users.updateUser = async (id, userData) => {
  try {
    const user = await Users.findByPk(id);
    if (!user) return null;

    return await user.update(userData);
  } catch (error) {
    throw error;
  }
};

// Delete user
Users.deleteUser = async (id) => {
  try {
    const user = await Users.findByPk(id);
    if (!user) return null;

    await user.destroy();
    return user;
  } catch (error) {
    throw error;
  }
};

export default Users;
