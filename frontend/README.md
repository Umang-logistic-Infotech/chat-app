# ⚛️ Chat App — Frontend

A real-time chat frontend built with **React**, **Material UI**, **Socket.io Client**, and **Axios**. Supports private messaging, group chats, image sharing with lightbox, online status, message delivery tracking, and paginated message history.

---

## 📁 Project Structure

```
src/
├── App.js                              # Root component — routing setup
├── pages/
│   └── Home.jsx                        # Main chat page — brain of the app
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
│   │   ├── SidebarHeader.jsx           # "Chats" title header
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
│   └── auth.js                         # Axios instance with auth headers
└── pages/
    └── Home.jsx                        # Entry point for the chat UI
```

---

## 📦 Packages Used

| Package                      | Version  | Why Used                                                 |
| ---------------------------- | -------- | -------------------------------------------------------- |
| `react`                      | ^19.2.4  | Core UI library                                          |
| `react-dom`                  | ^19.2.4  | DOM rendering for React                                  |
| `react-router-dom`           | ^7.13.0  | Client-side routing between pages                        |
| `@mui/material`              | ^7.3.7   | Full UI component library (inputs, dialogs, avatars etc) |
| `@mui/icons-material`        | ^7.3.7   | MUI icon set (send, attach, done, etc.)                  |
| `@emotion/react`             | ^11.14.0 | CSS-in-JS engine required by MUI                         |
| `@emotion/styled`            | ^11.14.1 | Styled components support for MUI                        |
| `socket.io-client`           | ^4.8.3   | Real-time WebSocket connection to backend                |
| `axios`                      | ^1.13.4  | HTTP requests to backend REST API                        |
| `react-virtuoso`             | ^4.18.1  | Virtualized list for rendering messages efficiently      |
| `yet-another-react-lightbox` | ^3.29.1  | Full-screen image viewer with zoom + download            |
| `js-cookie`                  | ^3.0.5   | Reading/writing browser cookies (JWT token)              |
| `bootstrap`                  | ^5.3.8   | Utility CSS classes used in some components              |
| `react-bootstrap`            | ^2.10.10 | Bootstrap React components                               |
| `web-vitals`                 | ^2.1.4   | Performance metrics reporting                            |

---

## 🧠 State Management

There is **no external state management library** (no Redux, no Zustand). All state lives in `Home.jsx` using React's built-in `useState` and `useEffect`.

### Why this approach?

The app has one main page (the chat UI) and all data flows through it. Using Context or Redux would add unnecessary complexity for this scale.

### State in `Home.jsx`

```javascript
messages; // { [conversationId]: [msg1, msg2, ...] }
chats; // array of all conversations the user is part of
selectedChat; // the currently open conversation object
onlineUsers; // { [userId]: { status, last_seen } }
messagesPagination; // { [conversationId]: { hasMore, oldestMessageId, totalLoaded } }
loadingOldMessages; // { [conversationId]: true/false }
newChatDialogOpen; // boolean
createGroupDialogOpen; // boolean
```

### Why `messages` is keyed by `conversationId`?

```javascript
// Instead of a flat array:
messages = [msg1, msg2, msg3];

// We store per conversation:
messages = {
  10: [msg1, msg2],
  15: [msg3, msg4, msg5],
  23: [msg6],
};
```

This means switching between chats is instant — no re-fetching needed if already loaded. Each conversation has its own message cache.

---

## 🔄 Data Flow

### Props flow DOWN, events flow UP

```
Home.jsx (owns all state)
    │
    ├── messages ──────────────────────→ ChatArea → MessageList → MessageItem
    ├── selectedChat ───────────────────→ ChatArea → ChatHeader
    ├── chats ──────────────────────────→ Sidebar → ChatList → ChatListItem
    ├── onlineUsers ────────────────────→ Sidebar → ChatList → ChatListItem
    │
    ← onSendTextMessage(text) ─────────── MessageInput
    ← onSendImageMessage(file) ─────────── MessageInput
    ← onSelectChat(chat) ───────────────── ChatListItem
    ← onLoadOlderMessages(convId) ─────── MessageList
    ← onChatCreated(chatData) ──────────── NewChatDialog
    ← onGroupCreated(groupData) ─────────── CreateGroupDialog
```

