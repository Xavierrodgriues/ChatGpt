const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");

// Import routes
const authRoutes = require("./routes/auth.route");
const chatRoutes = require("./routes/chat.route");

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

module.exports = app;