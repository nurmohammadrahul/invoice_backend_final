const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoices');

const app = express();

// ---- CORS CONFIGURATION ----
const allowedOrigins = [
  "http://localhost:3000",
  "https://vqs-invoice.vercel.app"
];

// Simple CORS configuration
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Accept', 'X-Requested-With']
}));

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});

// Add headers middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token, Accept, X-Requested-With');
  next();
});

app.use(express.json());

// ---- MongoDB Connection (FIXED) ----
console.log('🔗 Attempting MongoDB connection...');
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);

// ✅ CORRECT: Remove deprecated options for Mongoose 7+
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('✅ MongoDB Connected Successfully');
  console.log('📊 Database:', mongoose.connection.name);
  console.log('📍 Host:', mongoose.connection.host);
  console.log('🔌 Port:', mongoose.connection.port);
})
.catch((err) => {
  console.error('❌ MongoDB Connection Error:', err.message);
  console.error('Full error details:', {
    name: err.name,
    code: err.code,
    message: err.message
  });
  
  // Check if it's a common connection issue
  if (err.name === 'MongoServerSelectionError') {
    console.error('⚠️  MongoDB Server Selection Error - Check:');
    console.error('1. MongoDB Atlas IP whitelist (Network Access)');
    console.error('2. Database user credentials');
    console.error('3. MongoDB URI format');
  }
});

// Test database connection endpoint
app.get('/db-test', async (req, res) => {
  try {
    const connectionState = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    res.json({
      status: states[connectionState],
      readyState: connectionState,
      connected: connectionState === 1,
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ---- Health Check Endpoint ----
app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({
    status: "OK",
    serverTime: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbState === 1 ? "Connected" : "Disconnected",
      state: dbState,
      name: mongoose.connection.name,
      host: mongoose.connection.host
    },
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
});

// ---- Root Endpoint ----
app.get("/", (req, res) => {
  res.json({
    message: "VQS Invoice Backend API",
    version: "1.0.0",
    description: "Invoice Management System",
    endpoints: {
      auth: {
        checkAdminExists: "GET /api/auth/check-admin-exists",
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        checkAdmin: "GET /api/auth/check-admin (protected)",
        me: "GET /api/auth/me (protected)",
        changePassword: "POST /api/auth/change-password (protected)"
      },
      invoices: {
        getAll: "GET /api/invoices (protected)",
        getOne: "GET /api/invoices/:id (protected)",
        create: "POST /api/invoices (protected)",
        update: "PUT /api/invoices/:id (protected)",
        delete: "DELETE /api/invoices/:id (protected)"
      },
      system: {
        health: "GET /health",
        dbTest: "GET /db-test",
        root: "GET /"
      }
    },
    timestamp: new Date().toISOString()
  });
});

// ---- Routes ----
app.use("/api/auth", authRoutes);
app.use("/api/invoices", invoiceRoutes);

// ---- 404 Handler ----
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      "GET /",
      "GET /health",
      "GET /db-test",
      "POST /api/auth/login",
      "POST /api/auth/register",
      "GET /api/auth/check-admin-exists"
    ]
  });
});

// ---- Global Error Handler ----
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Send JSON error response
  res.status(err.status || 500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
});

// ---- Start Server ----
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`🔐 JWT Secret configured: ${process.env.JWT_SECRET ? 'Yes' : 'No (using fallback)'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📅 Server started at: ${new Date().toISOString()}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;