---

## 🔌 useSocket Hook

`useSocket.js` is a custom React hook that encapsulates **all Socket.io logic**. It is called once in `Home.jsx`:

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

### Why a custom hook?

Keeps all socket logic in one place. `Home.jsx` does not need to know anything about Socket.io — it just reacts to the state values the hook exposes.

### How socket events update React state

The hook uses reactive state values that `Home.jsx` watches with `useEffect`:

```
Socket event fires (e.g. receive_message)
        ↓
useSocket sets incomingMessage state
        ↓
Home.jsx useEffect detects the change (_timestamp ensures re-trigger)
        ↓
Updates messages state with the new message
        ↓
React re-renders MessageList automatically
        ↓
New MessageItem appears in UI
```

The `_timestamp: Date.now()` trick is used because if two identical messages arrive back-to-back, React wouldn't re-run the useEffect (same object reference). Adding a timestamp forces it to always re-trigger.

### sendMessage vs sendImageMessage

**sendMessage** (text):

```
emit send_message via socket
        ↓
wait for message_sent event (Promise)
        ↓
resolve with messageId + conversationId
```

**sendImageMessage** (image):

```
Step 1: POST /api/messages/upload-image/:conversationId (HTTP)
        ↓
        Multer + Cloudinary → returns image_url
        ↓
Step 2: emit send_message via socket with { message_type: "image", image_url }
        ↓
        wait for message_sent event (Promise)
        ↓
        resolve with messageId + conversationId
```

Why HTTP first then socket? Because sockets cannot transfer binary file data efficiently. HTTP handles the file upload, socket handles the real-time notification.

---

## 🖼️ Image Sharing Flow (Frontend)

```
User clicks attach button (MessageInput)
        ↓
Hidden <input type="file"> triggers
        ↓
handleImageSelect() stores file + creates preview URL
        ↓
User sees image preview with cancel option
        ↓
User clicks Send
        ↓
handleSendImage() in MessageInput calls onSendImageMessage(file)
        ↓
Home.jsx handleSendImageMessage() runs:
  1. Creates optimistic message with local preview URL (status: "sending")
  2. Adds it to messages state immediately (so user sees it right away)
  3. Calls sendImageMessage(conversationId, file) from useSocket
        ↓
useSocket uploads to backend → Cloudinary → gets real image_url
        ↓
Emits send_message via socket with image_url
        ↓
On success: replaces optimistic message with real message + Cloudinary URL
On failure: updates status to "failed"
```

### Optimistic UI

The image appears in chat **instantly** with a local preview URL before the upload even finishes. Once the real Cloudinary URL comes back, it silently replaces the local URL. The user never waits.

---

## 📜 MessageList & Virtualization

`MessageList.jsx` uses **react-virtuoso** to render messages.

### Why react-virtuoso?

Without virtualization, rendering 1000+ messages would create 1000+ DOM nodes, causing severe performance issues. react-virtuoso only renders the messages currently visible on screen (plus a small buffer), keeping the DOM lean regardless of how many messages exist.

### Scroll Behavior

```
New chat selected → scroll to bottom immediately
New message arrives (mine) → scroll to bottom smoothly
New message arrives (theirs) → scroll to bottom only if already at bottom
Load older messages (scroll up) → maintain scroll position (don't jump)
Image loads → scroll to bottom only for the last message
```

The `firstItemIndex` trick is used to support prepending older messages without scroll jumping. It starts at `100000` and decreases as older messages are loaded, so Virtuoso knows where in the list each item belongs.

