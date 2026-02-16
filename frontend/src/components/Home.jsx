import {
  Typography,
  Box,
  ListItemText,
  List,
  ListItemAvatar,
  Paper,
  InputBase,
  IconButton,
  Avatar,
  CircularProgress,
  Chip,
  Fab,
  Menu,
  MenuItem,
  ListItemIcon,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ListItem from "@mui/material/ListItem";
import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import ChatArea from "./ChatArea";
import useSocket from "../hooks/useSocket";
import { api } from "../Interceptor/auth";
import NewChatDialog from "./dialogs/NewChatDialog";
import CreateGroupDialog from "./dialogs/CreateGroupDialog";
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
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  const [fabMenuAnchor, setFabMenuAnchor] = useState(null);

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

  useEffect(() => {
    if (user != null) fetchConversations();
  }, [user]);

  async function fetchConversations() {
    try {
      setLoading(true);
      const response = await api.get(
        `${baseurl}/users/conversations/${user.id}`,
      );
      setChats(response.data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      if (error.response?.status === 401) {
        console.error("Authentication failed - Please login again");
      }
    } finally {
      setLoading(false);
    }
  }

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

  async function fetchMessagesForConversation(
    conversationId,
    beforeId = null,
    limit = 15,
  ) {
    if (!conversationId) {
      return { messages: [], hasMore: false };
    }

    try {
      let url = `${baseurl}/users/${conversationId}?limit=${limit}`;
      if (beforeId) {
        url += `&before_id=${beforeId}`;
      }

      const response = await api.get(url);

      const newMessages = response.data.messages || response.data;
      const paginationData = response.data.pagination;

      const hasMore = paginationData?.hasMore ?? false;
      const oldestMessageId = paginationData?.oldestMessageId;
      const totalMessages = paginationData?.totalMessages || 0;

      setMessages((prev) => {
        const existingMessages = prev[conversationId] || [];

        if (!beforeId) {
          return {
            ...prev,
            [conversationId]: newMessages,
          };
        } else {
          return {
            ...prev,
            [conversationId]: [...newMessages, ...existingMessages],
          };
        }
      });

      setMessagesPagination((prev) => ({
        ...prev,
        [conversationId]: {
          hasMore: hasMore,
          oldestMessageId: oldestMessageId,
          totalMessages: totalMessages,
          totalLoaded: beforeId
            ? (prev[conversationId]?.totalLoaded || 0) + newMessages.length
            : newMessages.length,
        },
      }));

      return { messages: newMessages, hasMore, oldestMessageId };
    } catch (error) {
      console.error("Error fetching messages:", error);
      return { messages: [], hasMore: false, oldestMessageId: null };
    }
  }

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

    const oldestMessageId = pagination?.oldestMessageId;

    setLoadingOldMessages((prev) => {
      return { ...prev, [conversationId]: true };
    });

    try {
      const result = await fetchMessagesForConversation(
        conversationId,
        oldestMessageId,
        15,
      );

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

  useEffect(() => {
    if (selectedChat?.conversationId) {
      if (!messages[selectedChat.conversationId]) {
        fetchMessagesForConversation(selectedChat.conversationId, null, 15);
      }
      const chatMessages = messages[selectedChat.conversationId] || [];
      chatMessages.forEach((msg) => {
        if (msg.sender_id !== user.id && msg.status !== "read") {
          markMessageAsRead(msg.id);
        }
      });
    }
  }, [selectedChat]);

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
          if (chat.conversationId === conversationId) {
            return { ...chat, updatedAt: new Date() };
          }
          return chat;
        }),
      );
    }
  }, [incomingMessage]);

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

  const handleGroupCreated = (groupData) => {
    const formattedGroup = {
      id: groupData.id,
      conversationId: groupData.id,
      type: "group",
      name: groupData.name,
      group_photo: groupData.group_photo,
      description: groupData.description,
      participants: groupData.participants || groupData.allParticipants,
    };

    setChats((prev) => [formattedGroup, ...prev]);
    setSelectedChat(formattedGroup);
    setMessages((prev) => ({
      ...prev,
      [groupData.id]: [],
    }));
  };

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

        if (!selectedChat.conversationId && response.conversationId) {
          setMessages((prev) => {
            const oldMessages = prev[messageKey] || [];
            const updatedMessages = { ...prev };

            updatedMessages[response.conversationId] = oldMessages.map(
              (msg) => ({
                ...msg,
                conversation_id: response.conversationId,
              }),
            );

            if (messageKey !== response.conversationId) {
              delete updatedMessages[messageKey];
            }

            return updatedMessages;
          });

          setChats((prevChats) =>
            prevChats.map((chat) =>
              chat.id === selectedChat.id
                ? { ...chat, conversationId: response.conversationId }
                : chat,
            ),
          );

          setSelectedChat((prev) => ({
            ...prev,
            conversationId: response.conversationId,
          }));
        }
      })
      .catch((error) => {
        console.error("Failed to send message:", error);
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
    const chatMessages = messages[chat.conversationId] || [];
    if (chatMessages.length === 0) return null;
    return chatMessages[chatMessages.length - 1];
  };

  const getUnreadCount = (chat) => {
    const chatMessages = messages[chat.conversationId] || [];
    return chatMessages.filter(
      (msg) => msg.sender_id !== user.id && msg.status !== "read",
    ).length;
  };

  const currentMessages = selectedChat?.conversationId
    ? messages[selectedChat.conversationId] || []
    : [];

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

  const getGroupAvatar = (chat) => {
    if (chat.group_photo) {
      return <Avatar src={chat.group_photo} sx={{ width: 52, height: 52 }} />;
    }
    return (
      <Avatar
        sx={{
          width: 52,
          height: 52,
          bgcolor: "primary.main",
          fontSize: "1.2rem",
        }}
      >
        {chat.name?.charAt(0).toUpperCase()}
      </Avatar>
    );
  };

  return (
    <Box
      sx={{ display: "flex", height: "calc(100vh - 64px)", bgcolor: "#f5f7fa" }}
    >
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
                {searchQuery
                  ? "No conversations found"
                  : "No conversations yet"}
              </Typography>
            </Box>
          ) : (
            filteredChats.map((chat) => {
              const isSelected =
                selectedChat?.conversationId === chat.conversationId;
              const lastMessage = getLastMessage(chat);
              const unreadCount = getUnreadCount(chat);
              const isGroup = chat.type === "group";
              const isOnline =
                !isGroup && onlineUsers[chat.id]?.status === "online";

              return (
                <ListItem
                  key={chat.conversationId}
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
                    {isGroup ? (
                      getGroupAvatar(chat)
                    ) : (
                      <UserAvatar
                        user={chat}
                        size={52}
                        showOnlineBadge={true}
                        isOnline={isOnline}
                      />
                    )}
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
                          {isGroup && (
                            <Chip
                              label={`${chat.participants?.length || chat.participantCount || 0}`}
                              size="small"
                              sx={{
                                ml: 1,
                                height: 18,
                                fontSize: "0.65rem",
                              }}
                            />
                          )}
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
                            : isGroup
                              ? "Group created"
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

        <Fab
          color="primary"
          onClick={(e) => setFabMenuAnchor(e.currentTarget)}
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

        <Menu
          anchorEl={fabMenuAnchor}
          open={Boolean(fabMenuAnchor)}
          onClose={() => setFabMenuAnchor(null)}
          anchorOrigin={{
            vertical: "top",
            horizontal: "left",
          }}
          transformOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
        >
          <MenuItem
            onClick={() => {
              setFabMenuAnchor(null);
              setNewChatDialogOpen(true);
            }}
          >
            <ListItemIcon>
              <PersonAddIcon fontSize="small" />
            </ListItemIcon>
            <Typography>New Chat</Typography>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setFabMenuAnchor(null);
              setCreateGroupDialogOpen(true);
            }}
          >
            <ListItemIcon>
              <GroupAddIcon fontSize="small" />
            </ListItemIcon>
            <Typography>New Group</Typography>
          </MenuItem>
        </Menu>
      </Paper>

      <ChatArea
        selectedChat={selectedChat}
        conversationId={selectedChat?.conversationId || null}
        receiverId={selectedChat?.id || null}
        currentUser={user}
        messages={currentMessages}
        onSend={handleSend}
        isOnline={
          selectedChat?.type === "group"
            ? false
            : onlineUsers[selectedChat?.id]?.status === "online"
        }
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

      <NewChatDialog
        open={newChatDialogOpen}
        onClose={() => setNewChatDialogOpen(false)}
        currentUserId={user?.id}
        onChatCreated={handleChatCreated}
      />

      <CreateGroupDialog
        open={createGroupDialogOpen}
        onClose={() => setCreateGroupDialogOpen(false)}
        currentUserId={user?.id}
        onGroupCreated={handleGroupCreated}
      />
    </Box>
  );
}
