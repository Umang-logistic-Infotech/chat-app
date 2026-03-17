# 🔧 Chat App — Backend

A real-time chat backend built with **Node.js**, **Express**, **Socket.io**, **MySQL**, **Sequelize**, and **Cloudinary**. Supports private messaging, group chats, image sharing, online status tracking, JWT-based authentication, and SSE-based notifications.

---

## 🛠️ Stack

| Layer | Technology |
|---|---|
| HTTP API | Node.js + Express |
| Real-time chat | Socket.io |
| Push notifications | SSE (Server-Sent Events) + offline queue |
| Database | MySQL + Sequelize ORM |
| File uploads | Cloudinary + Multer |
| Auth | JWT (cookie + bearer header) |

---

## 📁 Project Structure

```
backend/
├── server.js                          # Entry point — Express + Socket.io setup
├── config/
│   ├── db.js                          # Sequelize MySQL connection
│   ├── cloudinary.js                  # Cloudinary SDK configuration
│   ├── socket.js                      # (legacy — unused)
│   └── Associations.js                # (legacy — unused, see Models/index.js)
├── Models/
│   ├── index.js                       # All model associations
│   ├── Users.js                       # User accounts + password hooks
│   ├── Conversations.js               # Private & group conversations
│   ├── Conversation_Participants.js   # Who is in which conversation
│   ├── Messages.js                    # All messages (text + image)
│   ├── ActiveUsers.js                 # Online/offline status + socket ID
│   ├── QueuedNotification.js          # Offline SSE notification queue
│   └── SSEToken.js                    # One-time SSE auth tokens
├── middleware/
│   ├── verifyJwt.js                   # Bearer token validation
│   └── upload.js                      # Multer + Cloudinary storage config
├── Routes/
│   ├── UserRoutes.js                  # Auth, profile, message fetch, conversation list
│   ├── ConversationRoutes.js          # Private conversation create/reuse
│   ├── GroupRoutes.js                 # Group CRUD + member/admin operations
│   ├── MessageRoutes.js               # Chat image upload endpoint
│   └── NotificationRoutes.js          # SSE token + stream endpoints
├── socket/
│   └── socketHandler.js              # All Socket.io event handlers
├── sse/
│   ├── sseManager.js                  # In-memory active SSE client registry
│   └── notificationService.js         # Notification routing (live vs queue)
└── utils/
    └── cleanupSSETokens.js            # Periodic expired-token cleanup job
```

---

## 📦 Packages Used

| Package | Version | Purpose |
|---|---|---|
| `express` | ^5.2.1 | HTTP server and REST API routing |
| `socket.io` | ^4.8.3 | Real-time bidirectional communication |
| `sequelize` | ^6.37.7 | ORM for MySQL — models, associations, queries |
| `mysql2` | ^3.16.2 | MySQL driver required by Sequelize |
| `cloudinary` | ^1.41.3 | Cloud storage for profile and chat images |
| `multer` | ^2.0.2 | Handles multipart/form-data file uploads |
| `multer-storage-cloudinary` | ^4.0.0 | Connects multer to Cloudinary storage |
| `bcryptjs` | ^3.0.3 | Password hashing |
| `jsonwebtoken` | ^9.0.3 | JWT generation and verification |
| `cookie-parser` | ^1.4.7 | Parses cookies from requests |
| `cors` | ^2.8.6 | Cross-origin resource sharing |
| `dotenv` | ^17.2.3 | Loads environment variables from `.env` |
| `nodemon` | ^3.1.11 | Auto-restarts server in dev |

---

## 🏗️ Architecture Overview

The backend uses **two real-time channels** with different responsibilities:

| Channel | Responsibility |
|---|---|
| **Socket.io** | Chat transport — message send/deliver/read, typing indicators, online status |
| **SSE** | Notification toasts — with DB queue fallback for offline users |

- Socket events update the chat UI in real time.
- SSE handles notification feeds and replays queued notifications on reconnect.

---

## 🚀 Startup Flow (`server.js`)

```
1. Load DB + models       → config/db.js, Models/index.js
2. Apply CORS             → FRONT_END_URL_NETWORK and FRONT_END_URL
3. Body parsing + cookies
4. Mount /users routes    → public (auth routes live here)
5. Apply JWT middleware   → all routes below this point are protected
6. Mount protected routes → /notifications, /conversations, /api
7. Attach Socket.io       → register socket handlers
8. Start SSE cleanup job  → deletes expired tokens every 60s
9. Start HTTP server      → PORT
```

---

## 🔐 Authentication

### Registration / Login

- `POST /users/register` and `POST /users/login` both issue a **JWT (24h)** and set two cookies:
  - `token` — httpOnly JWT
  - `user` — serialized user object

### Password Security (`Models/Users.js`)

- Passwords hashed with **bcryptjs** in Sequelize model hooks:
  - `beforeCreate`
  - `beforeUpdate` (only if password field changed)
