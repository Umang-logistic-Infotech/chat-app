import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = "http://localhost:5000";

export default function useSocket(userId) {
  const socketRef = useRef(null);
  const [incomingMessage, setIncomingMessage] = useState(null);
  const [messageStatusUpdate, setMessageStatusUpdate] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const socket = io(BACKEND_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    // Register user
    socket.emit("register", userId);

    // Listen for incoming messages
    socket.on("receive_message", (message) => {
      setIncomingMessage({ ...message, _timestamp: Date.now() }); // Add timestamp
      // Automatically emit delivered status
      socket.emit("message_delivered", message.id);
    });

    // Listen for message delivered status
    socket.on("message_delivered", (data) => {
      setMessageStatusUpdate({
        messageId: data.messageId || data.id,
        status: "delivered",
        conversationId: data.conversationId || data.conversation_id,
        _timestamp: Date.now(), // Force unique state update
      });
    });

    // Listen for message read status
    socket.on("message_read", (data) => {
      setMessageStatusUpdate({
        messageId: data.messageId || data.id,
        status: "read",
        conversationId: data.conversationId || data.conversation_id,
        _timestamp: Date.now(), // Force unique state update
      });
    });

    // Listen for message sent confirmation
    socket.on("message_sent", (data) => {
      setMessageStatusUpdate({
        messageId: data.messageId || data.id || data.message?.id,
        status: "sent",
        conversationId: data.conversationId || data.conversation_id,
        _timestamp: Date.now(), // Force unique state update
      });
    });

    // Connection status
    socket.on("connect", () => {
      console.log("✅ Socket connected");
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    socket.on("error", (error) => {
      console.error("🔴 Socket error:", error);
    });

    return () => {
      console.log("🔌 Disconnecting socket for user:", userId);
      socket.disconnect();
    };
  }, [userId]);

  // Mark message as read
  function markMessageAsRead(messageId) {
    if (socketRef.current) {
      socketRef.current.emit("message_read", messageId);
    }
  }

  // Send message
  const sendMessage = (receiverUserId, text) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
        console.error("❌ Socket not connected");
        reject(new Error("Socket not connected"));
        return;
      }

      const messageData = {
        senderUserId: userId,
        receiverUserId,
        message: text,
      };

      // Emit the message
      socketRef.current.emit("send_message", messageData);

      // Set up listeners
      let resolved = false;

      const onSent = (response) => {
        if (!resolved) {
          resolved = true;
          resolve(response);
        }
      };

      socketRef.current.once("message_sent", onSent);

      // Fallback timeout
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ success: true });
        }
      }, 3000);
    });
  };

  return {
    sendMessage,
    incomingMessage,
    markMessageAsRead,
    messageStatusUpdate,
  };
}
