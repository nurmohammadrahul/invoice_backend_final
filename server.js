const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// =============== CONFIGURATION ===============
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// =============== CORS ===============
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://vqs-invoice.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));

// Handle preflight requests
app.options('*', cors());

// =============== MIDDLEWARE ===============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============== DATABASE CONNECTION ===============
console.log('🔗 Connecting to MongoDB...');
console.log('Environment:', NODE_ENV);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice_system', {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully');
  console.log('📊 Database:', mongoose.connection.name);
  console.log('📍 Host:', mongoose.connection.host);
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  console.log('⚠️  Server will run in database-less mode for testing');
});

// Database connection state
const db = mongoose.connection;
db.on('error', console.error.bind(console, '❌ MongoDB connection error:'));
db.on('disconnected', () => console.log('⚠️  MongoDB disconnected'));
db.on('connected', () => console.log('✅ MongoDB connected'));
db.on('reconnected', () => console.log('🔄 MongoDB reconnected'));

// =============== TEST ENDPOINTS ===============
// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'VQS Invoice Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    database: db.readyState === 1 ? 'connected' : 'disconnected',
    endpoints: {
      auth: {
        checkAdminExists: 'GET /api/auth/check-admin-exists',
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        checkAdmin: 'GET /api/auth/check-admin (protected)'
      },
      invoices: {
        getAll: 'GET /api/invoices (protected)',
        create: 'POST /api/invoices (protected)'
      },
      health: 'GET /health',
      dbTest: 'GET /db-test'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      state: db.readyState,
      connected: db.readyState === 1,
      name: db.name
    },
    environment: NODE_ENV,
    memory: process.memoryUsage()
  });
});

// Database test
app.get('/db-test', async (req, res) => {
  try {
    const state = db.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    res.json({
      database: {
        state: states[state],
        readyState: state,
        connected: state === 1,
        host: db.host,
        name: db.name
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =============== SIMPLE TEST AUTH (NO DATABASE) ===============
// This works even if database is down
app.get('/api/auth/simple-check', (req, res) => {
  res.json({
    message: 'Auth endpoint is reachable',
    adminExists: false,
    timestamp: new Date().toISOString()
  });
});

// Simple login test
app.post('/api/auth/simple-login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  // For testing, accept any credentials
  res.json({
    message: 'Login successful (test mode)',
    token: 'test-jwt-token-12345',
    user: {
      username: username,
      name: 'Test User',
      role: 'admin',
      userId: 'test-user-id'
    },
    timestamp: new Date().toISOString()
  });
});

// =============== IMPORT ROUTES ===============
const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoices');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);

// =============== ERROR HANDLING ===============
// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /db-test',
      'GET /api/auth/simple-check',
      'POST /api/auth/simple-login',
      'GET /api/auth/check-admin-exists',
      'POST /api/auth/login',
      'POST /api/auth/register'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', {
    message: err.message,
    stack: NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// =============== START SERVER ===============
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📅 Started: ${new Date().toISOString()}`);
});

module.exports = app;