- Salt rounds configured via `DB_PASSWORD_SALTROUNDS` (default `10`).

### Route Protection

- Global middleware `middleware/verifyJwt.js` expects `Authorization: Bearer <token>`.
- `POST /notifications/token` also applies route-level `verifyJwt`.

---

## 🗄️ Database Structure

All models defined in `Models/*.js`. Associations are set in `Models/index.js`.

```
Users ──< ConversationParticipants >── Conversations
Users ──< Messages (as sender)
Conversations ──< Messages
Users ──1 ActiveUsers
Users ──< SSEToken
Users ──< QueuedNotification (via conversationId)
```

### `users`

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER (PK) | Auto-increment |
| `name` | STRING | Display name |
| `password` | STRING | bcryptjs hashed |
| `profile_photo` | STRING | Cloudinary URL |
| `phone_number` | BIGINT (unique) | Used as login identifier |

### `conversations`

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER (PK) | Auto-increment |
| `type` | ENUM(`private`,`group`) | Conversation type |
| `name` | STRING | Group name (null for private) |
| `group_photo` | STRING | Cloudinary URL |
| `created_by` | INTEGER (FK → users) | Creator user ID |
| `description` | TEXT | Optional group description |

### `conversation_participants`

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER (PK) | Auto-increment |
| `conversation_id` | INTEGER (FK) | References conversations.id |
| `user_id` | INTEGER (FK) | References users.id |
| `role` | ENUM(`admin`,`member`) | Admin can manage group settings |
| `joined_at` | DATE | When user joined |

### `messages`

| Column | Type | Description |
|---|---|---|
| `id` | INTEGER (PK) | Auto-increment |
| `sender_id` | INTEGER (FK) | References users.id |
| `conversation_id` | INTEGER (FK) | References conversations.id |
| `message_type` | ENUM(`text`,`image`) | Content type |
| `message` | TEXT (nullable) | Text content |
| `image_url` | STRING (nullable) | Cloudinary URL |
| `status` | ENUM(`sending`,`sent`,`delivered`,`read`) | Delivery tracking |

### `active_users`

| Column | Type | Description |
|---|---|---|
| `user_id` | INTEGER (unique FK) | One row per user |
| `status` | ENUM(`online`,`offline`) | Current status |
| `last_seen` | DATE | Last activity timestamp |
| `socket_id` | STRING (nullable) | Current Socket.io connection ID |

### `queued_notifications`

Stores notifications for offline users. Flushed in order when user connects via SSE.

### `sse_tokens`

One-time short-lived tokens (30s expiry) used to authenticate the SSE stream endpoint.

---

## 🌐 REST API Reference

### User, Auth & Profile — `/users`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/users/register` | ❌ | Create account, hash password, issue JWT |
| `POST` | `/users/login` | ❌ | Validate credentials, issue JWT |
| `POST` | `/users/logout` | ❌ | Clear auth cookies |
| `GET` | `/users/me` | Cookie | Return current user from cookie token |
| `GET` | `/users/verify/token` | Cookie/Bearer | Verify token validity |
| `PUT` | `/users/:id` | ✅ | Update name or profile photo |
| `DELETE` | `/users/:id` | ✅ | Delete account |
| `GET` | `/users/list/:currentUserId` | ✅ | List all users except current |
| `GET` | `/users/find-by-phone/:phoneNumber` | ✅ | Lookup user by phone |

### Conversations & Messages — `/users`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/users/:conversationId` | ✅ | Paginated message history (`before_id`, `limit=15`) |
| `GET` | `/users/conversations/:userId` | ✅ | Conversation list for sidebar UI |
| `GET` | `/users/conversation/:conversationId` | ✅ | Conversation details with participants |

### Private Conversations — `/conversations`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/conversations/create` | ✅ | Create or reuse existing private conversation |

### Group Management — `/conversations/group`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/conversations/group/create` | ✅ | Create group (multipart, optional `group_photo`) |
| `GET` | `/conversations/group/user/:userId` | ✅ | All groups for user |
| `GET` | `/conversations/group/:groupId` | ✅ | Group details |
| `POST` | `/conversations/group/:groupId/add-members` | ✅ Admin | Add members |
| `DELETE` | `/conversations/group/:groupId/remove-member/:userId` | ✅ Admin | Remove member |
| `POST` | `/conversations/group/:groupId/leave` | ✅ | Leave group |
| `PUT` | `/conversations/group/:groupId` | ✅ Admin | Update group info/photo |
| `PUT` | `/conversations/group/:groupId/make-admin/:userId` | ✅ Admin | Promote member to admin |

### Image Upload — `/api`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/messages/upload-image/:conversationId` | ✅ | Upload image to Cloudinary, returns `{ image_url }` |

