const express = require("express");
const dns = require("dns");
const compression = require("compression");
const dotenv = require("dotenv");

// Load environment variables before anything reads process.env.
dotenv.config();

const { validateEnv, isProduction } = require("./src/config/env");
const { applySecurity } = require("./src/middleware/security");
const { globalLimiter, authLimiter, expensiveLimiter } = require("./src/middleware/rateLimit");

const connectDB = require("./src/config/db");

const chatRoutes = require("./src/routes/chat.routes");
const mapRoute = require("./src/routes/locationRoute");
const authRoutes = require("./src/routes/auth.routes");
const adminRoutes = require("./src/routes/admin.routes");
const medicationRoutes = require("./src/routes/medication.routes");

const { startRefillCheckJob } = require("./src/jobs/refill-check.job");

// ===============================
// ENVIRONMENT
//
// Fail before binding a port rather than on the first request that needs a
// missing value — a process that starts and then 500s looks healthy to a
// deploy pipeline.
// ===============================
try {
    validateEnv();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}

const app = express();

const PORT = process.env.PORT || 5000;

// ===============================
// DNS CONFIGURATION
// For MongoDB Atlas SRV records
// ===============================
dns.setServers(["1.1.1.1", "8.8.8.8"]);

// ===============================
// SECURITY
//
// First in the chain: headers, CORS and the proxy setting have to be in place
// before any body is read or any route runs.
// ===============================
applySecurity(app);

// ===============================
// MIDDLEWARE
// ===============================

// The largest legitimate body here is a medication sync; 100kb is generous for
// that and stops an unauthenticated caller from making the process parse
// megabytes. Express defaults to 100kb for JSON but 'extended' urlencoded had
// no practical cap.
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.use(compression());

// A ceiling on everything. Per-route budgets below are tighter.
app.use(globalLimiter);

// ===============================
// ROOT / HEALTH
// ===============================
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Backend server is running",
    });
});

/**
 * Unauthenticated on purpose so a load balancer can call it, and deliberately
 * free of version, uptime and dependency detail — that is reconnaissance, and
 * a probe only needs to know whether to keep sending traffic.
 */
app.get("/health", (req, res) => {
    res.status(200).json({ success: true, message: "ok" });
});

// ===============================
// DATABASE
// ===============================
connectDB();

// ===============================
// API ROUTES
// ===============================

// Chat — every call spends Gemini and Google Places credit.
app.use("/api/v1/chat", expensiveLimiter, chatRoutes);

// Location / Maps — Nominatim's usage policy caps callers at ~1 req/s.
app.use("/api/v1/location", expensiveLimiter, mapRoute);

// Authentication — credential guessing is the threat here, not cost.
app.use("/api/v1/auth", authLimiter, authRoutes);

// Admin
app.use("/api/v1/admin", adminRoutes);

// Medication reminders (medications, schedules, dose logs, sync, refills)
app.use("/api/v1/medications", medicationRoutes);

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

    const status = err.status || 500;

    // A thrown error's message is written for a developer and routinely names
    // a driver, a file path or a query. Echo it only for 4xx, where it is a
    // deliberate message about the caller's own request.
    const message =
        status < 500
            ? err.message
            : isProduction()
                ? "Internal Server Error"
                : err.message || "Internal Server Error";

    res.status(status).json({ success: false, message });
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, "0.0.0.0", () => {
    console.log("=================================");
    console.log(`Server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Env: ${process.env.NODE_ENV || "development"}`);
    console.log(`CORS allowlist: ${process.env.ALLOWED_ORIGINS || "(none — dev fallback)"}`);
    console.log("=================================");

    // Started after the listener is up so a bad cron expression cannot stop
    // the API from serving. Dose reminders are NOT scheduled here — they fire
    // locally on each device; this only sweeps for low stock.
    startRefillCheckJob();
});
