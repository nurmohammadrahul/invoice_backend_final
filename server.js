const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://vqs-invoice.vercel.app',
    'https://invoice-backend-final.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ✅ HEALTH CHECK - Simple endpoint that always works
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ✅ ROOT ENDPOINT
app.get('/', (req, res) => {
  res.json({
    message: 'Invoice Backend API',
    endpoints: [
      'GET /api/health',
      'POST /api/auth/login',
      'POST /api/auth/init',
      'GET /api/auth/status'
    ]
  });
});

// ✅ SIMPLE TEST ENDPOINT (No database required)
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'API is working without database!',
    timestamp: new Date().toISOString()
  });
});

// ✅ LOAD ROUTES WITH ERROR HANDLING
try {
  console.log('🔧 Loading auth routes...');
  const authRouter = require('./routes/auth');
  app.use('/api/auth', authRouter);
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Failed to load auth routes:', error.message);
  
  // Fallback auth routes
  app.post('/api/auth/login', (req, res) => {
    res.status(503).json({ 
      error: 'Auth system is being set up',
      message: 'Please try the /api/auth/init endpoint first'
    });
  });
  
  app.post('/api/auth/init', (req, res) => {
    res.json({ 
      message: 'Use the init endpoint to create admin user',
      note: 'Make sure MongoDB is connected'
    });
  });
}

try {
  console.log('🔧 Loading invoice routes...');
  const invoicesRouter = require('./routes/invoices');
  app.use('/api/invoices', invoicesRouter);
  console.log('✅ Invoice routes loaded');
} catch (error) {
  console.error('❌ Failed to load invoice routes:', error.message);
  
  // Fallback invoice routes
  app.get('/api/invoices/test', (req, res) => {
    res.json({ 
      message: 'Invoice system is being set up',
      timestamp: new Date().toISOString()
    });
  });
}

// ✅ DATABASE CONNECTION (Non-blocking)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully');
})
.catch(err => {
  console.log('⚠️ MongoDB Connection Failed:', err.message);
  console.log('⚠️ Running in database-less mode. Some features may be limited.');
});

// ✅ ERROR HANDLING MIDDLEWARE
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// ✅ 404 HANDLER
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    availableRoutes: ['/', '/api/health', '/api/test', '/api/auth', '/api/invoices']
  });
});

// ✅ EXPORT FOR VERCEL (Must be the last line)
module.exports = app;