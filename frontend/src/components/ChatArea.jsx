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
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import BlockIcon from "@mui/icons-material/Block";
import DeleteIcon from "@mui/icons-material/Delete";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useRef, useEffect, useState } from "react";

export default function ChatArea({
  selectedChat,
  currentUser,
  messages,
  onSend,
  isOnline,
}) {
  const messagesEndRef = useRef(null);
  const [inputText, setInputText] = useState("");
  const [menuAnchor, setMenuAnchor] = useState(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      {/* ── Header ── */}
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
          src={selectedChat.profile_photo || ""}
          sx={{
            width: 48,
            height: 48,
            bgcolor: "primary.main",
            fontSize: "1.2rem",
            fontWeight: 600,
          }}
        >
          {!selectedChat.profile_photo &&
            selectedChat.name?.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700} fontSize={16}>
            {selectedChat.name}
          </Typography>
          <Typography
            variant="caption"
            color={isOnline ? "success.main" : "text.secondary"}
            fontWeight={500}
          >
            {isOnline ? "Online" : "Offline"}
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
          <MenuItem onClick={() => setMenuAnchor(null)}>
            <ListItemIcon>
              <NotificationsOffIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Mute</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => setMenuAnchor(null)}>
            <ListItemIcon>
              <BlockIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Block</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => setMenuAnchor(null)}
            sx={{ color: "error.main" }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete Chat</ListItemText>
          </MenuItem>
        </Menu>
      </Paper>

      {/* ── Messages Area ── */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 3,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          "&::-webkit-scrollbar": { width: "8px" },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "rgba(0,0,0,0.2)",
            borderRadius: "4px",
            "&:hover": { bgcolor: "rgba(0,0,0,0.3)" },
          },
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
              No messages yet. Start the conversation!
            </Typography>
          </Box>
        ) : (
          messages.map((msg, index) => {
            const isMine =
              String(msg.sender_id || msg.sender_user_id) ===
              String(currentUser?.id);
            const showDateSeparator = shouldShowDateSeparator(
              msg,
              messages[index - 1],
            );

            return (
              <Box key={msg.id || index}>
                {showDateSeparator && (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", my: 3 }}
                  >
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
          })
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* ── Input Area ── */}
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
