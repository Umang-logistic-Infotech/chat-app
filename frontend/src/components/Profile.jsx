import React, { useState } from "react";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
  Avatar,
  IconButton,
  Grid,
  Divider,
} from "@mui/material";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import { useUser } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import { api } from "../Interceptor/auth";

api.defaults.withCredentials = true;

export default function Profile() {
  const { user, login } = useUser();
  const navigate = useNavigate();

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name,
    phone_number: user?.phone_number,
  });
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(user?.profile_photo || null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if not logged in
  if (!user) {
    navigate("/login");
    return null;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size should not exceed 5MB");
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file");
        return;
      }

      setProfileImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);

      if (profileImage) {
        formDataToSend.append("profile_photo", profileImage);
      }

      const response = await api.put(
        `${process.env.REACT_APP_API_URL}/users/${user.id}`,
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      // Update user context
      const updatedUser = {
        ...user,
        name: response.data.data.name,
        profile_photo: response.data.data.profile_photo,
      };
      login(updatedUser);

      // Update cookie
      document.cookie = `user=${encodeURIComponent(JSON.stringify(updatedUser))}; path=/; max-age=${24 * 60 * 60}`;

      setSuccess("Profile updated successfully!");
      setEditMode(false);
      setProfileImage(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name,
      phone_number: user.phone_number,
    });
    setImagePreview(user.profile_photo);
    setProfileImage(null);
    setEditMode(false);
    setError("");
    setSuccess("");
  };

  return (
    <Container maxWidth="md">
      <Paper
        elevation={3}
        sx={{
          marginTop: 4,
          padding: 4,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography component="h1" variant="h4">
            Profile
          </Typography>
          {!editMode && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setEditMode(true)}
            >
              Edit Profile
            </Button>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Profile Image Section */}
            <Grid
              item
              xs={12}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Box sx={{ position: "relative" }}>
                <Avatar
                  src={imagePreview || undefined}
                  alt={user.name}
                  sx={{
                    width: 150,
                    height: 150,
                    fontSize: "3rem",
                    mb: 2,
                  }}
                >
                  {!imagePreview && user.name.charAt(0).toUpperCase()}
                </Avatar>

                {editMode && (
                  <IconButton
                    color="primary"
                    aria-label="upload picture"
                    component="label"
                    sx={{
                      position: "absolute",
                      bottom: 10,
                      right: -10,
                      backgroundColor: "white",
                      "&:hover": {
                        backgroundColor: "grey.200",
                      },
                    }}
                  >
                    <input
                      hidden
                      accept="image/*"
                      type="file"
                      onChange={handleImageChange}
                    />
                    <PhotoCamera />
                  </IconButton>
                )}
              </Box>

              {editMode && (
                <Typography variant="caption" color="text.secondary">
                  Click camera icon to upload new photo (Max 5MB)
                </Typography>
              )}
            </Grid>

            {/* Name Field */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!editMode}
                required
              />
            </Grid>

            {/* Phone Number Field */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phone_number"
                value={formData.phone_number}
                disabled
                helperText="Phone number cannot be changed"
              />
            </Grid>

            {/* Action Buttons */}
            {editMode && (
              <Grid item xs={12}>
                <Box
                  sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}
                >
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>

        {/* Additional Info */}
        <Divider sx={{ my: 3 }} />
        <Box>
          <Typography variant="h6" gutterBottom>
            Account Information
          </Typography>
          <Typography variant="body2" color="text.secondary">
            User ID: {user.id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Member since: {new Date().toLocaleDateString()}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
