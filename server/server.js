const express = require("express");
const dns = require("dns");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./src/config/db");

const chatRoutes = require("./src/routes/chat.routes");
const mapRoute = require("./src/routes/locationRoute");
const authRoutes = require("./src/routes/auth.routes");
const adminRoutes = require("./src/routes/admin.routes");

// Load environment variables
dotenv.config();

const app = express();

// ===============================
// PORT
// ===============================
const PORT = process.env.PORT || 5000;

// ===============================
// DNS CONFIGURATION
// For MongoDB Atlas SRV records
// ===============================
dns.setServers(["1.1.1.1", "8.8.8.8"]);

// ===============================
// MIDDLEWARE
// ===============================

// Parse JSON request body
app.use(express.json());

// Parse URL encoded data
app.use(express.urlencoded({ extended: true }));

// ===============================
// CORS
// Allow requests from all frontends
// ===============================
app.use(cors());

// Handle preflight requests
app.options(/.*/, cors());

// ===============================
// ROOT ROUTE
// ===============================
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Backend server is running",
    });
});

// ===============================
// DATABASE
// ===============================
connectDB();

// ===============================
// API ROUTES
// ===============================

// Chat
app.use("/api/v1/chat", chatRoutes);

// Location / Maps
app.use("/api/v1/location", mapRoute);

// Authentication
app.use("/api/v1/auth", authRoutes);

// Admin
app.use("/api/v1/admin", adminRoutes);

// ===============================
// 404 HANDLER
// ===============================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

// ===============================
// GLOBAL ERROR HANDLER
// ===============================
app.use((err, req, res, next) => {
    console.error("Server Error:", err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, "0.0.0.0", () => {
    console.log("=================================");
    console.log(`Server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log("CORS: All origins allowed");
    console.log("=================================");
});