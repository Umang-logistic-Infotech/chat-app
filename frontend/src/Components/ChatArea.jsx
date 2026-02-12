import {
  Box,
  Typography,
  Avatar,
  TextField,
  IconButton,
  Paper,
  Chip,
  InputAdornment,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useRef, useEffect, useState } from "react";

export default function ChatArea({
  selectedChat,
  currentUser,
  messages,
  conversationId,
  onSend,
}) {
  const messagesEndRef = useRef(null);
  const [inputText, setInputText] = useState("");

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Format timestamp ──
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

  // ── Format date for separator ──
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

  // ── Check if we need a date separator ──
  const shouldShowDateSeparator = (currentMsg, previousMsg) => {
    if (!currentMsg) return false;
    if (!previousMsg) return true;

    const currentDate = new Date(currentMsg.createdAt);
    const previousDate = new Date(previousMsg.createdAt);

    const currentDay = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate(),
    );
    const previousDay = new Date(
      previousDate.getFullYear(),
      previousDate.getMonth(),
      previousDate.getDate(),
    );

    return currentDay.getTime() !== previousDay.getTime();
  };

  // ── Get message status icon ──
  const getMessageStatusIcon = (msg) => {
    // Only show status for sent messages (mine)
    const isMine =
      String(msg.sender_id || msg.sender_user_id) === String(currentUser?.id);
    if (!isMine) return null;

    const status = msg.status || "sent"; // Default to 'sent' if no status

    switch (status) {
      case "sending":
        return <AccessTimeIcon sx={{ fontSize: 14, color: "#F4A261" }} />;
      case "sent":
        return <DoneIcon sx={{ fontSize: 14, color: "#2A9D8F" }} />;
      case "delivered":
        return <DoneAllIcon sx={{ fontSize: 14, color: "#3A86FF" }} />;
      case "read":
        return <DoneAllIcon sx={{ fontSize: 14, color: "#C77DFF" }} />;
      case "failed":
        return <ErrorOutlineIcon sx={{ fontSize: 14, color: "#E63946" }} />;
      default:
        return <DoneIcon sx={{ fontSize: 14, color: "#EF4444" }} />;
    }
  };

  // ── Send handler ──
  const handleSend = () => {
    if (!inputText.trim()) return;
    onSend(inputText.trim());
    setInputText("");
  };

  // ── No chat selected ──
  if (!selectedChat) {
    return (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f8f9fa",
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            bgcolor: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 60,
          }}
        >
          💬
        </Box>
        <Typography variant="h5" fontWeight={600} color="text.primary">
          Welcome to Chat
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Select a user to start messaging
        </Typography>
      </Box>
    );
  }

  // ── Chat selected ──
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        bgcolor: "#f0f2f5",
      }}
    >
      {/* ── Header ── */}
      <Paper
        elevation={1}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          p: 2,
          borderRadius: 0,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Avatar
          src={selectedChat.profile_photo || ""}
          sx={{ width: 48, height: 48 }}
        >
          {!selectedChat.profile_photo && selectedChat.name?.charAt(0)}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            {selectedChat.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {selectedChat.phone_number}
          </Typography>
        </Box>
        <IconButton>
          <MoreVertIcon />
        </IconButton>
      </Paper>

      {/* ── Messages Area ── */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 3,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          "&::-webkit-scrollbar": { width: "8px" },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "#bbb",
            borderRadius: "4px",
          },
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5)), url(\'data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23e0e0e0" fill-opacity="0.4"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\')',
        }}
      >
        {messages.map((msg, index) => {
          const isMine =
            String(msg.sender_id || msg.sender_user_id) ===
            String(currentUser?.id);
          const showDateSeparator = shouldShowDateSeparator(
            msg,
            messages[index - 1],
          );

          return (
            <Box key={msg.id || index}>
              {/* Date Separator */}
              {showDateSeparator && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    my: 2,
                  }}
                >
                  <Chip
                    label={formatDate(msg.createdAt)}
                    size="small"
                    sx={{
                      bgcolor: "rgba(0,0,0,0.05)",
                      color: "text.secondary",
                      fontWeight: 500,
                      fontSize: "0.75rem",
                    }}
                  />
                </Box>
              )}

              {/* Message Bubble */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: isMine ? "flex-end" : "flex-start",
                  mb: 0.5,
                }}
              >
                <Box
                  sx={{
                    maxWidth: "65%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isMine ? "flex-end" : "flex-start",
                  }}
                >
                  <Paper
                    elevation={1}
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: isMine
                        ? "16px 16px 4px 16px"
                        : "16px 16px 16px 4px",
                      bgcolor: isMine ? "primary.main" : "background.paper",
                      color: isMine ? "white" : "text.primary",
                      wordBreak: "break-word",
                    }}
                  >
                    <Typography variant="body1" sx={{ lineHeight: 1.5 }}>
                      {msg.message || msg.message_text}
                    </Typography>
                  </Paper>

                  {/* Time and Status */}
                  <Box
                    sx={{
                      mt: 0.5,
                      px: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        fontSize: "0.7rem",
                      }}
                    >
                      {formatTime(msg.createdAt)}
                    </Typography>
                    {isMine && getMessageStatusIcon(msg)}
                  </Box>
                </Box>
              </Box>
            </Box>
          );
        })}
        <div ref={messagesEndRef} />
      </Box>

      {/* ── Input Area ── */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          borderRadius: 0,
          display: "flex",
          gap: 1,
          alignItems: "center",
          bgcolor: "background.paper",
        }}
      >
        <IconButton color="primary" size="medium">
          <EmojiEmotionsIcon />
        </IconButton>
        <IconButton color="primary" size="medium">
          <AttachFileIcon />
        </IconButton>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder="Type a message..."
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
              bgcolor: "#f0f2f5",
              "& fieldset": {
                border: "none",
              },
              "&:hover fieldset": {
                border: "none",
              },
              "&.Mui-focused fieldset": {
                border: "2px solid",
                borderColor: "primary.main",
              },
            },
          }}
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={!inputText.trim()}
          sx={{
            bgcolor: inputText.trim()
              ? "primary.main"
              : "action.disabledBackground",
            color: "white",
            "&:hover": {
              bgcolor: inputText.trim()
                ? "primary.dark"
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
