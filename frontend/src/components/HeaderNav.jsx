import { useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { api } from "../Interceptor/auth";

api.defaults.withCredentials = true;

export default function HeaderNav() {
  const { user, logout: logoutContext } = useUser();
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await api.post(`${process.env.REACT_APP_API_URL}/users/logout`);
      logoutContext();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
    handleClose();
  };

  return (
    <Box>
      <AppBar position="sticky" elevation={1} sx={{ top: 0 }}>
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            Chat App
          </Typography>

          {user ? (
            <>
              <Typography variant="body1" sx={{ mr: 2 }}>
                {user.name}
              </Typography>
              <IconButton size="large" onClick={handleMenu} color="inherit">
                <Avatar
                  src={user.profile_photo || undefined}
                  alt={user.name}
                  sx={{ width: 40, height: 40 }}
                >
                  {!user.profile_photo && user.name.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem
                  onClick={() => {
                    navigate("/profile");
                    handleClose();
                  }}
                >
                  Profile
                </MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button color="inherit" onClick={() => navigate("/login")}>
                Login
              </Button>
              <Button color="inherit" onClick={() => navigate("/signup")}>
                Sign Up
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
    </Box>
  );
}
