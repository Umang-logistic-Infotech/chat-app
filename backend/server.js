import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import "./config/db.js";
import UserRoutes from "./Routes/UserRoutes.js";
import ConversationRoutes from "./Routes/ConversationRoutes.js";

// Middleware
app.use(
  cors({
    origin: process.env.FRONT_END_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Serve uploaded files as static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/users", UserRoutes);
app.use("/conversations", ConversationRoutes);
app.get("/", (req, res) => {
  res.send("Hello World!");
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
