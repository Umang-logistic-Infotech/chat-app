# 🔧 Chat App — Backend

A real-time chat backend built with **Node.js**, **Express**, **Socket.io**, **MySQL**, **Sequelize**, and **Cloudinary**. Supports private messaging, group chats, image sharing, online status tracking, and JWT-based authentication.

---

## 📁 Project Structure

```
backend/
├── server.js                          # Entry point — Express + Socket.io setup
├── config/
│   ├── db.js                          # Sequelize MySQL connection
│   └── cloudinary.js                  # Cloudinary SDK configuration
├── Models/
│   ├── index.js                       # All model associations
│   ├── Users.js                       # User accounts
│   ├── Conversations.js               # Private & group conversations
│   ├── Conversation_Participants.js   # Who is in which conversation
│   ├── Messages.js                    # All messages (text + image)
│   └── ActiveUsers.js                 # Online/offline status + socket ID
├── routes/
│   ├── user.route.js                  # User profile, conversations, messages
│   └── message.route.js               # Image upload endpoint
├── middleware/
│   └── upload.middleware.js           # Multer + Cloudinary storage config
├── socket/
│   └── socketHandlers.js              # All Socket.io event handlers
└── .env                               # Environment variables
```

---

## 📦 Packages Used

| Package                     | Version | Why Used                                       |
| --------------------------- | ------- | ---------------------------------------------- |
| `express`                   | ^5.2.1  | HTTP server and REST API routing               |
| `socket.io`                 | ^4.8.3  | Real-time bidirectional communication for chat |
| `sequelize`                 | ^6.37.7 | ORM for MySQL — models, associations, queries  |
| `mysql2`                    | ^3.16.2 | MySQL driver required by Sequelize             |
| `cloudinary`                | ^1.41.3 | Cloud storage for profile and chat images      |
| `multer`                    | ^2.0.2  | Handles multipart/form-data file uploads       |
| `multer-storage-cloudinary` | ^4.0.0  | Connects multer directly to Cloudinary storage |
| `bcrypt`                    | ^6.0.0  | Password hashing for user security             |
| `bcryptjs`                  | ^3.0.3  | JavaScript fallback for bcrypt                 |
| `jsonwebtoken`              | ^9.0.3  | JWT generation and verification for auth       |
| `cookie-parser`             | ^1.4.7  | Parses cookies from requests (used for JWT)    |
| `cors`                      | ^2.8.6  | Allows frontend to communicate with backend    |
| `dotenv`                    | ^17.2.3 | Loads environment variables from .env file     |
| `nodemon`                   | ^3.1.11 | Auto-restarts server on file changes in dev    |

---

## 🗄️ Database Structure

Built with **MySQL** using **Sequelize ORM**. All tables are auto-synced via Sequelize.

### `users`

Stores all registered users.

| Column          | Type            | Description                         |
| --------------- | --------------- | ----------------------------------- |
| `id`            | INTEGER (PK)    | Auto-increment primary key          |
| `name`          | STRING          | Display name                        |
| `password`      | STRING          | Bcrypt hashed password              |
| `profile_photo` | STRING          | Cloudinary URL of profile image     |
| `phone_number`  | BIGINT (unique) | 10-digit phone number used as login |

---

### `conversations`

Represents both private (1-to-1) and group chats.

| Column        | Type                    | Description                         |
| ------------- | ----------------------- | ----------------------------------- |
| `id`          | INTEGER (PK)            | Auto-increment primary key          |
| `type`        | ENUM('private','group') | Type of conversation                |
| `name`        | STRING                  | Group name (null for private chats) |
| `group_photo` | STRING                  | Group photo Cloudinary URL          |
| `created_by`  | INTEGER (FK)            | User ID who created the group       |
| `description` | TEXT                    | Optional group description          |

---

### `conversation_participants`

Junction table — tracks who is in which conversation.

| Column            | Type                   | Description                       |
| ----------------- | ---------------------- | --------------------------------- |
| `id`              | INTEGER (PK)           | Auto-increment primary key        |
| `conversation_id` | INTEGER (FK)           | References conversations.id       |
| `user_id`         | INTEGER (FK)           | References users.id               |
| `role`            | ENUM('admin','member') | Admin can manage group settings   |
| `joined_at`       | DATE                   | When user joined the conversation |

---

### `messages`

Stores all messages — both text and image.

| Column            | Type                                      | Description                             |
| ----------------- | ----------------------------------------- | --------------------------------------- |
| `id`              | INTEGER (PK)                              | Auto-increment primary key              |
| `sender_id`       | INTEGER (FK)                              | References users.id                     |
| `conversation_id` | INTEGER (FK)                              | References conversations.id             |
| `message_type`    | ENUM('text','image')                      | Differentiates text vs image messages   |
| `message`         | TEXT (nullable)                           | Text content — null for image messages  |
| `image_url`       | STRING (nullable)                         | Cloudinary URL — null for text messages |
| `status`          | ENUM('sending','sent','delivered','read') | Delivery tracking                       |

---

### `active_users`

Tracks real-time online/offline status and socket connections.

| Column      | Type                     | Description                               |
| ----------- | ------------------------ | ----------------------------------------- |
| `user_id`   | INTEGER (unique FK)      | References users.id — one record per user |
| `status`    | ENUM('online','offline') | Current status                            |
| `last_seen` | DATE                     | Timestamp of last activity                |
| `socket_id` | STRING (nullable)        | Current Socket.io connection ID           |

