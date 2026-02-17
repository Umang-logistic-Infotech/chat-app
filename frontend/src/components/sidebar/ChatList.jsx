import { List, Box, Typography, CircularProgress } from "@mui/material";
import ChatListItem from "./ChatListItem";

export default function ChatList({
  chats,
  loading,
  searchQuery,
  selectedChat,
  onlineUsers,
  onSelectChat,
  getLastMessage,
  getUnreadCount,
}) {
  if (loading) {
    return (
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
    );
  }

  if (chats.length === 0) {
    return (
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
          {searchQuery ? "No conversations found" : "No conversations yet"}
        </Typography>
      </Box>
    );
  }

  return (
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
      {chats.map((chat) => (
        <ChatListItem
          key={chat.conversationId}
          chat={chat}
          isSelected={selectedChat?.conversationId === chat.conversationId}
          isOnline={onlineUsers[chat.id]?.status === "online"}
          lastMessage={getLastMessage(chat)}
          unreadCount={getUnreadCount(chat)}
          onSelect={() => onSelectChat(chat)}
        />
      ))}
    </List>
  );
}
