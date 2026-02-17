import {
  Box,
  Paper,
  TextField,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import CloseIcon from "@mui/icons-material/Close";
import { useState, useRef } from "react";

export default function MessageInput({
  selectedChat,
  onSendTextMessage,
  onSendImageMessage,
}) {
  const [inputText, setInputText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);

  const isGroupChat = selectedChat?.type === "group";

  // ─── Handle Text Send ───────────────────────────────────────────────────────
  const handleSendText = () => {
    if (!inputText.trim()) return;
    onSendTextMessage(inputText.trim());
    setInputText("");
  };

  // ─── Handle Image Selection ─────────────────────────────────────────────────
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));

    // Reset file input so same file can be selected again
    e.target.value = "";
  };

  // ─── Handle Image Send ──────────────────────────────────────────────────────
  const handleSendImage = () => {
    if (!imageFile) return;
    onSendImageMessage(imageFile);
    setImageFile(null);
    setImagePreview(null);
  };

  // ─── Cancel Image Preview ───────────────────────────────────────────────────
  const handleCancelImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // ─── Handle Enter Key ───────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 0,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        bgcolor: "background.paper",
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      {/* Image Preview */}
      {imagePreview && (
        <Box
          sx={{
            position: "relative",
            display: "inline-flex",
            alignSelf: "flex-start",
            ml: 1,
          }}
        >
          <Box
            component="img"
            src={imagePreview}
            alt="preview"
            sx={{
              width: 120,
              height: 120,
              objectFit: "cover",
              borderRadius: "12px",
              border: "2px solid",
              borderColor: "primary.main",
            }}
          />
          {/* Cancel Button */}
          <IconButton
            size="small"
            onClick={handleCancelImage}
            sx={{
              position: "absolute",
              top: -8,
              right: -8,
              bgcolor: "error.main",
              color: "white",
              width: 22,
              height: 22,
              "&:hover": { bgcolor: "error.dark" },
            }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
          {/* File name */}
          <Typography
            variant="caption"
            sx={{
              position: "absolute",
              bottom: -20,
              left: 0,
              right: 0,
              textAlign: "center",
              color: "text.secondary",
              fontSize: "0.65rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {imageFile?.name}
          </Typography>
        </Box>
      )}

      {/* Input Row */}
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end" }}>
        {/* Emoji Button */}
        <Tooltip title="Emoji">
          <IconButton color="primary" size="medium">
            <EmojiEmotionsIcon />
          </IconButton>
        </Tooltip>

        {/* Attach File Button */}
        <Tooltip title="Attach image">
          <IconButton
            color="primary"
            size="medium"
            onClick={() => fileInputRef.current?.click()}
          >
            <AttachFileIcon />
          </IconButton>
        </Tooltip>

        {/* Hidden File Input */}
        <input
          type="file"
          accept="image/*"
          hidden
          ref={fileInputRef}
          onChange={handleImageSelect}
        />

        {/* Text Input */}
        {!imagePreview && (
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder={isGroupChat ? "Message group..." : "Type a message..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "24px",
                bgcolor: "#f5f7fa",
                "& fieldset": { border: "none" },
                "&:hover": { bgcolor: "#eef1f5" },
                "&.Mui-focused": {
                  bgcolor: "white",
                  boxShadow: "0 0 0 2px rgba(102, 126, 234, 0.2)",
                },
              },
            }}
          />
        )}

        {/* Send Button */}
        <IconButton
          onClick={imagePreview ? handleSendImage : handleSendText}
          disabled={!inputText.trim() && !imagePreview}
          sx={{
            width: 48,
            height: 48,
            background:
              inputText.trim() || imagePreview
                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                : "action.disabledBackground",
            color: "white",
            "&:hover": {
              background:
                inputText.trim() || imagePreview
                  ? "linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)"
                  : "action.disabledBackground",
            },
            "&.Mui-disabled": {
              bgcolor: "action.disabledBackground",
              color: "action.disabled",
            },
          }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}
