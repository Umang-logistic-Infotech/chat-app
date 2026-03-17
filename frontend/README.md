# ⚛️ Chat App — Frontend

A real-time chat frontend built with **React**, **Material UI**, **Socket.io Client**, and **Axios**. Supports private messaging, group chats, image sharing with lightbox, online status, message delivery tracking, and paginated message history.

---

## �️ Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19 |
| Component Library | Material UI (MUI) v7 |
| Real-time | Socket.io Client |
| HTTP | Axios (with auth interceptor) |
| Routing | React Router DOM v7 |
| Message List | react-virtuoso (virtualized) |
| Image Viewer | yet-another-react-lightbox |
| Auth storage | js-cookie |

---

## 📁 Project Structure

```
src/
├── App.js                              # Root component — routing setup
├── components/
│   ├── chat/
│   │   ├── ChatArea.jsx                # Container for the active chat
│   │   ├── ChatHeader.jsx              # Chat name, status, options menu
│   │   ├── MessageList.jsx             # Virtualized list of all messages
│   │   ├── MessageItem.jsx             # Single message bubble + lightbox
│   │   ├── MessageInput.jsx            # Text input + image picker + send
│   │   └── EmptyChatArea.jsx           # Shown when no chat is selected
│   ├── sidebar/
│   │   ├── Sidebar.jsx                 # Left panel container
│   │   ├── SidebarHeader.jsx           # "Chats" title + new chat button
│   │   ├── SidebarSearch.jsx           # Search bar for filtering chats
│   │   ├── ChatList.jsx                # Renders the list of conversations
│   │   └── ChatListItem.jsx            # Single conversation row in sidebar
│   ├── dialogs/
│   │   ├── NewChatDialog.jsx           # Dialog to start a new private chat
│   │   └── CreateGroupDialog.jsx       # Dialog to create a group chat
│   └── common/
│       ├── UserAvatar.jsx              # Avatar with optional online badge
│       └── UserListItem.jsx            # User row used in dialogs
├── hooks/
│   └── useSocket.js                    # Custom hook — all Socket.io logic
├── context/
│   └── UserContext.jsx                 # Global logged-in user state
├── Interceptor/
│   └── auth.js                         # Axios instance with JWT header
└── pages/
    └── Home.jsx                        # Main chat page — owns all state
```

---

## 📦 Packages Used

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.4 | Core UI library |
| `react-dom` | ^19.2.4 | DOM rendering |
| `react-router-dom` | ^7.13.0 | Client-side routing |
| `@mui/material` | ^7.3.7 | UI components (inputs, dialogs, avatars, etc.) |
| `@mui/icons-material` | ^7.3.7 | MUI icon set |
| `@emotion/react` | ^11.14.0 | CSS-in-JS engine required by MUI |
| `@emotion/styled` | ^11.14.1 | Styled component support for MUI |
| `socket.io-client` | ^4.8.3 | WebSocket connection to backend |
| `axios` | ^1.13.4 | HTTP requests to backend REST API |
| `react-virtuoso` | ^4.18.1 | Virtualized list for performant message rendering |
| `yet-another-react-lightbox` | ^3.29.1 | Full-screen image viewer with zoom + download |
| `js-cookie` | ^3.0.5 | Read/write browser cookies (JWT token) |
| `bootstrap` | ^5.3.8 | Utility CSS classes |
| `react-bootstrap` | ^2.10.10 | Bootstrap React components |
| `web-vitals` | ^2.1.4 | Performance metrics reporting |

---

## 🚀 Running the Frontend

```bash
npm install
npm start      # runs on http://localhost:3000
```

### Environment Variables

Create a `.env` file in `frontend/`:

```env
REACT_APP_API_URL=http://localhost:5000
```

---

## 🧠 State Management

No external state library (no Redux, no Zustand). All state lives in `Home.jsx` using React's built-in `useState` and `useEffect`. The app has one main page (the chat UI), and all data flows through it — an external store would add unnecessary complexity at this scale.

### State in `Home.jsx`

| State | Type | Description |
|---|---|---|
| `chats` | `Array` | All conversations the user is part of |
| `selectedChat` | `Object \| null` | The currently open conversation |
| `messages` | `{ [conversationId]: Message[] }` | Per-conversation message cache |
| `onlineUsers` | `{ [userId]: { status, last_seen } }` | Real-time presence map |
| `messagesPagination` | `{ [conversationId]: PaginationInfo }` | Per-conversation pagination state |
| `loadingOldMessages` | `{ [conversationId]: boolean }` | Loading flag per conversation |
| `newChatDialogOpen` | `boolean` | New private chat dialog visibility |
| `createGroupDialogOpen` | `boolean` | Create group dialog visibility |

