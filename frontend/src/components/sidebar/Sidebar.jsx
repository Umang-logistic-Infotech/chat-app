import { useState } from "react";
import {
  Paper,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  Typography,
  Fab,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SidebarHeader from "./SidebarHeader";
import SidebarSearch from "./SidebarSearch";
import ChatList from "./ChatList";

export default function Sidebar({
  chats,
  loading,
  selectedChat,
  messages,
  onlineUsers,
  onSelectChat,
  onNewChat,
  onNewGroup,
  getLastMessage,
  getUnreadCount,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [fabMenuAnchor, setFabMenuAnchor] = useState(null);

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Paper
      elevation={0}
      sx={{
        width: "380px",
        minWidth: "380px",
        display: "flex",
        flexDirection: "column",
        borderRadius: 0,
        borderRight: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        position: "relative",
      }}
    >
      <SidebarHeader>
        <SidebarSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </SidebarHeader>

      <ChatList
        chats={filteredChats}
        loading={loading}
        searchQuery={searchQuery}
        selectedChat={selectedChat}
        onlineUsers={onlineUsers}
        onSelectChat={onSelectChat}
        getLastMessage={getLastMessage}
        getUnreadCount={getUnreadCount}
      />

      {/* FAB Button */}
      <Fab
        color="primary"
        onClick={(e) => setFabMenuAnchor(e.currentTarget)}
        sx={{
          position: "absolute",
          bottom: 24,
          right: 24,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          "&:hover": {
            background: "linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)",
          },
        }}
      >
        <AddIcon />
      </Fab>

      {/* FAB Menu */}
      <Menu
        anchorEl={fabMenuAnchor}
        open={Boolean(fabMenuAnchor)}
        onClose={() => setFabMenuAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <MenuItem
          onClick={() => {
            setFabMenuAnchor(null);
            onNewChat();
          }}
        >
          <ListItemIcon>
            <PersonAddIcon fontSize="small" />
          </ListItemIcon>
          <Typography>New Chat</Typography>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setFabMenuAnchor(null);
            onNewGroup();
          }}
        >
          <ListItemIcon>
            <GroupAddIcon fontSize="small" />
          </ListItemIcon>
          <Typography>New Group</Typography>
        </MenuItem>
      </Menu>
    </Paper>
  );
}
