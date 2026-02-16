import {
  Typography,
  Box,
  ListItemText,
  List,
  ListItemAvatar,
  Paper,
  InputBase,
  IconButton,
  CircularProgress,
  Chip,
  Fab,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import ListItem from "@mui/material/ListItem";
import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import ChatArea from "./ChatArea";
import useSocket from "../hooks/useSocket";
import { api } from "../Interceptor/auth";
import NewChatDialog from "./dialogs/NewChatDialog";
import UserAvatar from "./common/UserAvatar";

export default function Home() {
  const [chats, setChats] = useState([]);
  const { user } = useUser();
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);

  // Pagination states
  const [messagesPagination, setMessagesPagination] = useState({});
  const [loadingOldMessages, setLoadingOldMessages] = useState({});

  const baseurl = process.env.REACT_APP_API_URL;
  const {
    sendMessage,
    incomingMessage,
    markMessageAsRead,
    messageStatusUpdate,
    userStatusUpdate,
  } = useSocket(user?.id);

  // ── Fetch users ──
  useEffect(() => {
    if (user != null) fetchUsers();
    // eslint-disable-next-line
  }, [user]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const response = await api.get(
        `${baseurl}/users/conversations/${user.id}`,
      );
      setChats(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      if (error.response?.status === 401) {
        console.error("Authentication failed - Please login again");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Track online/offline status ──
  useEffect(() => {
    if (userStatusUpdate) {
      setOnlineUsers((prev) => ({
        ...prev,
        [userStatusUpdate.user_id]: {
          status: userStatusUpdate.status,
          last_seen: userStatusUpdate.last_seen,
        },
      }));
    }
  }, [userStatusUpdate]);

  // ── Fetch messages for a conversation with pagination ──
  async function fetchMessagesForConversation(
    conversationId,
    page = 1,
    limit = 15,
  ) {
    if (!conversationId) {
      return;
    }

    try {
      const response = await api.get(
        `${baseurl}/users/${conversationId}?page=${page}&limit=${limit}`,
      );

      // Handle both new format (with pagination) and old format (array only)
      const newMessages = response.data.messages || response.data;
      const paginationData = response.data.pagination;

      // If pagination data exists, use it. Otherwise fallback to old logic
      const hasMore = paginationData
        ? paginationData.hasMore
        : newMessages.length === limit;

      const totalMessages = paginationData?.totalMessages || 0;

      setMessages((prev) => {
        const updated = {
          ...prev,
          [conversationId]:
            page === 1
              ? newMessages
              : [...newMessages, ...(prev[conversationId] || [])],
        };
        return updated;
      });

      setMessagesPagination((prev) => {
        const updated = {
          ...prev,
          [conversationId]: {
            currentPage: page,
            hasMore: hasMore,
            totalMessages: totalMessages,
            totalLoaded:
              page === 1
                ? newMessages.length
                : (prev[conversationId]?.totalLoaded || 0) + newMessages.length,
          },
        };
        return updated;
      });

      return { messages: newMessages, hasMore };
    } catch (error) {
      console.error("Error fetching messages:", error);
      return { messages: [], hasMore: false };
    }
  }

  // ── Load older messages (for infinite scroll) ──
  const loadOlderMessages = async (conversationId) => {
    if (!conversationId) {
      return;
    }

    const currentlyLoading = loadingOldMessages[conversationId];

    if (currentlyLoading) {
      return;
    }

    const pagination = messagesPagination[conversationId];
    const currentMessages = messages[conversationId] || [];
    if (pagination && !pagination.hasMore) {
      return;
    }

    const nextPage = pagination ? pagination.currentPage + 1 : 2;

    setLoadingOldMessages((prev) => {
      return { ...prev, [conversationId]: true };
    });

    try {
      const result = await fetchMessagesForConversation(
        conversationId,
        nextPage,
        15,
      );

      // Extra safety: if we got 0 messages, force hasMore to false
      if (result && result.messages.length === 0) {
        setMessagesPagination((prev) => ({
          ...prev,
          [conversationId]: {
            ...prev[conversationId],
            hasMore: false,
          },
        }));
      }
    } catch (error) {
      console.error("❌ Error loading older messages:", error);
    } finally {
      setLoadingOldMessages((prev) => {
        return { ...prev, [conversationId]: false };
      });
    }
  };

  // ── Load messages when a chat is selected ──
  useEffect(() => {
    if (selectedChat?.conversationId) {
      if (!messages[selectedChat.conversationId]) {
        fetchMessagesForConversation(selectedChat.conversationId, 1, 15);
      } else {
      }

      const chatMessages = messages[selectedChat.conversationId] || [];
      chatMessages.forEach((msg) => {
        if (msg.sender_id !== user.id && msg.status !== "read") {
          markMessageAsRead(msg.id);
        }
      });
    }
    // eslint-disable-next-line
  }, [selectedChat]);

  // ── Listen for incoming messages from socket ──
  useEffect(() => {
    if (!incomingMessage) return;

    const conversationId = incomingMessage.conversation_id;

    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), incomingMessage],
    }));

    if (selectedChat?.conversationId === conversationId) {
      markMessageAsRead(incomingMessage.id);
    }

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

      if (selectedChat && !selectedChat.conversationId) {
        if (
          selectedChat.id === incomingMessage.sender_id ||
          selectedChat.id === incomingMessage.receiver_id
        ) {
          setSelectedChat({ ...selectedChat, conversationId });
        }
      }
    }
    // eslint-disable-next-line
  }, [incomingMessage]);

  // ── Listen for message status updates ──
  useEffect(() => {
    if (!messageStatusUpdate) return;

    const { messageId, status, conversationId } = messageStatusUpdate;

    setMessages((prevMessages) => {
      const updatedMessages = { ...prevMessages };
      let messageFound = false;

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

      return updatedMessages;
    });
  }, [messageStatusUpdate]);

  // ── Handle new chat creation ──
  const handleChatCreated = (chatData, isNew) => {
    const existingChatIndex = chats.findIndex(
      (chat) => chat.id === chatData.id,
    );

    if (existingChatIndex !== -1) {
      setSelectedChat(chatData);
    } else {
      setChats((prev) => [chatData, ...prev]);
      setSelectedChat(chatData);
    }

    if (isNew && chatData.conversationId) {
      setMessages((prev) => ({
        ...prev,
        [chatData.conversationId]: [],
      }));
    }
  };

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
      status: "sending",
    };

    // Use conversationId if it exists, otherwise use temp key based on receiver ID
    const messageKey = selectedChat.conversationId;

    setMessages((prev) => ({
      ...prev,
      [messageKey]: [...(prev[messageKey] || []), newMessage],
    }));

    sendMessage({ conversationId: selectedChat.conversationId, message: text })
      .then((response) => {
        setMessages((prev) => {
          const conversationMessages = prev[messageKey] || [];
          return {
            ...prev,
            [messageKey]: conversationMessages.map((msg) =>
              msg.id === tempId
                ? {
                    ...msg,
                    id: response.messageId || response.message?.id || msg.id,
                    conversation_id: response.conversationId,
                    status: "sent",
                  }
                : msg,
            ),
          };
        });

        // If this is a new conversation, migrate messages to the new conversationId
        if (!selectedChat.conversationId && response.conversationId) {
          setMessages((prev) => {
            const oldMessages = prev[messageKey] || [];
            const updatedMessages = { ...prev };

            // Add messages under new conversationId
            updatedMessages[response.conversationId] = oldMessages.map(
              (msg) => ({
                ...msg,
                conversation_id: response.conversationId,
              }),
            );

            // Remove old temp key entry
            if (messageKey !== response.conversationId) {
              delete updatedMessages[messageKey];
            }

            return updatedMessages;
          });

          // Update chat list with conversationId
          setChats((prevChats) =>
            prevChats.map((chat) =>
              chat.id === selectedChat.id
                ? { ...chat, conversationId: response.conversationId }
                : chat,
            ),
          );

          // Update selected chat with conversationId
          setSelectedChat((prev) => ({
            ...prev,
            conversationId: response.conversationId,
          }));
        }
      })
      .catch((error) => {
        console.error("❌ Failed to send message:", error);
        setMessages((prev) => ({
          ...prev,
          [messageKey]:
            prev[messageKey]?.map((msg) =>
              msg.id === tempId ? { ...msg, status: "failed" } : msg,
            ) || [],
        }));
      });
  };

  const getLastMessage = (chat) => {
    const chatMessages =
      messages[chat.conversationId] || messages[`temp_${chat.id}`] || [];
    if (chatMessages.length === 0) return null;
    return chatMessages[chatMessages.length - 1];
  };

  const getUnreadCount = (chat) => {
    const chatMessages =
      messages[chat.conversationId] || messages[`temp_${chat.id}`] || [];
    return chatMessages.filter(
      (msg) => msg.sender_id !== user.id && msg.status !== "read",
    ).length;
  };

  const currentMessages = selectedChat?.conversationId
    ? messages[selectedChat.conversationId] || []
    : messages[`temp_${selectedChat?.id}`] || [];

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
      return `${formattedHours}:${formattedMinutes} ${ampm}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  return (
    <Box
      sx={{ display: "flex", height: "calc(100vh - 64px)", bgcolor: "#f5f7fa" }}
    >
      {/* ── Sidebar ── */}
      <Paper
        elevation={0}
        sx={{
          width: "380px",
          minWidth: "380px",
          display: "flex",
          flexDirection: "column",
          borderRadius: 0,
          borderRight: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          position: "relative",
        }}
      >
        {/* Sidebar Header */}
        <Box
          sx={{
            px: 3,
            py: 3,
            borderBottom: "1px solid",
            borderColor: "divider",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography variant="h5" fontWeight={700} color="white">
              Chats
            </Typography>
          </Box>

          {/* Search Bar */}
          <Paper
            elevation={0}
            sx={{
              display: "flex",
              alignItems: "center",
              bgcolor: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(10px)",
              borderRadius: "12px",
              px: 2,
              py: 1,
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <SearchIcon
              sx={{ color: "rgba(255,255,255,0.7)", mr: 1, fontSize: 20 }}
            />
            <InputBase
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                flex: 1,
                fontSize: "0.9rem",
                color: "white",
                "& ::placeholder": { color: "rgba(255,255,255,0.7)" },
              }}
            />
          </Paper>
        </Box>

        {/* Chat List */}
        <List
          sx={{
            flex: 1,
            overflowY: "auto",
            px: 1,
            py: 1,
            "&::-webkit-scrollbar": { width: "6px" },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "rgba(0,0,0,0.2)",
              borderRadius: "3px",
              "&:hover": { bgcolor: "rgba(0,0,0,0.3)" },
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
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  bgcolor: "action.hover",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 2,
                }}
              >
                <Typography fontSize={40}>💬</Typography>
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                align="center"
                fontWeight={500}
              >
                {searchQuery ? "No conversations found" : "No users available"}
              </Typography>
            </Box>
          ) : (
            filteredChats.map((chat) => {
              const isSelected = selectedChat?.id === chat.id;
              const lastMessage = getLastMessage(chat);
              const unreadCount = getUnreadCount(chat);
              const isOnline = onlineUsers[chat.id]?.status === "online";

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
                    bgcolor: isSelected ? "action.selected" : "transparent",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: isSelected ? "action.selected" : "action.hover",
                    },
                  }}
                >
                  <ListItemAvatar>
                    <UserAvatar
                      user={chat}
                      size={52}
                      showOnlineBadge={true}
                      isOnline={isOnline}
                    />
                  </ListItemAvatar>

                  <ListItemText
                    sx={{ ml: 1.5 }}
                    primary={
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          fontWeight={unreadCount > 0 ? 700 : 600}
                          fontSize={15}
                          color="text.primary"
                          noWrap
                          sx={{ maxWidth: "180px" }}
                        >
                          {chat.name}
                        </Typography>
                        {lastMessage && (
                          <Typography
                            variant="caption"
                            sx={{
                              color:
                                unreadCount > 0
                                  ? "primary.main"
                                  : "text.secondary",
                              fontSize: "0.7rem",
                              fontWeight: unreadCount > 0 ? 600 : 400,
                            }}
                          >
                            {formatLastMessageTime(lastMessage.createdAt)}
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          fontSize={13}
                          noWrap
                          sx={{
                            maxWidth: "200px",
                            fontWeight: unreadCount > 0 ? 500 : 400,
                          }}
                        >
                          {lastMessage
                            ? lastMessage.message
                            : "No messages yet"}
                        </Typography>
                        {unreadCount > 0 && (
                          <Chip
                            label={unreadCount}
                            size="small"
                            sx={{
                              height: 20,
                              minWidth: 20,
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              bgcolor: "primary.main",
                              color: "white",
                              "& .MuiChip-label": { px: 0.8 },
                            }}
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              );
            })
          )}
        </List>

        {/* Floating Action Button */}
        <Fab
          color="primary"
          onClick={() => setNewChatDialogOpen(true)}
          sx={{
            position: "absolute",
            bottom: 24,
            right: 24,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            "&:hover": {
              background: "linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)",
            },
          }}
        >
          <AddIcon />
        </Fab>
      </Paper>

      {/* ── Chat Area ── */}
      <ChatArea
        selectedChat={selectedChat}
        conversationId={selectedChat?.conversationId || null}
        receiverId={selectedChat?.id || null}
        currentUser={user}
        messages={currentMessages}
        onSend={handleSend}
        isOnline={onlineUsers[selectedChat?.id]?.status === "online"}
        onLoadOlderMessages={loadOlderMessages}
        isLoadingOldMessages={
          selectedChat?.conversationId
            ? loadingOldMessages[selectedChat.conversationId]
            : false
        }
        hasMoreMessages={
          selectedChat?.conversationId
            ? (messagesPagination[selectedChat.conversationId]?.hasMore ?? true)
            : false
        }
      />

      {/* ── New Chat Dialog ── */}
      <NewChatDialog
        open={newChatDialogOpen}
        onClose={() => setNewChatDialogOpen(false)}
        currentUserId={user?.id}
        onChatCreated={handleChatCreated}
      />
    </Box>
  );
}
