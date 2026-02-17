import {
  Box,
  Paper,
  Avatar,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import BlockIcon from "@mui/icons-material/Block";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import { useState } from "react";

export default function ChatHeader({ selectedChat, isOnline }) {
  const [menuAnchor, setMenuAnchor] = useState(null);

  const isGroupChat = selectedChat?.type === "group";

  const getOnlineStatusText = () => {
    if (isGroupChat) {
      return (
        selectedChat.participants
          ?.map((p) => p.name)
          .slice(0, 3)
          .join(", ") + (selectedChat.participantCount > 3 ? "..." : "")
      );
    }
    return isOnline ? "Online" : "Offline";
  };

  return (
    <Paper
      elevation={0}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: 3,
        py: 2,
        borderRadius: 0,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {/* Avatar */}
      <Avatar
        src={selectedChat.group_photo || selectedChat.profile_photo}
        sx={{
          width: 48,
          height: 48,
          bgcolor: "primary.main",
          fontSize: "1.2rem",
          fontWeight: 600,
        }}
      >
        {!(selectedChat.group_photo || selectedChat.profile_photo) &&
          selectedChat.name?.charAt(0).toUpperCase()}
      </Avatar>

      {/* Name & Status */}
      <Box sx={{ flex: 1 }}>
        <Typography variant="h6" fontWeight={700} fontSize={16}>
          {selectedChat.name}
          {isGroupChat && (
            <Chip
              label={`${selectedChat.participantCount || selectedChat.participants?.length || 0} members`}
              size="small"
              sx={{ ml: 1, height: 20, fontSize: "0.7rem" }}
            />
          )}
        </Typography>
        <Typography
          variant="caption"
          color={isOnline && !isGroupChat ? "success.main" : "text.secondary"}
          fontWeight={500}
        >
          {getOnlineStatusText()}
        </Typography>
      </Box>

      {/* Action Buttons */}
      <Tooltip title="Search">
        <IconButton size="small">
          <SearchIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="More options">
        <IconButton
          size="small"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
        >
          <MoreVertIcon />
        </IconButton>
      </Tooltip>

      {/* Dropdown Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{ sx: { width: 200, mt: 1 } }}
      >
        {isGroupChat && (
          <MenuItem onClick={() => setMenuAnchor(null)}>
            <ListItemIcon>
              <InfoIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Group Info</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => setMenuAnchor(null)}>
          <ListItemIcon>
            <NotificationsOffIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Mute</ListItemText>
        </MenuItem>
        {!isGroupChat && (
          <MenuItem onClick={() => setMenuAnchor(null)}>
            <ListItemIcon>
              <BlockIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Block</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          onClick={() => setMenuAnchor(null)}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>
            {isGroupChat ? "Leave Group" : "Delete Chat"}
          </ListItemText>
        </MenuItem>
      </Menu>
    </Paper>
  );
}
