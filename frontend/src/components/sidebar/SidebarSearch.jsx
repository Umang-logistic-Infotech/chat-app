import { Box, InputBase, Paper } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

export default function SidebarSearch({ searchQuery, onSearchChange }) {
  return (
    <Paper
      elevation={0}
      sx={{
        display: "flex",
        alignItems: "center",
        bgcolor: "rgba(255,255,255,0.15)",
        backdropFilter: "blur(10px)",
        borderRadius: "12px",
        px: 2,
        py: 1,
        border: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      <SearchIcon
        sx={{ color: "rgba(255,255,255,0.7)", mr: 1, fontSize: 20 }}
      />
      <InputBase
        placeholder="Search conversations..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{
          flex: 1,
          fontSize: "0.9rem",
          color: "white",
          "& ::placeholder": { color: "rgba(255,255,255,0.7)" },
        }}
      />
    </Paper>
  );
}
