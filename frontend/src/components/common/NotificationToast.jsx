// components/common/NotificationToast.jsx
//
// Displays multiple stacked notifications simultaneously
// Position: top-right, stacked vertically
// Each notification has its own timer and close button
// Click on notification → opens that conversation

import React from "react";
import {
  Alert,
  Avatar,
  Box,
  Typography,
  Slide,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import NotificationsIcon from "@mui/icons-material/Notifications";

// ── Single Toast Item ─────────────────────────────────────────────────────────
// Renders one notification toast
// Wrapped in Slide for animation
const ToastItem = ({ notification, onClose, onClick, index }) => {
  const senderInitial = notification.senderName?.[0]?.toUpperCase() || "?";

  return (
    <Slide direction="left" in={true} mountOnEnter unmountOnExit>
      <Alert
        icon={false}
        sx={{
          // ── Layout ────────────────────────────────────────────────
          minWidth: "300px",
          maxWidth: "360px",
          padding: "10px 16px",
          borderRadius: "12px",
          cursor: "pointer",

          // ── Stack offset: each toast pushed down by index ─────────
          // index 0 → top: 0, index 1 → top: 80px, etc.
          marginBottom: "8px",

          // ── Colors ────────────────────────────────────────────────
          backgroundColor: "#1e1e2e",
          color: "#ffffff",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",

          // ── Hover effect ──────────────────────────────────────────
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
          "&:hover": {
            transform: "scale(1.02)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
          },

          // ── Remove default Alert padding ──────────────────────────
          "& .MuiAlert-message": {
            padding: 0,
            width: "100%",
          },
          "& .MuiAlert-action": {
            padding: "0 0 0 8px",
            alignItems: "center",
          },
        }}
        // Click on toast body → open conversation
        onClick={() => onClick(notification)}
        action={
          // Close button — stops propagation so it doesn't
          // trigger the onClick (open conversation) handler
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation(); // ← critical: don't trigger parent onClick
              onClose(notification.id);
            }}
            sx={{ color: "rgba(255,255,255,0.6)" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>

          {/* ── Sender Avatar ────────────────────────────────────── */}
          <Avatar
            src={notification.senderPhoto || ""}
            alt={notification.senderName}
            sx={{
              width: 40,
              height: 40,
              bgcolor: "#7c3aed",
              fontSize: "16px",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {!notification.senderPhoto && senderInitial}
          </Avatar>

          {/* ── Text ─────────────────────────────────────────────── */}
          <Box sx={{ flex: 1, minWidth: 0 }}>

            {/* Sender name */}
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                fontSize: "13px",
                color: "#ffffff",
                lineHeight: 1.3,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <NotificationsIcon sx={{ fontSize: 14, color: "#7c3aed" }} />
              {notification.senderName}
            </Typography>

            {/* Message preview */}
            <Typography
              variant="body2"
              sx={{
                fontSize: "12px",
                color: "rgba(255,255,255,0.7)",
                lineHeight: 1.4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "240px",
              }}
            >
              {notification.messagePreview}
            </Typography>

          </Box>
        </Box>
      </Alert>
    </Slide>
  );
};

// ── Main NotificationToast Component ─────────────────────────────────────────
// Renders a stack of ToastItems
//
// Props:
//   notifications    → array of notification payloads
//   onClose          → (notificationId) → remove from array
//   onNotificationClick → (notification) → open that conversation
//   activeConvId     → suppress if same conversation open
const NotificationToast = ({
  notifications = [],
  onClose,
  onNotificationClick,
  activeConvId,
}) => {

  // Filter out notifications for currently open conversation
  // User already sees those messages in the chat
  const visibleNotifications = notifications.filter(
    (n) =>
      !activeConvId ||
      Number(n.conversationId) !== Number(activeConvId)
  );

  // Nothing to show
  if (visibleNotifications.length === 0) return null;

  return (
    // ── Container: fixed top-right ──────────────────────────────────────
    <Box
      sx={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 9999,           // above everything including MUI dialogs
        display: "flex",
        flexDirection: "column",// stack vertically
        alignItems: "flex-end",
        gap: "8px",             // space between toasts
        pointerEvents: "none",  // container doesn't block clicks
      }}
    >
      {visibleNotifications.map((notification, index) => (
        <Box
          key={notification.id}
          sx={{ pointerEvents: "all" }} // individual toasts are clickable
        >
          <ToastItem
            notification={notification}
            onClose={onClose}
            onClick={onNotificationClick}
            index={index}
          />
        </Box>
      ))}
    </Box>
  );
};

export default NotificationToast;