---

## 💬 MessageItem Component

Handles rendering of a single message bubble. It handles two types:

### Text message:

```jsx
<Paper>
  <Typography>{msg.message}</Typography>
  <TimeStamp + StatusIcon />
</Paper>
```

### Image message:

```jsx
<Paper>
  <img src={msg.image_url} onClick={handleImageClick} />
  <TimeStamp + StatusIcon />
</Paper>
<Lightbox open={lightboxOpen} slides={allImages} index={lightboxIndex} />
```

### Message Status Icons

| Status      | Icon        | Color          |
| ----------- | ----------- | -------------- |
| `sending`   | Clock       | White 70%      |
| `sent`      | Single tick | White 80%      |
| `delivered` | Double tick | White 90%      |
| `read`      | Double tick | Blue (#4fc3f7) |
| `failed`    | Error icon  | Red            |

### Date Separators

Automatically shown between messages from different days:

```
─────────── Today ───────────
─────────── Yesterday ───────────
─────────── Jan 15, 2025 ───────────
```

### Group Chat Sender Names

In group chats, the sender's name is shown above their message bubble in a unique color (derived from their user ID). The color is consistent — same user always gets the same color.

---

## 🔍 Lightbox (yet-another-react-lightbox)

Used in `MessageItem.jsx` to view images full screen.

### Features enabled:

- **Zoom plugin** — pinch/scroll to zoom up to 3x
- **Download plugin** — download button in toolbar
- **finite carousel** — does not loop back from last to first image

### How it works:

`MessageList.jsx` collects all image messages into an `allImages` array and passes it to every `MessageItem`. When a user clicks an image, the lightbox opens at the index of that specific image within `allImages`, allowing navigation between all images in the conversation.

```javascript
// In MessageList
const allImages = messages
  .filter((msg) => msg.message_type === "image")
  .map((msg) => ({ src: msg.image_url }));

// In MessageItem
const handleImageClick = (imageUrl) => {
  const index = allImages.findIndex((img) => img.src === imageUrl);
  setLightboxIndex(index);
  setLightboxOpen(true);
};
```

---

## 📄 Pagination (Load Older Messages)

Messages are loaded **15 at a time** (most recent first). When the user scrolls to the top of the list, older messages are fetched.

```javascript
messagesPagination = {
  [conversationId]: {
    hasMore: true, // are there older messages?
    oldestMessageId: 42, // ID of oldest loaded message
    totalMessages: 150, // total in DB
    totalLoaded: 15, // how many loaded so far
  },
};
```

The API uses cursor-based pagination via `before_id` query param:

```
GET /users/:conversationId?limit=15&before_id=42
```

This fetches 15 messages older than message ID 42.

---

## 🌐 Axios Interceptor

`Interceptor/auth.js` exports a pre-configured axios instance that automatically:

- Attaches the JWT token from cookies to every request
- Handles 401 errors (redirects to login)

All API calls in the app use this instance instead of raw axios.

---

## 🎨 UI & Styling

Built entirely with **Material UI (MUI) v7**. No custom CSS files.

### Theme colors used:

- Primary gradient: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Background: `#f5f7fa` (main), `#fafbfc` (chat area)
- My messages: Purple gradient bubble
- Their messages: White bubble with shadow

### Responsive behavior:

- Sidebar: fixed 380px width
- Chat area: fills remaining space with `flex: 1`

---

## 🔐 Authentication Flow

```
User submits login form
        ↓
POST /users/login
        ↓
Backend returns JWT in HTTP-only cookie
        ↓
UserContext reads user from cookie on app load
        ↓
All routes protected — redirect to login if no user
        ↓
Axios interceptor attaches token to every request
```

---

## 🚀 Running the Frontend

```bash
npm install
npm start      # runs on http://localhost:3000
```

### Environment Variables

```env
REACT_APP_API_URL=http://localhost:5000
```

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
