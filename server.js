const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoices');

const app = express();

// ---- CORS ----
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://vqs-invoice.vercel.app"
  ],
  credentials: true,
}));

app.use(express.json());

// ---- Root Route ----
app.get("/", (req, res) => {
  res.json({
    message: "VQS Invoice Backend Running",
    version: "1.0.0",
    time: new Date().toISOString(),
    endpoints: {
      auth: "/api/auth",
      invoices: "/api/invoices"
    }
  });
});

// ---- Health Check ----
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    timestamp: new Date().toISOString()
  });
});

// ---- MongoDB ----
let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ DB Error:", err.message);
  }
}

connectDB();

// ---- Routes ----
app.use("/api/auth", authRoutes);
app.use("/api/invoices", invoiceRoutes);

// ---- 404 ----
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

// ---- Error Handling ----
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ---- Start Server ----
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

// ---- Export for Vercel ----
module.exports = app;