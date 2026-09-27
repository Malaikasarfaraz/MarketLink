require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const compression = require("compression");
const { securityHeaders, apiLimiter } = require("./middleware/securityMiddleware");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { verifyEmailConfiguration } = require("./services/emailService");
const Favorite = require("./models/Favorite");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(securityHeaders);
app.use(compression());

app.use(cors({
  origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",").map(s => s.trim()) : true,
  credentials: true
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(apiLimiter);
app.use(morgan("dev"));

// Never serve stale API GET responses. This keeps every frontend refresh button
// in sync with the current MongoDB state, even behind browser/proxy caches.
app.use((req, res, next) => {
  if (req.method === "GET") {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
  }
  next();
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "MarketLink API is running" });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/uploads", require("./routes/uploadRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/markets", require("./routes/marketRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/pickup-slots", require("./routes/pickupRoutes"));
app.use("/api/weekly-stock", require("./routes/weeklyStockRoutes"));
app.use("/api/favorites", require("./routes/favoriteRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/farmer", require("./routes/farmerRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    await Favorite.syncIndexes();
    server = app.listen(PORT, () => {
      console.log(`MarketLink API listening on port ${PORT}`);
      // Email verification never blocks or crashes the API.
      verifyEmailConfiguration().catch(error => console.error("[EMAIL] Verification error:", error.message));
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

let server;

async function startServer() {
  await start();
}

startServer();

process.on("SIGTERM", async () => {
  if (server) server.close();
  const mongoose = require("mongoose");
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
