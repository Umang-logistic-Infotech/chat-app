import {
  Typography,
  Box,
  Avatar,
  ListItemText,
  List,
  ListItemAvatar,
  Divider,
} from "@mui/material";
import axios from "axios";
import ListItem from "@mui/material/ListItem";
import { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";
import ChatArea from "./ChatArea";

export default function Home() {
  const [chats, setChats] = useState([]);
  const { user } = useUser();
  const [selectedChat, setSelectedChat] = useState(null);

  useEffect(() => {
    if (user != null) {
      fetchUsers();
    }
  }, [user]);

  async function fetchUsers() {
    try {
      const response = await axios.get(`http://localhost:5000/users`);
      // Filter out the current logged-in user from the list
      const filtered = response.data.filter((u) => u.id !== user.id);
      setChats(filtered);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }

  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 64px)" }}>
      {/* ── Sidebar ── */}
      <Box
        sx={{
          width: "320px",
          minWidth: "320px",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        {/* Sidebar Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Chats
          </Typography>
        </Box>

        {/* User List */}
        <List
          sx={{
            flex: 1,
            overflowY: "auto",
            p: 1,
            "&::-webkit-scrollbar": { width: "6px" },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "#ccc",
              borderRadius: "3px",
            },
          }}
        >
          {chats.map((chat) => {
            const isSelected = selectedChat?.id === chat.id;
            return (
              <ListItem
                key={chat.id}
                button
                onClick={() => setSelectedChat(chat)}
                sx={{
                  borderRadius: "10px",
                  mb: 0.5,
                  px: 1.5,
                  py: 1,
                  bgcolor: isSelected ? "action.selected" : "transparent",
                  "&:hover": {
                    bgcolor: isSelected ? "action.selected" : "action.hover",
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    src={chat.profile_photo || ""}
                    sx={{ width: 42, height: 42 }}
                  >
                    {!chat.profile_photo && chat.name?.charAt(0)}
                  </Avatar>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <Typography fontWeight={600} fontSize={14}>
                      {chat.name}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      fontSize={13}
                    >
                      {chat.phone_number}
                    </Typography>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Divider orientation="vertical" flexItem />

      {/* ── Chat Area ── */}
      <ChatArea selectedChat={selectedChat} currentUser={user} />
    </Box>
  );
}
