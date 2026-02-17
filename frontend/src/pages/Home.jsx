import { useState, useEffect } from "react";
import { Box } from "@mui/material";
import { api } from "../Interceptor/auth";
import { useUser } from "../context/UserContext";
import useSocket from "../hooks/useSocket";
import Sidebar from "../components/sidebar/Sidebar";
import ChatArea from "../components/chat/ChatArea";
import NewChatDialog from "../components/dialogs/NewChatDialog";
import CreateGroupDialog from "../components/dialogs/CreateGroupDialog";

const BACKEND_URL = process.env.REACT_APP_API_URL;

export default function Home() {
  const { user } = useUser();

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});
  const [loading, setLoading] = useState(false);

  const [messagesPagination, setMessagesPagination] = useState({});
  const [loadingOldMessages, setLoadingOldMessages] = useState({});

  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);

  const {
    sendMessage,
    sendImageMessage,
    incomingMessage,
    markMessageAsRead,
    messageStatusUpdate,
    userStatusUpdate,
  } = useSocket(user?.id);

  // ─── Fetch Conversations ────────────────────────────────────────────────────
  useEffect(() => {
    if (user != null) fetchConversations();
  }, [user]);

  async function fetchConversations() {
    try {
      setLoading(true);
      const response = await api.get(
        `${BACKEND_URL}/users/conversations/${user.id}`,
      );
      setChats(response.data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  }

  // ─── Fetch Messages For A Conversation ─────────────────────────────────────
  async function fetchMessagesForConversation(
    conversationId,
    beforeId = null,
    limit = 15,
  ) {
    if (!conversationId) return { messages: [], hasMore: false };

    try {
      let url = `${BACKEND_URL}/users/${conversationId}?limit=${limit}`;
      if (beforeId) url += `&before_id=${beforeId}`;

      const response = await api.get(url);

      const newMessages = response.data.messages || response.data;
      const paginationData = response.data.pagination;
      const hasMore = paginationData?.hasMore ?? false;
      const oldestMessageId = paginationData?.oldestMessageId;
      const totalMessages = paginationData?.totalMessages || 0;

      setMessages((prev) => {
        const existingMessages = prev[conversationId] || [];
        if (!beforeId) {
          return { ...prev, [conversationId]: newMessages };
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
          hasMore,
          oldestMessageId,
          totalMessages,
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

  // ─── Load Older Messages ────────────────────────────────────────────────────
  const loadOlderMessages = async (conversationId) => {
    if (!conversationId) return;
    if (loadingOldMessages[conversationId]) return;

    const pagination = messagesPagination[conversationId];
    if (pagination && !pagination.hasMore) return;

    const oldestMessageId = pagination?.oldestMessageId;

    setLoadingOldMessages((prev) => ({ ...prev, [conversationId]: true }));

    try {
      const result = await fetchMessagesForConversation(
        conversationId,
        oldestMessageId,
        15,
      );
      if (result?.messages.length === 0) {
        setMessagesPagination((prev) => ({
          ...prev,
          [conversationId]: { ...prev[conversationId], hasMore: false },
        }));
      }
    } catch (error) {
      console.error("❌ Error loading older messages:", error);
    } finally {
      setLoadingOldMessages((prev) => ({ ...prev, [conversationId]: false }));
    }
  };

  // ─── Handle Selected Chat ───────────────────────────────────────────────────
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

  // ─── Handle Online Status Updates ──────────────────────────────────────────
  useEffect(() => {
    if (!userStatusUpdate) return;
    setOnlineUsers((prev) => ({
      ...prev,
      [userStatusUpdate.user_id]: {
        status: userStatusUpdate.status,
        last_seen: userStatusUpdate.last_seen,
      },
    }));
  }, [userStatusUpdate]);

  // ─── Handle Incoming Messages ───────────────────────────────────────────────
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

    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.conversationId === conversationId
          ? { ...chat, updatedAt: new Date() }
          : chat,
      ),
    );
  }, [incomingMessage]);

  // ─── Handle Message Status Updates ─────────────────────────────────────────
  useEffect(() => {
    if (!messageStatusUpdate) return;

    const { messageId, status, conversationId } = messageStatusUpdate;

    setMessages((prevMessages) => {
      const updatedMessages = { ...prevMessages };
      let messageFound = false;

      if (conversationId && updatedMessages[conversationId]) {
        updatedMessages[conversationId] = updatedMessages[conversationId].map(
          (msg) => {
            if (String(msg.id) === String(messageId)) {
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
            if (String(msg.id) === String(messageId)) {
              return { ...msg, status };
            }
            return msg;
          });
        });
      }

      return updatedMessages;
    });
  }, [messageStatusUpdate]);

  // ─── Send Text Message ──────────────────────────────────────────────────────
  const handleSendTextMessage = (text) => {
    if (!text || !selectedChat) return;

    const tempId = `temp_${Date.now()}`;
    const messageKey = selectedChat.conversationId;

    const optimisticMessage = {
      id: tempId,
      sender_id: user.id,
      message: text,
      message_type: "text",
      conversation_id: messageKey,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    setMessages((prev) => ({
      ...prev,
      [messageKey]: [...(prev[messageKey] || []), optimisticMessage],
    }));

    sendMessage({ conversationId: messageKey, message: text })
      .then((response) => {
        setMessages((prev) => ({
          ...prev,
          [messageKey]: (prev[messageKey] || []).map((msg) =>
            msg.id === tempId
              ? {
                  ...msg,
                  id: response.messageId || response.message?.id || msg.id,
                  conversation_id: response.conversationId,
                  status: "sent",
                }
              : msg,
          ),
        }));
      })
      .catch(() => {
        setMessages((prev) => ({
          ...prev,
          [messageKey]: (prev[messageKey] || []).map((msg) =>
            msg.id === tempId ? { ...msg, status: "failed" } : msg,
          ),
        }));
      });
  };

  // ─── Send Image Message ─────────────────────────────────────────────────────
  const handleSendImageMessage = async (imageFile) => {
    if (!imageFile || !selectedChat) return;

    const tempId = `temp_${Date.now()}`;
    const messageKey = selectedChat.conversationId;
    const previewUrl = URL.createObjectURL(imageFile);

    const optimisticMessage = {
      id: tempId,
      sender_id: user.id,
      message_type: "image",
      image_url: previewUrl,
      conversation_id: messageKey,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    setMessages((prev) => ({
      ...prev,
      [messageKey]: [...(prev[messageKey] || []), optimisticMessage],
    }));

    try {
      const response = await sendImageMessage(messageKey, imageFile);
      setMessages((prev) => ({
        ...prev,
        [messageKey]: (prev[messageKey] || []).map((msg) =>
          msg.id === tempId
            ? {
                ...msg,
                id: response.messageId || response.message?.id || msg.id,
                image_url: response.message?.image_url || previewUrl,
                status: "sent",
              }
            : msg,
        ),
      }));
    } catch {
      setMessages((prev) => ({
        ...prev,
        [messageKey]: (prev[messageKey] || []).map((msg) =>
          msg.id === tempId ? { ...msg, status: "failed" } : msg,
        ),
      }));
    }
  };

  // ─── Handle New Chat Created ────────────────────────────────────────────────
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
      setMessages((prev) => ({ ...prev, [chatData.conversationId]: [] }));
    }
  };

  // ─── Handle New Group Created ───────────────────────────────────────────────
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
    setMessages((prev) => ({ ...prev, [groupData.id]: [] }));
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const getLastMessage = (chat) => {
    const chatMessages = messages[chat.conversationId] || [];
    return chatMessages.length > 0
      ? chatMessages[chatMessages.length - 1]
      : null;
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

  const isSelectedChatOnline =
    selectedChat?.type === "group"
      ? false
      : onlineUsers[selectedChat?.id]?.status === "online";

  return (
    <Box
      sx={{ display: "flex", height: "calc(100vh - 64px)", bgcolor: "#f5f7fa" }}
    >
      <Sidebar
        chats={chats}
        loading={loading}
        selectedChat={selectedChat}
        messages={messages}
        onlineUsers={onlineUsers}
        onSelectChat={setSelectedChat}
        onNewChat={() => setNewChatDialogOpen(true)}
        onNewGroup={() => setCreateGroupDialogOpen(true)}
        getLastMessage={getLastMessage}
        getUnreadCount={getUnreadCount}
      />

      <ChatArea
        selectedChat={selectedChat}
        currentUser={user}
        messages={currentMessages}
        isOnline={isSelectedChatOnline}
        onSendTextMessage={handleSendTextMessage}
        onSendImageMessage={handleSendImageMessage}
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
