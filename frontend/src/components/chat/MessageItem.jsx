import { Box, Paper, Typography, Chip } from "@mui/material";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Download from "yet-another-react-lightbox/plugins/download";
import "yet-another-react-lightbox/styles.css";
import { useState } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

  if (dateOnly.getTime() === todayOnly.getTime()) return "Today";
  if (dateOnly.getTime() === yesterdayOnly.getTime()) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const shouldShowDateSeparator = (currentMsg, previousMsg) => {
  if (!currentMsg) return false;
  if (!previousMsg) return true;
  return (
    new Date(currentMsg.createdAt).toDateString() !==
    new Date(previousMsg.createdAt).toDateString()
  );
};

const shouldShowSenderName = (
  currentMsg,
  previousMsg,
  isGroupChat,
  currentUserId,
) => {
  if (!isGroupChat || !currentMsg) return false;
  if (String(currentMsg.sender_id) === String(currentUserId)) return false;
  if (!previousMsg) return true;
  return String(currentMsg.sender_id) !== String(previousMsg.sender_id);
};

const getSenderName = (senderId, currentUserId, selectedChat) => {
  if (String(senderId) === String(currentUserId)) return "You";
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
  return colors[senderId % colors.length];
};

const getMessageStatusIcon = (msg, currentUserId) => {
  const isMine = String(msg.sender_id) === String(currentUserId);
  if (!isMine) return null;

  const iconStyles = { fontSize: 16, ml: 0.5 };
  const status = msg.status || "sent";

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

// ─── Message Bubble Content ───────────────────────────────────────────────────

const MessageBubbleContent = ({
  msg,
  isMine,
  currentUserId,
  onImageClick,
  onImageLoad,
}) => {
  if (msg.message_type === "image") {
    return (
      <Box>
        <Box
          component="img"
          src={msg.image_url}
          alt="sent image"
          onClick={() => onImageClick(msg.image_url)}
          onLoad={onImageLoad} // ← scroll after image fully loads
          sx={{
            maxWidth: "280px",
            maxHeight: "320px",
            width: "100%",
            borderRadius: "12px",
            display: "block",
            objectFit: "cover",
            cursor: "pointer",
            transition: "opacity 0.2s ease",
            "&:hover": { opacity: 0.85 },
          }}
        />
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
              color: isMine ? "rgba(255,255,255,0.8)" : "text.secondary",
              fontSize: "0.7rem",
            }}
          >
            {formatTime(msg.createdAt)}
          </Typography>
          {getMessageStatusIcon(msg, currentUserId)}
        </Box>
      </Box>
    );
  }

  // text message stays exactly the same
  return (
    <Box>
      <Typography variant="body1" sx={{ lineHeight: 1.6, fontSize: "0.95rem" }}>
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
            color: isMine ? "rgba(255,255,255,0.8)" : "text.secondary",
            fontSize: "0.7rem",
          }}
        >
          {formatTime(msg.createdAt)}
        </Typography>
        {getMessageStatusIcon(msg, currentUserId)}
      </Box>
    </Box>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MessageItem({
  msg,
  previousMsg,
  currentUser,
  selectedChat,
  allImages,
  onImageLoad,
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const isGroupChat = selectedChat?.type === "group";
  const isMine = String(msg.sender_id) === String(currentUser?.id);
  const showDateSeparator = shouldShowDateSeparator(msg, previousMsg);
  const showSenderName = shouldShowSenderName(
    msg,
    previousMsg,
    isGroupChat,
    currentUser?.id,
  );
  const senderName = getSenderName(
    msg.sender_id,
    currentUser?.id,
    selectedChat,
  );
  const senderColor = getSenderColor(msg.sender_id);

  const handleImageClick = (imageUrl) => {
    // Find the index of clicked image in allImages array
    const index = allImages.findIndex((img) => img.src === imageUrl);
    setLightboxIndex(index !== -1 ? index : 0);
    setLightboxOpen(true);
  };

  return (
    <Box>
      {/* Date Separator */}
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

      {/* Message Row */}
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
              px: msg.message_type === "image" ? 1 : 2,
              py: msg.message_type === "image" ? 1 : 1.5,
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
            <MessageBubbleContent
              msg={msg}
              isMine={isMine}
              currentUserId={currentUser?.id}
              onImageClick={handleImageClick}
              onImageLoad={onImageLoad}
            />
          </Paper>
        </Box>
      </Box>

      {/* Lightbox - only renders for image messages */}
      {msg.message_type === "image" && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          slides={allImages}
          index={lightboxIndex}
          plugins={[Zoom, Download]}
          zoom={{
            maxZoomPixelRatio: 3,
            zoomInMultiplier: 2,
          }}
          carousel={{
            finite: true, // ← stops looping at first/last image
          }}
        />
      )}
    </Box>
  );
}
