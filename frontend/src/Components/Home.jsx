import {
  Typography,
  Box,
  Avatar,
  ListItemText,
  List,
  ListItemAvatar,
  Divider,
} from "@mui/material";
import axios from "axios";
import ListItem from "@mui/material/ListItem";
import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import ChatArea from "./ChatArea";
import useSocket from "../hooks/useSocket";

export default function Home() {
  const [chats, setChats] = useState([]);
  const { user } = useUser();
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState({}); // { conversationId: [msg, ...] }

  const { sendMessage, incomingMessage } = useSocket(user?.id);

  // ── Fetch users ──
  useEffect(() => {
    if (user != null) fetchUsers();
  }, [user]);

  async function fetchUsers() {
    try {
      const response = await axios.get(
        `http://localhost:5000/users/test/${user.id}`,
      );
      const filtered = response.data.filter((u) => u.id !== user.id);
      setChats(filtered);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }

  // ── Fetch messages for a conversation ──
  async function fetchMessagesForConversation(conversationId) {
    if (!conversationId) return; // No conversation exists yet

    try {
      const response = await axios.get(
        `http://localhost:5000/users/${conversationId}`,
      );

      // Store messages by conversationId
      setMessages((prev) => ({
        ...prev,
        [conversationId]: response.data,
      }));
      console.log("Messages", response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }

  // ── Load messages when a chat is selected ──
  useEffect(() => {
    if (selectedChat?.conversationId) {
      // Only fetch if we don't already have messages for this conversation
      if (!messages[selectedChat.conversationId]) {
        fetchMessagesForConversation(selectedChat.conversationId);
      }
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
  }, [incomingMessage]);

  // ── Send a message ──
  const handleSend = (text) => {
    if (!text || !selectedChat) return;

    // Optimistically add message to UI
    const newMessage = {
      id: Date.now(),
      sender_id: user.id,
      message: text,
      conversation_id: selectedChat.conversationId,
      createdAt: new Date().toISOString(),
    };

    // Use conversationId as key (or create temporary key if no conversation exists yet)
    const messageKey = selectedChat.conversationId || `temp_${selectedChat.id}`;

    setMessages((prev) => ({
      ...prev,
      [messageKey]: [...(prev[messageKey] || []), newMessage],
    }));

    // Send to backend
    sendMessage(selectedChat.id, text);
  };

  // Get messages for the selected chat
  const currentMessages = selectedChat?.conversationId
    ? messages[selectedChat.conversationId] || []
    : messages[`temp_${selectedChat?.id}`] || [];

  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 64px)" }}>
      {/* ── Sidebar ── */}
      <Box
        sx={{
          width: "320px",
          minWidth: "320px",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Chats
          </Typography>
        </Box>

        <List
          sx={{
            flex: 1,
            overflowY: "auto",
            p: 1,
            "&::-webkit-scrollbar": { width: "6px" },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "#ccc",
              borderRadius: "3px",
            },
          }}
        >
          {chats.map((chat) => {
            const isSelected = selectedChat?.id === chat.id;
            return (
              <ListItem
                key={chat.id}
                button
                onClick={() => setSelectedChat(chat)}
                sx={{
                  borderRadius: "10px",
                  mb: 0.5,
                  px: 1.5,
                  py: 1,
                  bgcolor: isSelected ? "action.selected" : "transparent",
                  "&:hover": {
                    bgcolor: isSelected ? "action.selected" : "action.hover",
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    src={chat.profile_photo || ""}
                    sx={{ width: 42, height: 42 }}
                  >
                    {!chat.profile_photo && chat.name?.charAt(0)}
                  </Avatar>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <Typography fontWeight={600} fontSize={14}>
                      {chat.name}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      fontSize={13}
                    >
                      {chat.phone_number}
                    </Typography>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Divider orientation="vertical" flexItem />

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