---

### Model Associations

```
Users ──< ConversationParticipants >── Conversations
Users ──< Messages
Conversations ──< Messages
Users ──< ActiveUsers (one-to-one)
Users ──< Conversations (created_by)
```

---

## 🔌 Socket.io Events

All real-time communication is handled via Socket.io in `socketHandlers.js`.

### Events the server **listens** for:

| Event               | Payload                                                              | What it does                                          |
| ------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- |
| `register`          | `userId`                                                             | Marks user online, saves socket ID to active_users    |
| `send_message`      | `{ senderUserId, conversationId, message, message_type, image_url }` | Saves message to DB, emits to all online participants |
| `message_delivered` | `messageId`                                                          | Updates message status to delivered in DB             |
| `message_read`      | `messageId`                                                          | Updates message status to read in DB                  |
| `typing_start`      | `{ conversationId, userId, userName }`                               | Emits typing indicator to other participants          |
| `typing_stop`       | `{ conversationId, userId }`                                         | Stops typing indicator for other participants         |
| `disconnect`        | —                                                                    | Marks user offline, clears socket ID                  |

### Events the server **emits**:

| Event                   | Payload                                          | Who receives it                           |
| ----------------------- | ------------------------------------------------ | ----------------------------------------- |
| `user_status_changed`   | `{ user_id, status }`                            | All connected clients                     |
| `message_sent`          | `{ messageId, conversationId, message }`         | Sender only — confirms message was saved  |
| `receive_message`       | Full message object                              | All online participants except sender     |
| `message_status_update` | `{ messageId, conversationId, status }`          | Sender — status changed to delivered/read |
| `user_typing`           | `{ conversationId, userId, userName, isTyping }` | All online participants except typer      |
| `error_message`         | Error string                                     | Sender — when something goes wrong        |

---

## 📨 send_message Flow (Detailed)

```
Client emits send_message
        ↓
Validate: conversationId, senderUserId
Validate: message (for text) OR image_url (for image)
        ↓
Check conversation exists in DB
        ↓
Check sender is a participant
        ↓
Messages.create({ message, message_type, image_url, status: "sent" })
        ↓
Fetch sender details (name, profile_photo)
        ↓
Emit message_sent back to sender
        ↓
Find all other participants
        ↓
For each participant:
  → Check active_users for online status + socket_id
  → If online: emit receive_message to their socket
  → If offline: skip (message stored in DB for later)
        ↓
If at least one delivered:
  → Update message status to "delivered" in DB
  → Emit message_status_update to sender
```

---

## 🖼️ Image Upload Flow

```
POST /api/messages/upload-image/:conversationId
        ↓
chatImageUpload multer middleware runs
        ↓
multer-storage-cloudinary intercepts the file
        ↓
Uploads to Cloudinary under: chat-images/{conversationId}/
        ↓
Returns { image_url: req.file.path } to frontend
        ↓
Frontend then emits send_message via socket with image_url
```

### Cloudinary Folder Structure

```
cloudinary/
├── profile-images/
│   └── profile-xyz.jpg
└── chat-images/
    ├── 10/
    │   ├── image-abc.jpg
    │   └── image-def.jpg
    ├── 15/
    │   └── image-ghi.jpg
    └── 23/
        └── image-jkl.jpg
```

---

## 🔐 Authentication

- Passwords are hashed with **bcrypt** before storing in DB
- On login, a **JWT token** is generated and stored in an HTTP-only cookie via `cookie-parser`
- Protected routes verify the JWT token from the cookie
- Cookie expires after 24 hours

---

## 📁 Middleware

### `upload.middleware.js`

Two separate multer instances for different upload purposes:

```
profileUpload  →  Cloudinary folder: profile-images/
chatImageUpload  →  Cloudinary folder: chat-images/{conversationId}/
```

Both share the same file filter (jpeg, jpg, png, gif, webp, avif) and 5MB size limit.

The `chatImageUpload` uses a dynamic folder function that reads `req.params.conversationId` to organize images per conversation.

---

## 🌐 REST API Endpoints

| Method | Endpoint                                     | Description                                 |
| ------ | -------------------------------------------- | ------------------------------------------- |
| `POST` | `/users/register`                            | Register new user                           |
| `POST` | `/users/login`                               | Login and get JWT cookie                    |
| `PUT`  | `/users/:id`                                 | Update profile (name + photo)               |
| `GET`  | `/users/conversations/:userId`               | Get all conversations for a user            |
| `GET`  | `/users/:conversationId`                     | Get messages for a conversation (paginated) |
| `GET`  | `/users/list/:userId`                        | Get all users except self                   |
| `POST` | `/conversations/create`                      | Create or get existing private conversation |
| `POST` | `/conversations/group/create`                | Create a new group conversation             |
| `POST` | `/api/messages/upload-image/:conversationId` | Upload chat image to Cloudinary             |

---

## ⚙️ Environment Variables

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=chatapp

# JWT
JWT_SECRET=your_jwt_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Server
PORT=5000
```

---

## 🚀 Running the Server

```bash
npm install
npm start      # runs with nodemon (auto-restart on changes)
```

---

## 🔮 Planned Features

- Typing indicator persistence
- Push notifications for offline users
- Message deletion
- Reply to message
- Read receipts per user in group chats
- Voice messages
