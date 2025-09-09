const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files (public folder)
app.use(express.static(path.join(__dirname, "public")));

// Route for index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Store users (socketId → { nickname, color })
const users = {};
const messages = []; // chat history (last 20 messages)

// Update user list for everyone
function updateUserList() {
  io.emit("user list", Object.values(users));
}

// Handle socket.io connections
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // Send chat history to new user
  socket.emit("chat history", messages);

  // Handle nickname
  socket.on("set nickname", ({ nickname, color }) => {
    users[socket.id] = { nickname: nickname || "Anonymous", color: color || "#000000" };
    io.emit("user joined", users[socket.id].nickname);
    updateUserList();
  });

  // Handle new message
  socket.on("chat message", (msg) => {
    const user = users[socket.id] || { nickname: "Anonymous", color: "#000000" };
    const message = {
      nickname: user.nickname,
      color: user.color,
      msg,
      timestamp: Date.now(),
    };

    // Save last 20 messages
    messages.push(message);
    if (messages.length > 20) messages.shift();

    io.emit("chat message", message);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    if (users[socket.id]) {
      io.emit("user left", users[socket.id].nickname);
      delete users[socket.id];
      updateUserList();
    }
    console.log("❌ User disconnected:", socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
