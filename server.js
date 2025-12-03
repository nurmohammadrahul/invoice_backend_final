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
    message: "Invoice Backend Running",
    time: new Date().toISOString()
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

// ---- Export for Vercel ----
module.exports = app;
