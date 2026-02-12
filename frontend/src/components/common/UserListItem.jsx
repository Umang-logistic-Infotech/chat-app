import {
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
  Box,
} from "@mui/material";
import UserAvatar from "./UserAvatar";

export default function UserListItem({
  user,
  onClick,
  isSelected = false,
  showOnlineBadge = false,
  isOnline = false,
  disabled = false,
  secondaryText = null,
  rightContent = null,
}) {
  return (
    <ListItem
      button
      onClick={onClick}
      disabled={disabled}
      sx={{
        borderRadius: "12px",
        mb: 0.5,
        px: 2,
        py: 1.5,
        bgcolor: isSelected ? "action.selected" : "transparent",
        transition: "all 0.2s ease",
        "&:hover": {
          bgcolor: isSelected ? "action.selected" : "action.hover",
        },
        "&.Mui-disabled": {
          opacity: 0.6,
        },
      }}
    >
      <ListItemAvatar>
        <UserAvatar
          user={user}
          size={52}
          showOnlineBadge={showOnlineBadge}
          isOnline={isOnline}
        />
      </ListItemAvatar>

      <ListItemText
        sx={{ ml: 1.5 }}
        primary={
          <Typography
            fontWeight={600}
            fontSize={15}
            color="text.primary"
            noWrap
          >
            {user.name}
          </Typography>
        }
        secondary={
          secondaryText || (
            <Typography variant="body2" color="text.secondary" fontSize={13}>
              {user.phone_number}
            </Typography>
          )
        }
      />

      {rightContent && <Box sx={{ ml: 2 }}>{rightContent}</Box>}
    </ListItem>
  );
}
