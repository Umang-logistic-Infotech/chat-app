import dotenv from "dotenv";
dotenv.config();

import { Sequelize } from "sequelize";

const db = new Sequelize(
  process.env.DATABASE_NAME,
  process.env.DATABASE_USERNAME,
  process.env.DATABASE_PASS,
  {
    host: process.env.DATABASE_HOST,
    dialect: "mysql",
    logging: false,
  },
);

db.authenticate()
  .then(() => {
    console.log("Database connected successfully");
    return db.sync(); // Use { force: true } to drop and recreate tables (WARNING: deletes data)
  })
  .then(() => {
    console.log("All models were synchronized successfully");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });

export default db;
