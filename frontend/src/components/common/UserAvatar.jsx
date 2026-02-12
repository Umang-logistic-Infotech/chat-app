import { Avatar, Badge } from "@mui/material";

export default function UserAvatar({
  user,
  size = 52,
  showOnlineBadge = false,
  isOnline = false,
}) {
  const AvatarComponent = (
    <Avatar
      src={user?.profile_photo || ""}
      sx={{
        width: size,
        height: size,
        bgcolor: "primary.main",
        fontWeight: 600,
        fontSize: size > 50 ? "1.2rem" : "1rem",
      }}
    >
      {!user?.profile_photo && user?.name?.charAt(0).toUpperCase()}
    </Avatar>
  );

  if (showOnlineBadge) {
    return (
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        variant="dot"
        invisible={!isOnline}
        sx={{
          "& .MuiBadge-badge": {
            bgcolor: "#44b700",
            width: 12,
            height: 12,
            borderRadius: "50%",
            border: "2px solid white",
            boxShadow: "0 0 0 1px #44b700",
          },
        }}
      >
        {AvatarComponent}
      </Badge>
    );
  }

  return AvatarComponent;
}
