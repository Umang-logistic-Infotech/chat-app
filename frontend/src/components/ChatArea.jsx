import {
  Box,
  Typography,
  Avatar,
  TextField,
  IconButton,
  Paper,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import BlockIcon from "@mui/icons-material/Block";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useRef, useEffect, useState, useCallback } from "react";
import { Virtuoso } from "react-virtuoso";

export default function ChatArea({
  selectedChat,
  currentUser,
  messages,
  onSend,
  isOnline,
  onLoadOlderMessages,
  isLoadingOldMessages,
  hasMoreMessages,
}) {
  const virtuosoRef = useRef(null);
  const [inputText, setInputText] = useState("");
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [atBottom, setAtBottom] = useState(true);
  const prevMessageCountRef = useRef(0);
  const [firstItemIndex, setFirstItemIndex] = useState(100000);
  const initializedRef = useRef(false);
  const isLoadingOldRef = useRef(false);

  const START_INDEX = 100000;

  const isGroupChat = selectedChat?.type === "group";

  useEffect(() => {
    if (selectedChat?.id) {
      const newFirstIndex = START_INDEX - messages.length;
      setFirstItemIndex(newFirstIndex);
      prevMessageCountRef.current = messages.length;
      initializedRef.current = true;
      isLoadingOldRef.current = false;

      setTimeout(() => {
        if (virtuosoRef.current && messages.length > 0) {
          virtuosoRef.current.scrollTo({
            top: 999999,
            behavior: "auto",
          });
        }
      }, 100);
    }
  }, [selectedChat?.id]);

  useEffect(() => {
    if (!initializedRef.current) return;

    const messageCountChanged = messages.length !== prevMessageCountRef.current;

    if (messageCountChanged && messages.length > 0) {
      const diff = messages.length - prevMessageCountRef.current;
      const lastMessage = messages[messages.length - 1];
      const isMyMessage =
        String(lastMessage?.sender_id) === String(currentUser?.id);

      if (isLoadingOldRef.current && diff > 0) {
        setFirstItemIndex((prev) => prev - diff);
        isLoadingOldRef.current = false;
      } else if (diff > 0) {
        if (isMyMessage || atBottom) {
          requestAnimationFrame(() => {
            if (virtuosoRef.current) {
              virtuosoRef.current.scrollTo({
                top: 999999,
                behavior: "auto",
              });
            }
          });

          setTimeout(() => {
            if (virtuosoRef.current) {
              virtuosoRef.current.scrollTo({
                top: 999999,
                behavior: "smooth",
              });
            }
          }, 100);
        }
      }

      prevMessageCountRef.current = messages.length;
    }
  }, [messages, currentUser?.id, atBottom]);

  const getSenderName = (senderId) => {
    if (!isGroupChat) return null;
    if (String(senderId) === String(currentUser?.id)) return "You";

    const sender = selectedChat?.participants?.find(
      (p) => String(p.id) === String(senderId),
    );
    return sender?.name || "Unknown";
  };

  const getSenderColor = (senderId) => {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#FFA07A",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E2",
      "#F8B739",
      "#52B788",
      "#E63946",
      "#457B9D",
    ];
    const index = senderId % colors.length;
    return colors[index];
  };

  const shouldShowSenderName = (currentMsg, previousMsg) => {
    if (!isGroupChat) return false;
    if (!currentMsg) return false;

    const isMine = String(currentMsg.sender_id) === String(currentUser?.id);
    if (isMine) return false;

    if (!previousMsg) return true;

    return String(currentMsg.sender_id) !== String(previousMsg.sender_id);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const yesterdayOnly = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate(),
    );

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return "Today";
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
      return "Yesterday";
    } else {
      const options = { month: "short", day: "numeric", year: "numeric" };
      return date.toLocaleDateString("en-US", options);
    }
  };

  const shouldShowDateSeparator = (currentMsg, previousMsg) => {
    if (!currentMsg) return false;
    if (!previousMsg) return true;

    const currentDate = new Date(currentMsg.createdAt);
    const previousDate = new Date(previousMsg.createdAt);

    const currentDay = currentDate.toDateString();
    const previousDay = previousDate.toDateString();

    return currentDay !== previousDay;
  };

  const getMessageStatusIcon = (msg) => {
    const isMine =
      String(msg.sender_id || msg.sender_user_id) === String(currentUser?.id);
    if (!isMine) return null;

    const status = msg.status || "sent";

    const iconStyles = { fontSize: 16, ml: 0.5 };

    switch (status) {
      case "sending":
        return (
          <AccessTimeIcon
            sx={{ ...iconStyles, color: "rgba(255,255,255,0.7)" }}
          />
        );
      case "sent":
        return (
          <DoneIcon sx={{ ...iconStyles, color: "rgba(255,255,255,0.8)" }} />
        );
      case "delivered":
        return (
          <DoneAllIcon sx={{ ...iconStyles, color: "rgba(255,255,255,0.9)" }} />
        );
      case "read":
        return <DoneAllIcon sx={{ ...iconStyles, color: "#4fc3f7" }} />;
      case "failed":
        return <ErrorOutlineIcon sx={{ ...iconStyles, color: "#ff5252" }} />;
      default:
        return (
          <DoneIcon sx={{ ...iconStyles, color: "rgba(255,255,255,0.8)" }} />
        );
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSend(inputText.trim());
    setInputText("");
  };

  const loadMore = useCallback(() => {
    if (
      !isLoadingOldMessages &&
      hasMoreMessages &&
      selectedChat?.conversationId
    ) {
      isLoadingOldRef.current = true;
      onLoadOlderMessages(selectedChat.conversationId);
    }
  }, [
    isLoadingOldMessages,
    hasMoreMessages,
    selectedChat,
    onLoadOlderMessages,
  ]);

  const Header = () => {
    if (!hasMoreMessages) return null;

    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 2,
        }}
      >
        {isLoadingOldMessages ? (
          <CircularProgress size={24} />
        ) : (
          <Typography variant="caption" color="text.secondary">
            Scroll up to load more
          </Typography>
        )}
      </Box>
    );
  };

  const itemContent = useCallback(
    (index, msg) => {
      if (!msg) {
        return <Box key={`empty-${index}`} />;
      }

      const arrayIndex = index - firstItemIndex;
      const previousMsg = arrayIndex > 0 ? messages[arrayIndex - 1] : null;

      const isMine =
        String(msg.sender_id || msg.sender_user_id) === String(currentUser?.id);
      const showDateSeparator = shouldShowDateSeparator(msg, previousMsg);
      const showSenderName = shouldShowSenderName(msg, previousMsg);
      const senderName = getSenderName(msg.sender_id);
      const senderColor = getSenderColor(msg.sender_id);

      return (
        <Box key={msg.id || index}>
          {showDateSeparator && (
            <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
              <Chip
                label={formatDate(msg.createdAt)}
                size="small"
                sx={{
                  bgcolor: "rgba(0,0,0,0.06)",
                  color: "text.secondary",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  px: 1,
                }}
              />
            </Box>
          )}

          <Box
            sx={{
              display: "flex",
              justifyContent: isMine ? "flex-end" : "flex-start",
              mb: 1,
              px: 3,
            }}
          >
            <Box
              sx={{
                maxWidth: "70%",
                display: "flex",
                flexDirection: "column",
                alignItems: isMine ? "flex-end" : "flex-start",
              }}
            >
              {showSenderName && (
                <Typography
                  variant="caption"
                  sx={{
                    color: senderColor,
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    mb: 0.5,
                    ml: 1.5,
                  }}
                >
                  {senderName}
                </Typography>
              )}
              <Paper
                elevation={0}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderRadius: isMine
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
                  background: isMine
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "white",
                  color: isMine ? "white" : "text.primary",
                  wordBreak: "break-word",
                  boxShadow: isMine
                    ? "0 4px 12px rgba(102, 126, 234, 0.3)"
                    : "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                <Typography
                  variant="body1"
                  sx={{ lineHeight: 1.6, fontSize: "0.95rem" }}
                >
                  {msg.message || msg.message_text}
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 0.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: isMine
                        ? "rgba(255,255,255,0.8)"
                        : "text.secondary",
                      fontSize: "0.7rem",
                    }}
                  >
                    {formatTime(msg.createdAt)}
                  </Typography>
                  {getMessageStatusIcon(msg)}
                </Box>
              </Paper>
            </Box>
          </Box>
        </Box>
      );
    },
    [messages, currentUser?.id, firstItemIndex, isGroupChat, selectedChat],
  );

  if (!selectedChat) {
    return (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#fafbfc",
          gap: 3,
        }}
      >
        <Box
          sx={{
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 70,
            boxShadow: "0 10px 30px rgba(102, 126, 234, 0.3)",
          }}
        >
          💬
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <Typography
            variant="h4"
            fontWeight={700}
            color="text.primary"
            gutterBottom
          >
            Welcome to Chat
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 400 }}
          >
            Select a conversation from the sidebar to start messaging
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        bgcolor: "#fafbfc",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          px: 3,
          py: 2,
          borderRadius: 0,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Avatar
          src={selectedChat.group_photo || selectedChat.profile_photo || ""}
          sx={{
            width: 48,
            height: 48,
            bgcolor: "primary.main",
            fontSize: "1.2rem",
            fontWeight: 600,
          }}
        >
          {!(selectedChat.group_photo || selectedChat.profile_photo) &&
            selectedChat.name?.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700} fontSize={16}>
            {selectedChat.name}
            {isGroupChat && (
              <Chip
                label={`${selectedChat.participantCount || selectedChat.participants?.length || 0} members`}
                size="small"
                sx={{
                  ml: 1,
                  height: 20,
                  fontSize: "0.7rem",
                }}
              />
            )}
          </Typography>
          <Typography
            variant="caption"
            color={isOnline && !isGroupChat ? "success.main" : "text.secondary"}
            fontWeight={500}
          >
            {isGroupChat
              ? `${selectedChat.participants
                  ?.map((p) => p.name)
                  .slice(0, 3)
                  .join(", ")}${selectedChat.participantCount > 3 ? "..." : ""}`
              : isOnline
                ? "Online"
                : "Offline"}
          </Typography>
        </Box>
        <Tooltip title="Search">
          <IconButton size="small">
            <SearchIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="More options">
          <IconButton
            size="small"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
          >
            <MoreVertIcon />
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          PaperProps={{
            sx: { width: 200, mt: 1 },
          }}
        >
          {isGroupChat && (
            <MenuItem onClick={() => setMenuAnchor(null)}>
              <ListItemIcon>
                <InfoIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Group Info</ListItemText>
            </MenuItem>
          )}
          <MenuItem onClick={() => setMenuAnchor(null)}>
            <ListItemIcon>
              <NotificationsOffIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Mute</ListItemText>
          </MenuItem>
          {!isGroupChat && (
            <MenuItem onClick={() => setMenuAnchor(null)}>
              <ListItemIcon>
                <BlockIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Block</ListItemText>
            </MenuItem>
          )}
          <MenuItem
            onClick={() => setMenuAnchor(null)}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>
              {isGroupChat ? "Leave Group" : "Delete Chat"}
            </ListItemText>
          </MenuItem>
        </Menu>
      </Paper>

      <Box
        sx={{
          flex: 1,
          position: "relative",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5e7eb' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {messages.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                bgcolor: "action.hover",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 50,
              }}
            >
              👋
            </Box>
            <Typography variant="body1" color="text.secondary" fontWeight={500}>
              {isGroupChat
                ? "Group created! Say hello to everyone!"
                : "No messages yet. Start the conversation!"}
            </Typography>
          </Box>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={messages}
            firstItemIndex={firstItemIndex}
            itemContent={itemContent}
            startReached={loadMore}
            components={{
              Header,
            }}
            alignToBottom
            atBottomStateChange={setAtBottom}
            atBottomThreshold={50}
            initialTopMostItemIndex={messages.length - 1}
            style={{
              height: "100%",
            }}
            defaultItemHeight={80}
          />
        )}
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 0,
          display: "flex",
          gap: 1.5,
          alignItems: "flex-end",
          bgcolor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Tooltip title="Emoji">
          <IconButton color="primary" size="medium">
            <EmojiEmotionsIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Attach file">
          <IconButton color="primary" size="medium">
            <AttachFileIcon />
          </IconButton>
        </Tooltip>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder={isGroupChat ? "Message group..." : "Type a message..."}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "24px",
              bgcolor: "#f5f7fa",
              "& fieldset": {
                border: "none",
              },
              "&:hover": {
                bgcolor: "#eef1f5",
              },
              "&.Mui-focused": {
                bgcolor: "white",
                boxShadow: "0 0 0 2px rgba(102, 126, 234, 0.2)",
              },
            },
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!inputText.trim()}
          sx={{
            width: 48,
            height: 48,
            background: inputText.trim()
              ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              : "action.disabledBackground",
            color: "white",
            "&:hover": {
              background: inputText.trim()
                ? "linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)"
                : "action.disabledBackground",
            },
            "&.Mui-disabled": {
              bgcolor: "action.disabledBackground",
              color: "action.disabled",
            },
          }}
        >
          <SendIcon />
        </IconButton>
      </Paper>
    </Box>
  );
}
