import {
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Box,
  Typography,
  Chip,
} from "@mui/material";
import UserAvatar from "../common/UserAvatar";

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
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

const getLastMessagePreview = (lastMessage, isGroup) => {
  if (!lastMessage) return isGroup ? "Group created" : "No messages yet";
  if (lastMessage.message_type === "image") return "📷 Image";
  return lastMessage.message;
};

export default function ChatListItem({
  chat,
  isSelected,
  isOnline,
  lastMessage,
  unreadCount,
  onSelect,
}) {
  const isGroup = chat.type === "group";

  return (
    <ListItem
      button
      onClick={onSelect}
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
                  sx={{ ml: 1, height: 18, fontSize: "0.65rem" }}
                />
              )}
            </Typography>
            {lastMessage && (
              <Typography
                variant="caption"
                sx={{
                  color: unreadCount > 0 ? "primary.main" : "text.secondary",
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
              {getLastMessagePreview(lastMessage, isGroup)}
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
}
