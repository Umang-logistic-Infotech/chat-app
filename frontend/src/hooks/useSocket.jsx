import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = process.env.REACT_APP_API_URL;

export default function useSocket(userId) {
  const socketRef = useRef(null);
  const [incomingMessage, setIncomingMessage] = useState(null);
  const [messageStatusUpdate, setMessageStatusUpdate] = useState(null);
  const [userStatusUpdate, setUserStatusUpdate] = useState(null);
  const [typingStatus, setTypingStatus] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("register", userId);
    });

    socket.on("receive_message", (message) => {
      setIncomingMessage({ ...message, _timestamp: Date.now() });
      socket.emit("message_delivered", message.id);
    });

    socket.on("message_status_update", (data) => {
      setMessageStatusUpdate({
        messageId: data.messageId || data.id,
        status: data.status,
        conversationId: data.conversationId || data.conversation_id,
        _timestamp: Date.now(),
      });
    });

    socket.on("message_sent", (data) => {
      setMessageStatusUpdate({
        messageId: data.messageId || data.id || data.message?.id,
        status: "sent",
        conversationId: data.conversationId || data.conversation_id,
        _timestamp: Date.now(),
      });
    });

    socket.on("user_status_changed", (data) => {
      setUserStatusUpdate({
        user_id: data.user_id,
        status: data.status,
        last_seen: data.last_seen,
        _timestamp: Date.now(),
      });
    });

    socket.on("user_typing", (data) => {
      setTypingStatus({
        conversationId: data.conversationId,
        userId: data.userId,
        userName: data.userName,
        isTyping: data.isTyping,
        _timestamp: Date.now(),
      });
    });

    socket.on("error_message", (errorMessage) => {
      console.error("❌ Socket error:", errorMessage);
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
      socket.emit("register", userId);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  function markMessageAsRead(messageId) {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("message_read", messageId);
    }
  }

  const sendMessage = (options) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !socketRef.current.connected) {
        reject(new Error("Socket not connected"));
        return;
      }

      if (!options.conversationId) {
        reject(new Error("conversationId is required"));
        return;
      }

      const messageData = {
        senderUserId: userId,
        conversationId: options.conversationId,
        message: options.message || options.text,
      };

      socketRef.current.emit("send_message", messageData);

      let resolved = false;

      const onSent = (response) => {
        if (!resolved) {
          resolved = true;
          resolve({
            messageId:
              response.messageId || response.id || response.message?.id,
            conversationId: response.conversationId,
            message: response.message,
            success: true,
          });
        }
      };

      const onError = (error) => {
        console.error("❌ Message send error:", error);
        if (!resolved) {
          resolved = true;
          reject(new Error(error));
        }
      };

      socketRef.current.once("message_sent", onSent);
      socketRef.current.once("error_message", onError);

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error("Message send timeout"));
        }
      }, 10000);
    });
  };

  const startTyping = (conversationId, userName) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("typing_start", {
        conversationId,
        userId,
        userName,
      });
    }
  };

  const stopTyping = (conversationId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("typing_stop", {
        conversationId,
        userId,
      });
    }
  };

  return {
    sendMessage,
    incomingMessage,
    markMessageAsRead,
    messageStatusUpdate,
    userStatusUpdate,
    typingStatus,
    startTyping,
    stopTyping,
    isConnected: socketRef.current?.connected || false,
  };
}
