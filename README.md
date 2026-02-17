# 💬 Chat App

A full-stack real-time chat application supporting private messaging, group chats, image sharing, online status tracking, and message delivery receipts.

Built with **React** on the frontend and **Node.js + Express + Socket.io** on the backend, with **MySQL** as the database and **Cloudinary** for image storage.

---

## 📸 Features

- ✅ Real-time private messaging (1-to-1)
- ✅ Real-time group messaging
- ✅ Image sharing in chat (upload + view)
- ✅ Full-screen image lightbox with zoom + download
- ✅ Message delivery status (sending → sent → delivered → read)
- ✅ Online / offline user status
- ✅ Typing indicators (backend ready, UI coming soon)
- ✅ Paginated message history (load older messages on scroll)
- ✅ Profile photo upload
- ✅ JWT-based authentication with HTTP-only cookies
- ✅ Create new private chats
- ✅ Create group chats with photo + description

---

## 🗂️ Project Structure

```
chat-app/
├── backend/                  # Node.js + Express + Socket.io server
│   ├── server.js
│   ├── config/
│   ├── Models/
│   ├── routes/
│   ├── middleware/
│   ├── socket/
│   ├── .env
│   ├── package.json
│   └── README.md             # Detailed backend documentation
│
├── frontend/                 # React application
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── context/
│   │   └── Interceptor/
│   ├── .env
│   ├── package.json
│   └── README.md             # Detailed frontend documentation
│
└── README.md                 # This file
```

---

## 🧰 Tech Stack

### Frontend

| Technology                 | Purpose                                  |
| -------------------------- | ---------------------------------------- |
| React 19                   | UI library                               |
| Material UI v7             | Component library and styling            |
| Socket.io Client           | Real-time WebSocket communication        |
| Axios                      | HTTP requests to backend                 |
| react-virtuoso             | Virtualized message list for performance |
| yet-another-react-lightbox | Full-screen image viewer                 |
| React Router v7            | Client-side routing                      |

### Backend

| Technology           | Purpose                               |
| -------------------- | ------------------------------------- |
| Node.js + Express v5 | HTTP server and REST API              |
| Socket.io            | Real-time bidirectional communication |
| MySQL + Sequelize    | Relational database and ORM           |
| Cloudinary           | Cloud image storage                   |
| Multer               | File upload handling                  |
| JWT + bcrypt         | Authentication and password security  |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (React)                  │
│                                                      │
│  Home.jsx (state)                                    │
│    ├── Sidebar (chat list)                           │
│    ├── ChatArea (messages)                           │
│    │     ├── MessageList (virtualized)               │
│    │     │     └── MessageItem (bubble + lightbox)   │
│    │     └── MessageInput (text + image)             │
│    └── Dialogs (new chat, create group)              │
│                                                      │
│  useSocket.js (all socket logic in one hook)         │
└────────────────┬──────────────────┬─────────────────┘
                 │   WebSocket      │   HTTP (REST)
                 │   (Socket.io)    │   (Axios)
