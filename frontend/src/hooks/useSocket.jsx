import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = process.env.REACT_APP_API_URL;

export default function useSocket(userId) {
  const socketRef = useRef(null);
  const [incomingMessage, setIncomingMessage] = useState(null);
  const [messageStatusUpdate, setMessageStatusUpdate] = useState(null);
  const [userStatusUpdate, setUserStatusUpdate] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const socket = io(BACKEND_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    // Register user
    socket.emit("register", userId);

    // Listen for incoming messages
    socket.on("receive_message", (message) => {
      setIncomingMessage({ ...message, _timestamp: Date.now() });
      // Automatically emit delivered status
      socket.emit("message_delivered", message.id);
    });

    // Listen for message delivered status
    socket.on("message_delivered", (data) => {
      setMessageStatusUpdate({
        messageId: data.messageId || data.id,
        status: "delivered",
        conversationId: data.conversationId || data.conversation_id,
        _timestamp: Date.now(),
      });
    });

    // Listen for message read status
    socket.on("message_read", (data) => {
      setMessageStatusUpdate({
        messageId: data.messageId || data.id,
        status: "read",
        conversationId: data.conversationId || data.conversation_id,
        _timestamp: Date.now(),
      });
    });

    // Listen for message sent confirmation
    socket.on("message_sent", (data) => {
      setMessageStatusUpdate({
        messageId: data.messageId || data.id || data.message?.id,
        status: "sent",
        conversationId: data.conversationId || data.conversation_id,
        _timestamp: Date.now(),
      });
    });

    // Listen for user status changes (online/offline)
    socket.on("user_status_changed", (data) => {
      setUserStatusUpdate({
        user_id: data.user_id,
        status: data.status,
        last_seen: data.last_seen,
        _timestamp: Date.now(),
      });
    });

    // Error handling
    socket.on("error_message", (errorMessage) => {
      console.error("❌ Socket error:", errorMessage);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  // Mark message as read
  function markMessageAsRead(messageId) {
    if (socketRef.current) {
      socketRef.current.emit("message_read", messageId);
    }
  }

  // Send message to conversation
  const sendMessage = (options) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
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

      // Emit the message
      socketRef.current.emit("send_message", messageData);

      // Set up listeners
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

      // Fallback timeout
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error("Message send timeout"));
        }
      }, 5000);
    });
  };

  return {
    sendMessage,
    incomingMessage,
    markMessageAsRead,
    messageStatusUpdate,
    userStatusUpdate,
  };
}