### Why `messages` is keyed by `conversationId`

```javascript
// Per-conversation cache — not a flat array
messages = {
  10: [msg1, msg2],
  15: [msg3, msg4, msg5],
  23: [msg6],
};
```

Switching between chats is instant — no re-fetch if already loaded. Each conversation maintains its own independent message cache.

---

## 🔄 Data Flow

Props flow **down**, callbacks flow **up**:

```
Home.jsx (owns all state)
    │
    ├── messages ──────────────────────→ ChatArea → MessageList → MessageItem
    ├── selectedChat ───────────────────→ ChatArea → ChatHeader
    ├── chats ──────────────────────────→ Sidebar → ChatList → ChatListItem
    ├── onlineUsers ────────────────────→ Sidebar → ChatList → ChatListItem
    │
    ← onSendTextMessage(text)  ─────────── MessageInput
    ← onSendImageMessage(file) ─────────── MessageInput
    ← onSelectChat(chat) ───────────────── ChatListItem
    ← onLoadOlderMessages(convId) ─────── MessageList
    ← onChatCreated(chatData) ──────────── NewChatDialog
    ← onGroupCreated(groupData) ────────── CreateGroupDialog
```

---

## 🔌 `useSocket` Hook (`hooks/useSocket.js`)

Encapsulates **all Socket.io logic**. Called once in `Home.jsx`:

```javascript
const {
  sendMessage,
  sendImageMessage,
  incomingMessage,
  markMessageAsRead,
  messageStatusUpdate,
  userStatusUpdate,
  typingStatus,
  startTyping,
  stopTyping,
  isConnected,
} = useSocket(user?.id);
```

`Home.jsx` does not interact with Socket.io directly — it only reacts to the reactive values the hook exposes.

### How incoming socket events reach React state

```
Socket event fires (e.g. receive_message)
        ↓
useSocket sets incomingMessage = { ...message, _timestamp: Date.now() }
        ↓
Home.jsx useEffect detects the change
        ↓
messages state updated with the new message
        ↓
React re-renders MessageList automatically
        ↓
New MessageItem appears in UI
```

> The `_timestamp: Date.now()` field is added to every incoming message so that `useEffect` always re-triggers — even if two identical messages arrive back-to-back (same object reference would otherwise be ignored by React).

### Text message send flow

```
Home.jsx calls sendMessage({ receiverUserId, message, conversationId })
        ↓
socket.emit("send_message", payload)
        ↓
Wait for "message_sent" event (Promise)
        ↓
Resolve with { messageId, conversationId }
```

### Image message send flow

```
Step 1: POST /api/messages/upload-image/:conversationId  (HTTP)
        → Multer + Cloudinary → returns { image_url }
        ↓
Step 2: socket.emit("send_message", { ..., message_type: "image", image_url })
        ↓
Wait for "message_sent" event (Promise)
        ↓
Resolve with { messageId, conversationId }
```

HTTP is used for the file upload because sockets cannot transfer binary data efficiently. The socket only carries the Cloudinary URL after the upload is done.

---

## 🖼️ Image Sharing Flow

```
User clicks attach icon (MessageInput)
        ↓
Hidden <input type="file"> triggers
        ↓
handleImageSelect() → stores File object + creates local preview URL
        ↓
User sees preview thumbnail with cancel option
        ↓
User clicks Send
        ↓
Home.jsx handleSendImageMessage():
  1. Creates optimistic message with local preview URL (status: "sending")
  2. Appends it to messages state immediately → user sees it right away
  3. Calls sendImageMessage(conversationId, file) from useSocket
        ↓
useSocket uploads file → Cloudinary → receives real image_url
        ↓
socket.emit("send_message") with image_url
        ↓
On success → replace optimistic message with real message + Cloudinary URL
On failure → update optimistic message status to "failed"
```

The image appears **instantly** with a local blob preview. The Cloudinary URL silently replaces it on success — the user never waits to see the image.

---

## 📜 Message List & Virtualization (`MessageList.jsx`)

`MessageList.jsx` uses **react-virtuoso** to render messages efficiently.

Without virtualization, 1000+ messages would create 1000+ DOM nodes causing severe scroll performance issues. react-virtuoso only renders messages currently visible on screen (plus a small buffer), keeping DOM size constant regardless of conversation length.

### Scroll behavior