### SSE Notifications — `/notifications`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/notifications/token` | ✅ | Issue one-time SSE token (30s expiry) |
| `GET` | `/notifications/stream?token=<token>` | Token | Open SSE stream, flush queued notifications |

---

## 🔌 Socket.io Events (`socket/socketHandler.js`)

### Client → Server

| Event | Payload | What it does |
|---|---|---|
| `register` | `userId` | Mark user online, upgrade old `sent` messages to `delivered`, notify senders |
| `send_message` | `{ senderUserId, conversationId, message, message_type, image_url }` | Persist message, emit to online participants, send SSE notification |
| `message_delivered` | `messageId` | Update status to `delivered`, notify sender |
| `message_read` | `messageId` | Update status to `read`, notify sender |
| `typing_start` | `{ conversationId, userId, userName }` | Emit `user_typing (isTyping: true)` to other participants |
| `typing_stop` | `{ conversationId, userId }` | Emit `user_typing (isTyping: false)` to other participants |
| `disconnect` | — | Mark user offline, broadcast `user_status_changed` |

### Server → Client

| Event | Payload | Who receives it |
|---|---|---|
| `user_status_changed` | `{ user_id, status, last_seen }` | All connected clients |
| `message_sent` | `{ messageId, conversationId, message }` | Sender only — confirms persist |
| `receive_message` | Full message object | All online participants (except sender) |
| `message_status_update` | `{ messageId, conversationId, status }` | Sender — delivery/read confirmation |
| `user_typing` | `{ conversationId, userId, userName, isTyping }` | All online participants (except typer) |
| `error_message` | Error string | Sender — on validation/server errors |

### `send_message` Flow

```
Client emits send_message
        ↓
Validate: conversationId, senderUserId, message OR image_url
        ↓
Check conversation exists + sender is a participant
        ↓
Messages.create({ ..., status: "sent" })
        ↓
Fetch sender details (name, profile_photo)
        ↓
Emit message_sent → sender
        ↓
For each other participant:
  → If online :  emit receive_message to their socket
  → If offline : skip (stored in DB)
        ↓
Send SSE notification via notificationService
        ↓
If ≥1 receiver was online:
  → Update message status → "delivered"
  → Emit message_status_update → sender
```

---

## 📡 SSE Notification Pipeline (`sse/`)

### Flow

```
Client  →  POST /notifications/token          (get one-time token, 30s TTL)
        →  GET  /notifications/stream?token=… (open SSE connection)
                ↓
        Token validated + consumed (one-time use)
                ↓
        Client registered in sseManager (in-memory)
                ↓
        Flush queued_notifications in order → mark delivered
                ↓
        Live: new notifications pushed directly to SSE response
        Offline: inserted into queued_notifications for next connect
```

### Files

| File | Purpose |
|---|---|
| `sse/sseManager.js` | In-memory map of active SSE client connections |
| `sse/notificationService.js` | Decides: push live or queue in DB |
| `Routes/NotificationRoutes.js` | Token issue + stream endpoints |
| `utils/cleanupSSETokens.js` | Deletes expired unused SSE tokens every 60s |

---

## 🖼️ Upload System (`middleware/upload.js`)

Two Multer + Cloudinary instances:

| Middleware | Cloudinary Folder | Used by |
|---|---|---|
| `profileUpload` | `profile-images/` | `PUT /users/:id` |
| `chatImageUpload` | `chat-images/<conversationId>/` | `POST /api/messages/upload-image/:conversationId` |

**Shared constraints:** file types `jpeg jpg png gif webp avif` — max size **5 MB**.

### Image upload flow

```
POST /api/messages/upload-image/:conversationId
        ↓
chatImageUpload middleware (multer-storage-cloudinary)
        ↓
Uploads to: Cloudinary/chat-images/{conversationId}/
        ↓
Returns { image_url: req.file.path }
        ↓
Frontend emits send_message via socket with image_url
```

---

## ⚙️ Environment Variables

Create a `.env` file in `backend/`:

```env
# Server
PORT=5000
NODE_ENV=development

# CORS allowed origins
FRONT_END_URL=http://localhost:3000
FRONT_END_URL_NETWORK=http://192.168.x.x:3000

# MySQL
DATABASE_HOST=localhost
DATABASE_USERNAME=root
DATABASE_PASS=your_password
DATABASE_NAME=chat_app

# Auth
JWT_SECRET=your_jwt_secret
DB_PASSWORD_SALTROUNDS=10

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 🚀 Running the Server

```bash
npm install
npm start      # runs with nodemon (auto-restart on file changes)
```

---

## ⚠️ Notes

- **`sync({ alter: true })`** is used in development. Control this carefully in production to avoid unintended schema changes.
- **`config/Associations.js`** is legacy and not used — source of truth for associations is `Models/index.js`.
- **Auth source varies by endpoint:** some routes use cookies (`/users/me`), protected routes use the bearer header. Keep the frontend Axios interceptor consistent with this.
