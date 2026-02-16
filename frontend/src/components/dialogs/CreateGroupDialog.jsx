import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Avatar,
  Checkbox,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  IconButton,
  Typography,
  InputBase,
  Paper,
  Chip,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import { useState, useEffect } from "react";
import { api } from "../../Interceptor/auth";

export default function CreateGroupDialog({
  open,
  onClose,
  currentUserId,
  onGroupCreated,
}) {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupPhoto, setGroupPhoto] = useState(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const baseurl = process.env.REACT_APP_API_URL;

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${baseurl}/users/list/${currentUserId}`);

      // Ensure response.data is an array
      const usersData = Array.isArray(response.data) ? response.data : [];
      const users = usersData.filter((user) => user.id !== currentUserId);

      setAllUsers(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGroupPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setGroupPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length < 2) {
      alert("Please enter a group name and select at least 2 members");
      return;
    }

    try {
      setCreating(true);

      let photoUrl = null;
      if (groupPhoto) {
        const formData = new FormData();
        formData.append("file", groupPhoto);
        const uploadResponse = await api.put(`${baseurl}/upload`, formData);
        photoUrl = uploadResponse.data.url;
      }

      const response = await api.post(`${baseurl}/conversations/group/create`, {
        name: groupName,
        description: groupDescription,
        memberIds: [...selectedMembers, currentUserId],
        createdBy: currentUserId,
        group_photo: photoUrl,
      });

      if (response.data.success) {
        onGroupCreated(response.data.group);
        handleClose();
      }
    } catch (error) {
      console.error("Error creating group:", error);
      alert(
        "Failed to create group: " +
          (error.response?.data?.error || error.message),
      );
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setGroupName("");
    setGroupDescription("");
    setGroupPhoto(null);
    setGroupPhotoPreview(null);
    setSelectedMembers([]);
    setSearchQuery("");
    onClose();
  };

  // Safe filtering with array check
  const filteredUsers = Array.isArray(allUsers)
    ? allUsers.filter((user) =>
        user?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 2,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Create New Group
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ position: "relative" }}>
              <Avatar
                src={groupPhotoPreview}
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: "primary.main",
                  cursor: "pointer",
                }}
              >
                {!groupPhotoPreview && <CameraAltIcon sx={{ fontSize: 32 }} />}
              </Avatar>
              <input
                type="file"
                accept="image/*"
                hidden
                id="group-photo-upload"
                onChange={handlePhotoChange}
              />
              <label htmlFor="group-photo-upload">
                <IconButton
                  component="span"
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    bgcolor: "background.paper",
                    boxShadow: 1,
                    "&:hover": { bgcolor: "background.paper" },
                  }}
                  size="small"
                >
                  <CameraAltIcon fontSize="small" />
                </IconButton>
              </label>
            </Box>

            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                label="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                required
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Description (Optional)"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="What's this group about?"
                multiline
                rows={2}
              />
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Add Members ({selectedMembers.length} selected - min 2 required)
            </Typography>

            <Paper
              elevation={0}
              sx={{
                display: "flex",
                alignItems: "center",
                bgcolor: "action.hover",
                borderRadius: "12px",
                px: 2,
                py: 1,
                mb: 2,
              }}
            >
              <SearchIcon sx={{ color: "text.secondary", mr: 1 }} />
              <InputBase
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                fullWidth
              />
            </Paper>

            {selectedMembers.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
                {selectedMembers.map((memberId) => {
                  const user = allUsers.find((u) => u.id === memberId);
                  if (!user) return null;
                  return (
                    <Chip
                      key={memberId}
                      label={user.name}
                      onDelete={() => toggleMember(memberId)}
                      avatar={
                        <Avatar src={user.profile_photo}>
                          {user.name?.charAt(0)}
                        </Avatar>
                      }
                    />
                  );
                })}
              </Box>
            )}

            <List
              sx={{
                maxHeight: 300,
                overflowY: "auto",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "12px",
              }}
            >
              {loading ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    py: 4,
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : filteredUsers.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    {searchQuery ? "No users found" : "No users available"}
                  </Typography>
                </Box>
              ) : (
                filteredUsers.map((user) => (
                  <ListItem key={user.id} disablePadding>
                    <ListItemButton onClick={() => toggleMember(user.id)} dense>
                      <ListItemAvatar>
                        <Avatar src={user.profile_photo}>
                          {user.name?.charAt(0)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={user.name}
                        secondary={user.phone_number}
                      />
                      <Checkbox
                        checked={selectedMembers.includes(user.id)}
                        edge="end"
                      />
                    </ListItemButton>
                  </ListItem>
                ))
              )}
            </List>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} variant="outlined" disabled={creating}>
          Cancel
        </Button>
        <Button
          onClick={handleCreateGroup}
          variant="contained"
          disabled={creating || !groupName.trim() || selectedMembers.length < 2}
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          }}
        >
          {creating ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            `Create Group ${selectedMembers.length >= 2 ? `(${selectedMembers.length} members)` : ""}`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