┌────────────────▼──────────────────▼─────────────────┐
│                    BACKEND (Node.js)                  │
│                                                      │
│  server.js                                           │
│    ├── REST Routes                                   │
│    │     ├── /users/*        (auth, profile, chats)  │
│    │     ├── /conversations/* (create, group)        │
│    │     └── /api/messages/* (image upload)          │
│    │                                                  │
│    └── Socket.io Handlers                            │
│          ├── register                                │
│          ├── send_message                            │
│          ├── message_delivered / message_read        │
│          ├── typing_start / typing_stop              │
│          └── disconnect                              │
└────────────────┬──────────────────┬─────────────────┘
                 │                  │
┌────────────────▼──────┐  ┌───────▼─────────────────┐
│   MySQL Database       │  │   Cloudinary             │
│                        │  │                          │
│   users                │  │   profile-images/        │
│   conversations        │  │   chat-images/           │
│   conversation_        │  │     ├── {convId}/        │
│     participants       │  │     │     └── img.jpg    │
│   messages             │  │     └── ...              │
│   active_users         │  │                          │
└────────────────────────┘  └─────────────────────────┘
```

---

## 🔄 Core Flows

### Text Message Flow

```
User types message → hits Enter or Send
        ↓
Optimistic message added to UI immediately (status: sending)
        ↓
Socket emits send_message { senderUserId, conversationId, message, message_type: "text" }
        ↓
Backend validates → saves to DB → emits message_sent to sender
        ↓
Backend finds all online participants → emits receive_message to each
        ↓
Sender UI: optimistic message updated with real ID (status: sent → delivered)
        ↓
Receiver UI: new message appears in real time
```

### Image Message Flow

```
User picks image → preview shown in input area
        ↓
User clicks Send
        ↓
Optimistic message added to UI with local preview URL (status: sending)
        ↓
HTTP POST /api/messages/upload-image/:conversationId
        ↓
Multer → Cloudinary → stored under chat-images/{conversationId}/
        ↓
Backend returns { image_url } (permanent Cloudinary URL)
        ↓
Socket emits send_message { message_type: "image", image_url }
        ↓
Backend saves to DB → emits to all participants
        ↓
Sender: optimistic message replaced with real Cloudinary URL
        ↓
Receiver: image renders in real time via Cloudinary CDN
```

### Authentication Flow

```
User submits login form
        ↓
POST /users/login → backend verifies password (bcrypt)
        ↓
JWT token generated → stored in HTTP-only cookie
        ↓
React UserContext reads user from cookie on app load
        ↓
Axios interceptor attaches token to every API request
        ↓
Socket connects → emits register with userId
        ↓
Backend marks user online in active_users table
```

### Message Status Flow

```
Message created → status: "sent"
        ↓
Receiver's socket receives message → emits message_delivered
        ↓
Backend updates status: "delivered" → notifies sender
        ↓
Receiver opens the conversation → markMessageAsRead() called
        ↓
Backend updates status: "read" → notifies sender
        ↓
Sender sees: ✓ → ✓✓ (grey) → ✓✓ (blue)
```

---

## 🗄️ Database Schema (Summary)

```
users
  id, name, password, profile_photo, phone_number

conversations
  id, type (private/group), name, group_photo, created_by, description

conversation_participants
  id, conversation_id → conversations, user_id → users, role (admin/member), joined_at

messages
  id, sender_id → users, conversation_id → conversations,
  message_type (text/image), message (nullable), image_url (nullable),
  status (sending/sent/delivered/read)

active_users
  user_id → users (unique), status (online/offline), last_seen, socket_id
```

---

## ⚙️ Environment Variables

### Backend `.env`

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=chatapp
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=5000
```

### Frontend `.env`

```env
REACT_APP_API_URL=http://localhost:5000
```

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/chat-app.git
cd chat-app
```

### 2. Setup Backend

```bash
cd backend
npm install
# create .env file with your credentials (see above)
npm start
```

### 3. Setup Frontend

```bash
cd frontend
npm install
# create .env file with your credentials (see above)
npm start
```

### 4. Open the app

```
Frontend: http://localhost:3000
Backend:  http://localhost:5000
```

---

## 📚 Detailed Documentation

For in-depth documentation of each side:

- 👉 [Backend README](./backend/README.md) — DB schema, socket events, API endpoints, middleware, auth flow
- 👉 [Frontend README](./frontend/README.md) — Component tree, state management, data flow, hooks, virtualization, lightbox

---

## 🔮 Planned Features

| Feature                          | Status         |
| -------------------------------- | -------------- |
| Typing indicator UI              | 🔜 Coming soon |
| Emoji picker                     | 🔜 Coming soon |
| Delete message                   | 🔜 Coming soon |
| Reply to message                 | 🔜 Coming soon |
| Copy message text                | 🔜 Coming soon |
| Group photo upload               | 🔜 Coming soon |
| Push notifications               | 📋 Planned     |
| Message reactions                | 📋 Planned     |
| Voice messages                   | 📋 Planned     |
| Read receipts per user in groups | 📋 Planned     |
