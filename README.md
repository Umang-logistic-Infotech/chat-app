# 💬 Chat App

A full-stack real-time chat application supporting private messaging, group chats, image sharing, online status tracking, message delivery receipts, and SSE-based push notifications.

Built with **React** on the frontend and **Node.js + Express + Socket.io** on the backend, with **MySQL** as the database and **Cloudinary** for image storage.

> For in-depth documentation see:
> - [Backend Docs →](./backend/README.md)
> - [Frontend Docs →](./frontend/README.md)

---

## ✅ Features

| Feature | Status |
|---|---|
| Real-time private messaging (1-to-1) | ✅ Done |
| Real-time group messaging | ✅ Done |
| Image sharing in chat (upload + view) | ✅ Done |
| Full-screen image lightbox with zoom + download | ✅ Done |
| Message delivery status (sending → sent → delivered → read) | ✅ Done |
| Online / offline user status | ✅ Done |
| Paginated message history (load older on scroll) | ✅ Done |
| Profile photo upload | ✅ Done |
| JWT-based authentication with HTTP-only cookies | ✅ Done |
| Create new private chats | ✅ Done |
| Create group chats with photo + description | ✅ Done |
| SSE push notifications with offline queue | ✅ Done |
| Typing indicators (backend ready) | 🔜 UI coming soon |
| Emoji picker | 🔜 Planned |
| Delete message | 🔜 Planned |
| Reply to message | 🔜 Planned |
| Message reactions | 🔜 Planned |
| Voice messages | 🔜 Planned |
| Read receipts per user in groups | 🔜 Planned |

---

## 🗂️ Project Structure

```
chat-app/
├── backend/                         # Node.js + Express + Socket.io server
│   ├── server.js                    # Entry point
│   ├── config/                      # DB + Cloudinary config
│   ├── Models/                      # Sequelize models + associations
│   ├── Routes/                      # REST API routes
│   ├── middleware/                  # JWT auth + file upload
│   ├── socket/                      # Socket.io event handlers
│   ├── sse/                         # SSE manager + notification service
│   ├── utils/                       # Background jobs (token cleanup)
│   ├── .env                         # Backend environment variables
│   ├── package.json
│   └── README.md                    # → Backend documentation
│
├── frontend/                        # React application
│   ├── src/
│   │   ├── pages/                   # Home.jsx (main chat page)
│   │   ├── components/              # chat/, sidebar/, dialogs/, common/
│   │   ├── hooks/                   # useSocket.js
│   │   ├── context/                 # UserContext.jsx
│   │   └── Interceptor/             # Axios with JWT header
│   ├── .env                         # Frontend environment variables
│   ├── package.json
│   └── README.md                    # → Frontend documentation
│
└── README.md                        # This file
```

---

## 🧰 Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 19 | UI library |
| Material UI v7 | Component library and styling |
| Socket.io Client | Real-time WebSocket communication |
| Axios | HTTP requests to backend |
| react-virtuoso | Virtualized message list for performance |
| yet-another-react-lightbox | Full-screen image viewer |
| React Router v7 | Client-side routing |
| js-cookie | JWT token reading from cookies |

### Backend

| Technology | Purpose |
|---|---|
| Node.js + Express v5 | HTTP server and REST API |
| Socket.io | Real-time bidirectional communication |
| SSE (Server-Sent Events) | Push notifications + offline queue |
| MySQL + Sequelize | Relational database and ORM |
| Cloudinary | Cloud image storage |
| Multer | File upload handling |
| JWT + bcryptjs | Authentication and password security |

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                      │
│                                                           │
│  Home.jsx (owns all state)                               │
│    ├── Sidebar  → ChatList → ChatListItem                 │
│    ├── ChatArea → MessageList (virtuoso) → MessageItem    │
│    │              MessageInput (text + image)             │
│    └── Dialogs  → NewChatDialog, CreateGroupDialog        │
│                                                           │
│  useSocket.js  — all Socket.io logic in one hook         │
│  Interceptor/auth.js  — Axios with JWT Bearer header     │
└─────────────┬──────────────────┬────────────────┬────────┘
              │  WebSocket       │  HTTP REST     │  SSE
              │  (Socket.io)     │  (Axios)       │  (EventSource)
