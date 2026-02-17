import { Box, Typography } from "@mui/material";

export default function EmptyChatArea() {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#fafbfc",
        gap: 3,
      }}
    >
      <Box
        sx={{
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 70,
          boxShadow: "0 10px 30px rgba(102, 126, 234, 0.3)",
        }}
      >
        💬
      </Box>
      <Box sx={{ textAlign: "center" }}>
        <Typography
          variant="h4"
          fontWeight={700}
          color="text.primary"
          gutterBottom
        >
          Welcome to Chat
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 400 }}
        >
          Select a conversation from the sidebar to start messaging
        </Typography>
      </Box>
    </Box>
  );
}
