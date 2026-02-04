import { Box, Typography, Avatar, TextField, IconButton } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
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

    // Reset time parts for comparison
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
          bgcolor: "#f0f2f5",
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            bgcolor: "#e0e0e0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
          }}
        >
          💬
        </Box>
        <Typography variant="h6" fontWeight={600} color="text.primary">
          Welcome to Chat
        </Typography>
        <Typography color="text.secondary" fontSize={14}>
          Select a user to start messaging
        </Typography>
      </Box>
    );
  }

  // ── Chat selected ──
  return (
    <Box
      sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Avatar
          src={selectedChat.profile_photo || ""}
          sx={{ width: 40, height: 40 }}
        >
          {!selectedChat.profile_photo && selectedChat.name?.charAt(0)}
        </Avatar>
        <Box>
          <Typography fontWeight={600} fontSize={15}>
            {selectedChat.name}
          </Typography>
        </Box>
      </Box>

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
          bgcolor: "#efeae2",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          "&::-webkit-scrollbar": { width: "6px" },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "#ccc",
            borderRadius: "3px",
          },
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
            <Box key={msg.id}>
              {/* Date Separator */}
              {showDateSeparator && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    my: 2,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: "text.secondary",
                      bgcolor: "#fff",
                      px: 2,
                      py: 0.5,
                      borderRadius: "8px",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                    }}
                  >
                    {formatDate(msg.createdAt)}
                  </Typography>
                </Box>
              )}

              {/* Message Bubble */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: isMine ? "flex-end" : "flex-start",
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderRadius: isMine
                      ? "16px 16px 4px 16px"
                      : "16px 16px 16px 4px",
                    maxWidth: "60%",
                    bgcolor: isMine ? "#d9fdd3" : "#fff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  }}
                >
                  <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                    {msg.message || msg.message_text}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: 9,
                      color: "rgba(0,0,0,0.45)",
                      display: "block",
                      mt: 0.25,
                      textAlign: isMine ? "right" : "left",
                      lineHeight: 1,
                    }}
                  >
                    {formatTime(msg.createdAt)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          );
        })}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Type a message..."
          variant="outlined"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "20px",
              bgcolor: "#f0f2f5",
              "& fieldset": { border: "none" },
            },
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!inputText.trim()}
          sx={{
            bgcolor: "#0084ff",
            color: "#fff",
            "&:hover": { bgcolor: "#0073e6" },
            "&.Mui-disabled": { bgcolor: "#ccc", color: "#fff" },
          }}
        >
          <SendIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  );
}
