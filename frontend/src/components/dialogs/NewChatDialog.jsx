import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  InputBase,
  Paper,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { useState, useEffect } from "react";
import { api } from "../../Interceptor/auth";
import UserListItem from "../common/UserListItem";

export default function NewChatDialog({
  open,
  onClose,
  currentUserId,
  onChatCreated,
}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);
  const [error, setError] = useState(null);
  const baseurl = process.env.REACT_APP_API_URL;

  useEffect(() => {
    if (open && currentUserId) {
      console.log("Dialog opened, fetching users for:", currentUserId);
      fetchUsers();
    }
  }, [open, currentUserId]);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching from:", `${baseurl}/users/list/${currentUserId}`);
      const response = await api.get(`${baseurl}/users/list/${currentUserId}`);

      console.log("Users fetched:", response.data);
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      console.error("Error response:", error.response?.data);
      setError(error.response?.data?.error || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }

  async function handleUserClick(user) {
    try {
      setCreatingChat(true);

      console.log("Creating chat with user:", user);

      // Create or get existing private conversation
      const response = await api.post(`${baseurl}/conversations/create`, {
        sender_id: currentUserId,
        receiver_id: user.id,
      });

      console.log("Chat created response:", response.data);

      // The response.data structure is:
      // {
      //   conversationId: number,
      //   id: number (other user's id),
      //   name: string,
      //   profile_photo: string|null,
      //   phone_number: number,
      //   isNew: boolean
      // }

      // Format the chat data with conversationId
      const chatData = {
        id: response.data.id, // Other user's ID
        name: response.data.name,
        profile_photo: response.data.profile_photo,
        phone_number: response.data.phone_number,
        conversationId: response.data.conversationId, // Conversation ID
      };

      console.log("Formatted chat data:", chatData);

      // Close dialog first
      onClose();

      // Notify parent component with the chat data
      onChatCreated(chatData, response.data.isNew);
    } catch (error) {
      console.error("Error creating chat:", error);
      console.error("Error response:", error.response?.data);
      setError(error.response?.data?.error || "Failed to create chat");
    } finally {
      setCreatingChat(false);
    }
  }

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          minHeight: "500px",
          maxHeight: "80vh",
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          py: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          New Chat
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: "white",
            bgcolor: "rgba(255,255,255,0.2)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Search Bar */}
      <Box sx={{ px: 3, pt: 3, pb: 2 }}>
        <Paper
          elevation={0}
          sx={{
            display: "flex",
            alignItems: "center",
            bgcolor: "#f0f2f5",
            borderRadius: "12px",
            px: 2,
            py: 1,
          }}
        >
          <SearchIcon sx={{ color: "text.secondary", mr: 1 }} />
          <InputBase
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 1, fontSize: "0.95rem" }}
          />
        </Paper>
      </Box>

      {/* User List */}
      <DialogContent
        sx={{
          px: 2,
          py: 0,
          "&::-webkit-scrollbar": { width: "6px" },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "rgba(0,0,0,0.2)",
            borderRadius: "3px",
          },
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "300px",
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "300px",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                bgcolor: "error.light",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography fontSize={40}>❌</Typography>
            </Box>
            <Typography variant="body2" color="error" fontWeight={500}>
              {error}
            </Typography>
            <Typography
              variant="caption"
              color="primary"
              sx={{ cursor: "pointer" }}
              onClick={fetchUsers}
            >
              Try again
            </Typography>
          </Box>
        ) : filteredUsers.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "300px",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                bgcolor: "action.hover",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography fontSize={40}>👤</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {searchQuery ? "No users found" : "No users available"}
            </Typography>
            {users.length > 0 && searchQuery && (
              <Typography variant="caption" color="text.secondary">
                Try a different search term
              </Typography>
            )}
          </Box>
        ) : (
          <Box sx={{ pb: 2 }}>
            {filteredUsers.map((user) => (
              <UserListItem
                key={user.id}
                user={user}
                onClick={() => handleUserClick(user)}
                disabled={creatingChat}
                showOnlineBadge={false}
              />
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
