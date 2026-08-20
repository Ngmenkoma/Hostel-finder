require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

const logger = require("./src/utils/logger");
const { errorHandler, notFound } = require("./src/middleware/errorHandler");

const authRoutes = require("./src/routes/auth.routes");
const hostelsRoutes = require("./src/routes/hostels.routes");
const roomsRoutes = require("./src/routes/rooms.routes");
const bookingsRoutes = require("./src/routes/bookings.routes");

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json());

// Lightweight request log — lands in logs/combined.log for CloudWatch to ship.
app.use((req, res, next) => {
  res.on("finish", () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, { ip: req.ip });
  });
  next();
});

// Used by an EC2/ALB health check and by CloudWatch synthetic checks.
app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/hostels", hostelsRoutes);
app.use("/api/rooms", roomsRoutes);
app.use("/api/bookings", bookingsRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`GCTU Hostel Finder API listening on port ${PORT} (${process.env.NODE_ENV || "development"})`);
});

// Surface anything that slips past asyncHandler instead of dying silently.
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason: String(reason) });
});
