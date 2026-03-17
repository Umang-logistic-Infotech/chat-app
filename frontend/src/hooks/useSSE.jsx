// hooks/useSSE.jsx
//
// Manages the SSE connection lifecycle
// Pattern mirrors useSocket.jsx — same structure, different transport
//
// Usage:
//   const { isConnected } = useSSE(userId, (notification) => {
//     console.log("New notification:", notification);
//   });

import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../Interceptor/auth.js";

const BACKEND_URL = process.env.REACT_APP_API_URL;

/**
 * useSSE hook
 *
 * @param {number|string} userId          - logged in user's ID
 * @param {function}      onNotification  - callback fired when notification arrives
 *                                          receives notification payload object
 */
const useSSE = (userId, onNotification) => {

  // Holds the EventSource instance across re-renders
  // Same pattern as socketRef in useSocket.jsx
  const eventSourceRef = useRef(null);

  // Track connection status for UI feedback if needed
  const [isConnected, setIsConnected] = useState(false);

  // Wrap onNotification in useCallback ref to avoid
  // re-triggering useEffect when parent re-renders
  const onNotificationRef = useRef(onNotification);
  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {

    // Don't connect if userId is not available yet
    // (user might not be logged in)
    if (!userId) return;

    let isMounted = true; // prevent state updates after unmount

    // ── Step 1: Get SSE token from backend ──────────────────────────────
    // We use axios (api interceptor) so JWT is attached automatically
    // Same interceptor your existing API calls use
    const connect = async () => {
      try {
        // POST /notifications/token
        // JWT attached automatically by your Interceptor/auth.js
        // Returns { token: "64-char-hex-string" }
        const response = await api.post(
          `${BACKEND_URL}/notifications/token`
        );

        const { token } = response.data;

        if (!token || !isMounted) return;

        // ── Step 2: Open EventSource with SSE token ──────────────────────
        // EventSource cannot set headers → token goes in query param
        // This is why we use the short-lived token pattern
        const eventSource = new EventSource(
          `${BACKEND_URL}/notifications/stream?token=${token}`
        );

        eventSourceRef.current = eventSource;

        // ── Step 3: Connection opened ────────────────────────────────────
        // Fires when EventSource successfully connects
        eventSource.onopen = () => {
          if (isMounted) {
            setIsConnected(true);
            console.log("✅ SSE connected for userId:", userId);
          }
        };

        // ── Step 4: Listen for 'connected' confirmation event ────────────
        // Server sends this immediately after connection is established
        // event: connected
        // data: {"message":"SSE connected","userId":1}
        eventSource.addEventListener("connected", (e) => {
          const data = JSON.parse(e.data);
          console.log("🔔 SSE confirmed:", data.message);
        });

        // ── Step 5: Listen for 'notification' events ─────────────────────
        // Server sends this when a message arrives
        // event: notification
        // data: {"senderId":1,"senderName":"John",...}
        eventSource.addEventListener("notification", (e) => {
          const notification = JSON.parse(e.data);
          console.log("🔔 Notification received:", notification);

          // Call the callback passed from parent component
          // This is how we pass notification data up to App.js
          if (onNotificationRef.current) {
            onNotificationRef.current(notification);
          }
        });

        // ── Step 6: Handle errors ─────────────────────────────────────────
        // EventSource auto-reconnects on error after ~3 seconds
        // We just log and update state here
        eventSource.onerror = (err) => {
          console.error("❌ SSE error:", err);
          if (isMounted) {
            setIsConnected(false);
          }
          // Don't close here — EventSource handles reconnect automatically
          // But on reconnect it will need a new token
          // So we close and reconnect manually with a fresh token
          eventSource.close();
          if (isMounted) {
            console.log("🔄 SSE reconnecting in 3 seconds...");
            setTimeout(connect, 3000);
          }
        };

      } catch (err) {
        console.error("❌ SSE token fetch failed:", err);
        if (isMounted) {
          // Retry after 5 seconds if token fetch fails
          console.log("🔄 Retrying SSE connection in 5 seconds...");
          setTimeout(connect, 5000);
        }
      }
    };

    // Start the connection
    connect();

    // ── Cleanup on unmount ───────────────────────────────────────────────
    // Fires when component unmounts or userId changes
    // Closes EventSource → triggers req.on('close') on backend
    // → removeClient(userId) called → Map entry cleaned up
    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
        console.log("🔌 SSE disconnected for userId:", userId);
      }
    };

  }, [userId]); // re-run only if userId changes (login/logout)

  return { isConnected };
};

export default useSSE;