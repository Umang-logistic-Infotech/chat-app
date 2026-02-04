import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const BACKEND_URL = "http://localhost:5000";

export default function useSocket(userId) {
  const socketRef = useRef(null);
  const [incomingMessage, setIncomingMessage] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const socket = io(BACKEND_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    // Register user
    socket.emit("register", userId);

    // Listen for incoming messages
    socket.on("receive_message", (message) => {
      setIncomingMessage(message);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  // Send message
  const sendMessage = (receiverUserId, text) => {
    if (!socketRef.current) return;
    socketRef.current.emit("send_message", {
      senderUserId: userId,
      receiverUserId,
      message: text, // just text, backend handles conversation
    });
  };

  return { sendMessage, incomingMessage };
}
