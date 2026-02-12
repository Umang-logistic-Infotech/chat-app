import React, { useState } from "react";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { api } from "../Interceptor/auth";

api.defaults.withCredentials = true;

export default function Login() {
  const [formData, setFormData] = useState({
    phone_number: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useUser();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.phone_number || !formData.password) {
      setError("All fields are required");
      return;
    }

    if (!/^\d{10}$/.test(formData.phone_number)) {
      setError("Phone number must be exactly 10 digits");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post(
        `${process.env.REACT_APP_API_URL}/users/login`,
        {
          phone_number: formData.phone_number,
          password: formData.password,
        },
      );
      // Update user context
      login(response.data.user);

      localStorage.setItem("token", response.data.token);
      // Navigate to home
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper
        elevation={3}
        sx={{
          marginTop: 8,
          padding: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <LockOutlinedIcon sx={{ fontSize: 50, mb: 1, color: "primary.main" }} />
        <Typography component="h1" variant="h5" mb={2}>
          Log In
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} width="100%">
          <TextField
            margin="normal"
            required
            fullWidth
            id="phone_number"
            label="Phone Number"
            name="phone_number"
            autoComplete="tel"
            autoFocus
            value={formData.phone_number}
            onChange={handleChange}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            id="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? "Logging In..." : "Log In"}
          </Button>

          <Box textAlign="center">
            <Typography variant="body2">
              Don't have an account?{" "}
              <Button
                onClick={() => navigate("/signup")}
                sx={{ textTransform: "none" }}
              >
                Sign Up
              </Button>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