| Trigger | Behavior |
|---|---|
| New chat selected | Scroll to bottom immediately |
| My new message | Scroll to bottom smoothly |
| Incoming message (theirs) | Scroll to bottom only if already at bottom |
| Load older messages | Maintain scroll position — no jump |
| Image loads | Scroll to bottom only for the last message |

### Prepend older messages without scroll jump

`firstItemIndex` starts at `100000` and decreases as older messages are prepended. Virtuoso uses this index to keep the current viewport stable when new items are inserted at the top.

---

## 💬 Message Item (`MessageItem.jsx`)

Renders a single message bubble. Handles two content types:

### Text message

```jsx
<Paper>
  <Typography>{msg.message}</Typography>
  <Timestamp /> <StatusIcon />
</Paper>
```

### Image message

```jsx
<Paper>
  <img src={msg.image_url} onClick={openLightbox} />
  <Timestamp /> <StatusIcon />
</Paper>
<Lightbox open={open} slides={allImages} index={lightboxIndex} />
```

### Message status icons

| Status | Icon | Color |
|---|---|---|
| `sending` | Clock | White 70% |
| `sent` | Single tick | White 80% |
| `delivered` | Double tick | White 90% |
| `read` | Double tick | Blue `#4fc3f7` |
| `failed` | Error icon | Red |

### Date separators

Automatically inserted between messages from different calendar days:

```
─────────── Today ───────────
─────────── Yesterday ───────────
─────────── Jan 15, 2025 ───────────
```

### Group chat sender names

In group conversations, the sender's display name appears above their bubble in a color derived from their user ID — the same user always gets the same color across all sessions.

---

## 🔍 Image Lightbox (`yet-another-react-lightbox`)

Used in `MessageItem.jsx` for full-screen image viewing.

**Plugins enabled:** Zoom (up to 3×, pinch/scroll), Download (toolbar button), finite carousel (no looping).

### How conversation-wide image navigation works

`MessageList.jsx` collects all image messages into a single `allImages` array and passes it to every `MessageItem`. Clicking any image opens the lightbox at the correct index within that array, allowing the user to navigate forward/backward through all images in the conversation.

```javascript
// MessageList.jsx
const allImages = messages
  .filter((m) => m.message_type === "image")
  .map((m) => ({ src: m.image_url }));

// MessageItem.jsx
const handleImageClick = (imageUrl) => {
  const index = allImages.findIndex((img) => img.src === imageUrl);
  setLightboxIndex(index);
  setLightboxOpen(true);
};
```

---

## 📄 Pagination — Load Older Messages

Messages are fetched **15 at a time**, most recent first. Scrolling to the top triggers a load of the next older batch.

### Pagination state shape

```javascript
messagesPagination[conversationId] = {
  hasMore: true,         // are there older messages in the DB?
  oldestMessageId: 42,   // cursor — ID of oldest message currently loaded
  totalMessages: 150,    // total messages in DB for this conversation
  totalLoaded: 15,       // how many are loaded in state right now
};
```

### API call

```
GET /users/:conversationId?limit=15&before_id=42
```

Returns 15 messages with IDs less than `42`, ordered newest-first.

---

## 🌐 Axios Interceptor (`Interceptor/auth.js`)

Exports a pre-configured Axios instance used for **all** API calls in the app. Automatically:

- Attaches the JWT token from cookies as `Authorization: Bearer <token>` on every request
- Handles `401` responses by redirecting to the login page

Never use raw `axios` directly — always import from `Interceptor/auth.js`.

---

## 🔐 Authentication Flow

```
User submits login form
        ↓
POST /users/login
        ↓
Backend sets JWT in HTTP-only cookie
        ↓
UserContext reads user from cookie on app load
        ↓
Protected routes redirect to /login if no user in context
        ↓
Axios interceptor attaches token to every outgoing request
```

---

## 🎨 UI & Styling

Built entirely with **MUI v7**. No custom CSS files (no `.css` or `.scss`).

### Colors

| Element | Value |
|---|---|
| Primary gradient | `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` |
| Page background | `#f5f7fa` |
| Chat area background | `#fafbfc` |
| My message bubble | Purple gradient |
| Their message bubble | White with shadow |

### Layout

- **Sidebar:** fixed `380px` width
- **Chat area:** `flex: 1` — fills all remaining horizontal space
- **Total height:** `calc(100vh - 64px)` (accounts for the top nav bar)

---

## 🔮 Planned Features

- ⌨️ Typing indicator UI
- 😀 Emoji picker
- 🗑️ Delete message
- ↩️ Reply to message
- 📋 Copy message text
- 🔔 Push notifications
- 🎤 Voice messages
- 👍 Message reactions
