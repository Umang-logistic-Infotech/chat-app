import { Box, Typography } from "@mui/material";

export default function SidebarHeader({ children }) {
  return (
    <Box
      sx={{
        px: 3,
        py: 3,
        borderBottom: "1px solid",
        borderColor: "divider",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="h5" fontWeight={700} color="white">
          Chats
        </Typography>
      </Box>

      {children}
    </Box>
  );
}
