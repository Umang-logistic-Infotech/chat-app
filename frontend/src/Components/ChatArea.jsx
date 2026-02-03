import { Box, Typography, Avatar, TextField, IconButton } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { useRef, useEffect } from "react";

export default function ChatArea({ selectedChat, currentUser }) {
  const messagesEndRef = useRef(null);

  // Dummy messages for now — will replace with real data later
  const messages = selectedChat
    ? [
        { id: 1, text: "Hello!", sender_user_id: selectedChat.id },
        { id: 2, text: "Hi 👋", sender_user_id: currentUser?.id },
        { id: 3, text: "How are you?", sender_user_id: selectedChat.id },
        { id: 4, text: "I'm good! You?", sender_user_id: currentUser?.id },
      ]
    : [];

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
          <Typography fontSize={12} color="text.secondary">
            Online
          </Typography>
        </Box>
      </Box>

      {/* Messages Area */}
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
        {messages.map((msg) => {
          const isMine = String(msg.sender_user_id) === String(currentUser?.id);
          return (
            <Box
              key={msg.id}
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
                  {msg.text}
                </Typography>
              </Box>
            </Box>
          );
        })}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
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
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "20px",
              bgcolor: "#f0f2f5",
              "& fieldset": { border: "none" },
            },
          }}
        />
        <IconButton
          color="primary"
          sx={{
            bgcolor: "#0084ff",
            color: "#fff",
            "&:hover": { bgcolor: "#0073e6" },
          }}
        >
          <SendIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  );
}