┌─────────────▼──────────────────▼────────────────▼────────┐
│                     BACKEND (Node.js)                     │
│                                                           │
│  REST Routes                                             │
│    ├── /users/*            auth, profile, conversations  │
│    ├── /conversations/*    private + group management    │
│    ├── /api/messages/*     image upload (Cloudinary)     │
│    └── /notifications/*    SSE token + stream            │
│                                                           │
│  Socket.io Handlers                                      │
│    register → send_message → message_delivered/read      │
│    typing_start/stop → disconnect                        │
│                                                           │
│  SSE Notification Pipeline                               │
│    notificationService → sseManager / queued_notifications│
└──────────┬──────────────────────────────┬────────────────┘
           │                              │
┌──────────▼────────────┐    ┌───────────▼────────────────┐
│    MySQL Database      │    │    Cloudinary              │
│                        │    │                            │
│  users                 │    │  profile-images/           │
│  conversations         │    │  chat-images/              │
│  conversation_         │    │    └── {conversationId}/   │
│    participants        │    │          └── image.jpg     │
│  messages              │    └────────────────────────────┘
│  active_users          │
│  queued_notifications  │
│  sse_tokens            │
└────────────────────────┘
```

---

## 🔄 Core Flows

### Text Message

```
User types + sends
        ↓
Optimistic message in UI immediately (status: sending)
        ↓
socket.emit("send_message") → backend validates → saves to DB
        ↓
Backend emits "message_sent" → sender (status: sent)
Backend emits "receive_message" → all online participants
        ↓
If ≥1 receiver online → status auto-upgrades to "delivered"
        ↓
Receiver opens conversation → "message_read" emitted → status: read
        ↓
Sender sees: ⏱ → ✓ → ✓✓ (grey) → ✓✓ (blue)
```

### Image Message

```
User picks image → preview shown in MessageInput
        ↓
Optimistic message in UI with local blob preview (status: sending)
        ↓
HTTP POST /api/messages/upload-image/:conversationId
  → Multer + Cloudinary → stores under chat-images/{conversationId}/
  → returns { image_url }
        ↓
socket.emit("send_message") with { message_type: "image", image_url }
        ↓
Backend saves → emits to all participants
        ↓
Sender: local preview replaced with Cloudinary URL silently
Receiver: image renders in real time via Cloudinary CDN
```

### Authentication

```
User submits login form
        ↓
POST /users/login → bcryptjs verifies password
        ↓
JWT issued (24h) → stored in HTTP-only cookie
        ↓
React UserContext reads user from cookie on app load
        ↓
Axios interceptor attaches "Authorization: Bearer <token>" to every request
        ↓
Socket connects → emits "register" with userId
        ↓
Backend marks user online in active_users table
        ↓
Previously undelivered messages upgraded to "delivered" + senders notified
```

### SSE Notifications

```
Client: POST /notifications/token → receive one-time token (30s TTL)
        ↓
Client: GET /notifications/stream?token=...
        ↓
Backend: validates + consumes token → registers SSE connection
        ↓
Flush any queued_notifications from DB in order
        ↓
New messages: push live to SSE stream if connected
             OR insert into queued_notifications if offline
```

---

## 🗄️ Database Schema (Summary)

| Table | Key Columns |
|---|---|
| `users` | `id`, `name`, `password` (hashed), `profile_photo`, `phone_number` (unique login) |
| `conversations` | `id`, `type` (private/group), `name`, `group_photo`, `created_by`, `description` |
| `conversation_participants` | `conversation_id`, `user_id`, `role` (admin/member), `joined_at` |
| `messages` | `id`, `sender_id`, `conversation_id`, `message_type` (text/image), `message`, `image_url`, `status` |
| `active_users` | `user_id` (unique), `status` (online/offline), `last_seen`, `socket_id` |
| `queued_notifications` | SSE notifications queued for offline users |
| `sse_tokens` | One-time tokens (30s TTL) for authenticating the SSE stream |

> Full column details, types, and associations: [Backend Docs → Database Structure](./backend/README.md)

---

## ⚙️ Environment Variables

### Backend — `backend/.env`

```env
# Server
PORT=5000
NODE_ENV=development

# CORS
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

### Frontend — `frontend/.env`

```env
REACT_APP_API_URL=http://localhost:5000
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- MySQL server running locally
- Cloudinary account (free tier is fine)

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/chat-app.git
cd chat-app
```

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env   # fill in your credentials
npm start              # runs on http://localhost:5000
```

### 3. Set up the frontend

```bash
cd frontend
npm install
cp .env.example .env   # set REACT_APP_API_URL
npm start              # runs on http://localhost:3000
```

### 4. Open the app

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |

The backend will auto-sync the database schema on first start (`sync({ alter: true })`).

---

## 📚 Detailed Documentation

| Document | Covers |
|---|---|
| [Backend README](./backend/README.md) | API reference, socket events, SSE pipeline, DB schema, auth, upload system |
| [Frontend README](./frontend/README.md) | Component tree, state management, data flow, useSocket hook, virtualization, lightbox, pagination |

---

## 🔮 Planned Features

| Feature | Status |
|---|---|
| Typing indicator UI | 🔜 Coming soon |
| Emoji picker | 🔜 Coming soon |
| Delete message | 🔜 Coming soon |
| Reply to message | 🔜 Coming soon |
| Copy message text | 🔜 Coming soon |
| Push notifications (mobile) | 📋 Planned |
| Message reactions | 📋 Planned |
| Voice messages | 📋 Planned |
| Read receipts per user in groups | 📋 Planned |
