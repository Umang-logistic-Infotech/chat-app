import { Box, Typography, CircularProgress } from "@mui/material";
import { useRef, useEffect, useState, useCallback } from "react";
import { Virtuoso } from "react-virtuoso";
import MessageItem from "./MessageItem";

const START_INDEX = 100000;

export default function MessageList({
  messages,
  currentUser,
  selectedChat,
  onLoadOlderMessages,
  isLoadingOldMessages,
  hasMoreMessages,
}) {
  const virtuosoRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);
  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);
  const prevMessageCountRef = useRef(0);
  const initializedRef = useRef(false);
  const isLoadingOldRef = useRef(false);

  // ─── Initialize on chat change ──────────────────────────────────────────────
  useEffect(() => {
    if (selectedChat?.id) {
      setFirstItemIndex(START_INDEX - messages.length);
      prevMessageCountRef.current = messages.length;
      initializedRef.current = true;
      isLoadingOldRef.current = false;

      setTimeout(() => {
        if (virtuosoRef.current && messages.length > 0) {
          virtuosoRef.current.scrollTo({ top: 999999, behavior: "auto" });
        }
      }, 100);
    }
  }, [selectedChat?.id]);

  // ─── Handle scroll on new messages ─────────────────────────────────────────
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
            virtuosoRef.current?.scrollTo({ top: 999999, behavior: "auto" });
          });
          setTimeout(() => {
            virtuosoRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
          }, 100);
        }
      }

      prevMessageCountRef.current = messages.length;
    }
  }, [messages, currentUser?.id, atBottom]);

  // ─── Load older messages on scroll to top ──────────────────────────────────
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

  // ─── Header shown at top of list ────────────────────────────────────────────
  const ListHeader = () => {
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

  const allImages = messages
    .filter((msg) => msg.message_type === "image")
    .map((msg) => ({ src: msg.image_url }));

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      virtuosoRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
    }, 100);
  }, []);
  const itemContent = useCallback(
    (index, msg) => {
      if (!msg) return <Box key={`empty-${index}`} />;

      const arrayIndex = index - firstItemIndex;
      const previousMsg = arrayIndex > 0 ? messages[arrayIndex - 1] : null;

      // ← Only scroll after image loads if it's the last message
      const isLastMessage = arrayIndex === messages.length - 1;

      return (
        <MessageItem
          key={msg.id || index}
          msg={msg}
          previousMsg={previousMsg}
          currentUser={currentUser}
          selectedChat={selectedChat}
          allImages={allImages}
          onImageLoad={isLastMessage ? scrollToBottom : undefined}
        />
      );
    },
    [
      messages,
      currentUser,
      firstItemIndex,
      selectedChat,
      allImages,
      scrollToBottom,
    ],
  );
  // ─── Empty state ────────────────────────────────────────────────────────────
  if (messages.length === 0) {
    return (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5e7eb' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
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
          {selectedChat?.type === "group"
            ? "Group created! Say hello to everyone!"
            : "No messages yet. Start the conversation!"}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        position: "relative",
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5e7eb' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }}
    >
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        firstItemIndex={firstItemIndex}
        itemContent={itemContent}
        startReached={loadMore}
        components={{ Header: ListHeader }}
        alignToBottom
        atBottomStateChange={setAtBottom}
        initialTopMostItemIndex={messages.length - 1}
        style={{ height: "100%" }}
        overscan={200}
      />
    </Box>
  );
}
