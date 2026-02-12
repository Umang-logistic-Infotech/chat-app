import {
  Typography,
  Box,
  Avatar,
  ListItemText,
  List,
  ListItemAvatar,
  Divider,
  Badge,
  Paper,
  InputBase,
  IconButton,
  CircularProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ListItem from "@mui/material/ListItem";
import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import ChatArea from "./ChatArea";
import useSocket from "../hooks/useSocket";
import axios from "axios";

export default function Home() {
  const [chats, setChats] = useState([]);
  const { user } = useUser();
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState({}); // { conversationId: [msg, ...] }
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const baseurl = "http://localhost:5000";
  const {
    sendMessage,
    incomingMessage,
    markMessageAsRead,
    messageStatusUpdate,
  } = useSocket(user?.id);

  // ── Fetch users ──
  useEffect(() => {
    if (user != null) fetchUsers();
  }, [user]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const response = await axios.get(`${baseurl}/users/test/${user.id}`);
      const filtered = response.data.filter((u) => u.id !== user.id);
      setChats(filtered);
    } catch (error) {
      console.error("Error fetching users:", error);
      if (error.response?.status === 401) {
        console.error("Authentication failed - Please login again");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Fetch messages for a conversation ──
  async function fetchMessagesForConversation(conversationId) {
    if (!conversationId) {
      return;
    }

    try {
      const response = await axios.get(`${baseurl}/users/${conversationId}`);
      setMessages((prev) => ({
        ...prev,
        [conversationId]: response.data,
      }));
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }

  // ── Load messages when a chat is selected ──
  useEffect(() => {
    if (selectedChat?.conversationId) {
      if (!messages[selectedChat.conversationId]) {
        fetchMessagesForConversation(selectedChat.conversationId);
      }

      // Mark all messages as read when opening a chat
      const chatMessages = messages[selectedChat.conversationId] || [];
      chatMessages.forEach((msg) => {
        if (msg.sender_id !== user.id && msg.status !== "read") {
          markMessageAsRead(msg.id);
        }
      });
    }
  }, [selectedChat]);

  // ── Listen for incoming messages from socket ──
  useEffect(() => {
    if (!incomingMessage) return;

    const conversationId = incomingMessage.conversation_id;

    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), incomingMessage],
    }));

    // Auto-mark as read if chat is currently open
    if (selectedChat?.conversationId === conversationId) {
      markMessageAsRead(incomingMessage.id);
    }

    // Update the chat item with conversationId if it doesn't have one
    if (conversationId) {
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (
            (chat.id === incomingMessage.sender_id ||
              chat.id === incomingMessage.receiver_id) &&
            !chat.conversationId
          ) {
            return { ...chat, conversationId };
          }
          return chat;
        }),
      );

      // Update selectedChat if it matches
      if (selectedChat && !selectedChat.conversationId) {
        if (
          selectedChat.id === incomingMessage.sender_id ||
          selectedChat.id === incomingMessage.receiver_id
        ) {
          setSelectedChat({ ...selectedChat, conversationId });
        }
      }
    }
  }, [incomingMessage]);

  // ── Listen for message status updates ──
  useEffect(() => {
    if (!messageStatusUpdate) return;

    const { messageId, status, conversationId } = messageStatusUpdate;

    // CRITICAL: Update the message status in ALL conversation keys
    setMessages((prevMessages) => {
      const updatedMessages = { ...prevMessages };
      let messageFound = false;

      // Try with conversationId first
      if (conversationId && updatedMessages[conversationId]) {
        updatedMessages[conversationId] = updatedMessages[conversationId].map(
          (msg) => {
            if (String(msg.id) === String(messageId) || msg.id === messageId) {
              messageFound = true;
              return { ...msg, status };
            }
            return msg;
          },
        );
      }

      // If not found, search through all conversations (for temp keys)
      if (!messageFound) {
        Object.keys(updatedMessages).forEach((key) => {
          updatedMessages[key] = updatedMessages[key].map((msg) => {
            if (String(msg.id) === String(messageId) || msg.id === messageId) {
              messageFound = true;
              return { ...msg, status };
            }
            return msg;
          });
        });
      }

      if (!messageFound) {
        console.warn(`⚠️ Message ${messageId} not found in any conversation`);
      }

      return updatedMessages;
    });
  }, [messageStatusUpdate]);

  // ── Send a message ──
  const handleSend = (text) => {
    if (!text || !selectedChat) return;

    const tempId = `temp_${Date.now()}`;
    const newMessage = {
      id: tempId,
      sender_id: user.id,
      message: text,
      conversation_id: selectedChat.conversationId,
      createdAt: new Date().toISOString(),
      status: "sending", // Initial status
    };

    const messageKey = selectedChat.conversationId || `temp_${selectedChat.id}`;

    // Add message to UI immediately
    setMessages((prev) => ({
      ...prev,
      [messageKey]: [...(prev[messageKey] || []), newMessage],
    }));

    // Send message and update status based on response
    sendMessage(selectedChat.id, text)
      .then((response) => {
        // Update temp message with real ID and status
        setMessages((prev) => {
          const conversationMessages = prev[messageKey] || [];
          return {
            ...prev,
            [messageKey]: conversationMessages.map((msg) =>
              msg.id === tempId
                ? {
                    ...msg,
                    id: response.messageId || response.message?.id || msg.id,
                    status: "sent",
                  }
                : msg,
            ),
          };
        });
      })
      .catch((error) => {
        console.error("Failed to send message:", error);
        // Update message status to 'failed'
        setMessages((prev) => ({
          ...prev,
          [messageKey]: prev[messageKey].map((msg) =>
            msg.id === tempId ? { ...msg, status: "failed" } : msg,
          ),
        }));
      });
  };

  // Get messages for the selected chat
  const currentMessages = selectedChat?.conversationId
    ? messages[selectedChat.conversationId] || []
    : messages[`temp_${selectedChat?.id}`] || [];

  // Filter chats based on search
  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 64px)" }}>
      {/* ── Sidebar ── */}
      <Paper
        elevation={2}
        sx={{
          width: "360px",
          minWidth: "360px",
          display: "flex",
          flexDirection: "column",
          borderRadius: 0,
          borderRight: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        {/* Sidebar Header */}
        <Box
          sx={{
            px: 3,
            py: 2.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h5" fontWeight={700} color="primary">
            Messages
          </Typography>
        </Box>

        {/* Search Bar */}
        <Box sx={{ px: 2, py: 2 }}>
          <Paper
            elevation={0}
            sx={{
              display: "flex",
              alignItems: "center",
              bgcolor: "#f0f2f5",
              borderRadius: "24px",
              px: 2,
              py: 0.5,
            }}
          >
            <SearchIcon sx={{ color: "text.secondary", mr: 1 }} />
            <InputBase
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: 1, fontSize: "0.95rem" }}
            />
          </Paper>
        </Box>

        {/* Chat List */}
        <List
          sx={{
            flex: 1,
            overflowY: "auto",
            px: 1.5,
            py: 0,
            "&::-webkit-scrollbar": { width: "6px" },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "#ccc",
              borderRadius: "3px",
            },
          }}
        >
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "200px",
              }}
            >
              <CircularProgress />
            </Box>
          ) : filteredChats.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                height: "200px",
                px: 3,
              }}
            >
              <Typography variant="body2" color="text.secondary" align="center">
                {searchQuery
                  ? "No conversations found"
                  : "No users available to chat"}
              </Typography>
            </Box>
          ) : (
            filteredChats.map((chat) => {
              const isSelected = selectedChat?.id === chat.id;
              return (
                <ListItem
                  key={chat.id}
                  button
                  onClick={() => setSelectedChat(chat)}
                  sx={{
                    borderRadius: "12px",
                    mb: 0.5,
                    px: 2,
                    py: 1.5,
                    bgcolor: isSelected ? "primary.light" : "transparent",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: isSelected ? "primary.light" : "action.hover",
                      transform: "translateX(4px)",
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      variant="dot"
                      sx={{
                        "& .MuiBadge-badge": {
                          bgcolor: "#44b700",
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          border: "2px solid white",
                        },
                      }}
                    >
                      <Avatar
                        src={chat.profile_photo || ""}
                        sx={{
                          width: 50,
                          height: 50,
                          bgcolor: "primary.main",
                          fontWeight: 600,
                        }}
                      >
                        {!chat.profile_photo && chat.name?.charAt(0)}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Typography
                        fontWeight={isSelected ? 700 : 600}
                        fontSize={15}
                        color={isSelected ? "primary.dark" : "text.primary"}
                      >
                        {chat.name}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        fontSize={13}
                        sx={{ mt: 0.3 }}
                      >
                        {chat.phone_number}
                      </Typography>
                    }
                  />
                </ListItem>
              );
            })
          )}
        </List>
      </Paper>

      {/* ── Chat Area ── */}
      <ChatArea
        selectedChat={selectedChat}
        conversationId={selectedChat?.conversationId || null}
        currentUser={user}
        messages={currentMessages}
        onSend={handleSend}
      />
    </Box>
  );
}
