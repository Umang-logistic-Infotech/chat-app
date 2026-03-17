// hooks/useNotification.jsx
import { useState, useEffect, useCallback } from "react";

const useNotification = () => {

  const [permissionStatus, setPermissionStatus] = useState(
    typeof Notification !== "undefined"
      ? Notification.permission
      : "unsupported"
  );

  useEffect(() => {
    if (typeof Notification === "undefined") {
      console.warn("⚠️ Browser Notification API not supported");
      return;
    }
    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        setPermissionStatus(permission);
        console.log(`🔔 Notification permission: ${permission}`);
      });
    }
  }, []);

  const showBrowserNotification = useCallback((title, body, icon = "/logo192.png", senderId) => {

    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (!document.hidden) return;

    const notification = new Notification(title, {
      body,
      icon,
      badge:  "/logo192.png",
      // ── Each sender gets own notification slot ──────────────────────
      // Multiple senders → multiple notifications shown simultaneously
      // Multiple messages from SAME sender → replace each other (no spam)
      tag:    `chat-${senderId}`,
      silent: false,          // use OS default notification sound
      // ⚠️ Custom sound → NOT supported in Web Notification API
      // ⚠️ Actions (Reply button) → only in Service Workers (PWA)
    });

    setTimeout(() => notification.close(), 5000);

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

  }, []);

  return { showBrowserNotification, permissionStatus };
};

export default useNotification;