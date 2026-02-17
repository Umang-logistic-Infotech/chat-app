import { Box } from "@mui/material";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import EmptyChatArea from "./EmptyChatArea";

export default function ChatArea({
  selectedChat,
  currentUser,
  messages,
  isOnline,
  onSendTextMessage,
  onSendImageMessage,
  onLoadOlderMessages,
  isLoadingOldMessages,
  hasMoreMessages,
}) {
  if (!selectedChat) {
    return <EmptyChatArea />;
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
      <ChatHeader selectedChat={selectedChat} isOnline={isOnline} />

      <MessageList
        messages={messages}
        currentUser={currentUser}
        selectedChat={selectedChat}
        onLoadOlderMessages={onLoadOlderMessages}
        isLoadingOldMessages={isLoadingOldMessages}
        hasMoreMessages={hasMoreMessages}
      />

      <MessageInput
        selectedChat={selectedChat}
        onSendTextMessage={onSendTextMessage}
        onSendImageMessage={onSendImageMessage}
      />
    </Box>
  );
}
