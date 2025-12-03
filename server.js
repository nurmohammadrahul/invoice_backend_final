const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ SIMPLE CORS CONFIGURATION (Works with Express 4)
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://vqs-invoice.vercel.app',
    'https://invoice-backend-final.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Handle preflight requests
app.options('*', cors());  // This works in Express 4

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ SIMPLE ROUTES (Always work)
app.get('/', (req, res) => {
  res.json({ 
    message: 'Invoice Backend API',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'Test endpoint works!',
    cors: 'Enabled',
    timestamp: new Date().toISOString()
  });
});

// ✅ DATABASE CONNECTION
console.log('🔗 Connecting to MongoDB...');
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected');
})
.catch((err) => {
  console.log('⚠️ MongoDB connection failed:', err.message);
});

// ✅ LOAD ROUTES
setTimeout(() => {
  console.log('📦 Loading routes...');
  
  try {
    // Auth routes
    const authRouter = require('./routes/auth');
    app.use('/api/auth', authRouter);
    console.log('✅ Auth routes loaded');
  } catch (error) {
    console.error('❌ Auth routes failed:', error.message);
    
    // Fallback auth endpoints
    app.post('/api/auth/login', (req, res) => {
      res.status(200).json({ 
        message: 'Auth endpoint (fallback)',
        token: 'demo-token-for-testing' 
      });
    });
  }
  
  try {
    // Invoice routes
    const invoicesRouter = require('./routes/invoices');
    app.use('/api/invoices', invoicesRouter);
    console.log('✅ Invoice routes loaded');
  } catch (error) {
    console.error('❌ Invoice routes failed:', error.message);
    
    // Fallback invoice endpoints
    app.get('/api/invoices', (req, res) => {
      res.json({ 
        message: 'Invoice system loading...',
        data: [] 
      });
    });
  }
}, 1000);

// ✅ ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// ✅ 404 HANDLER (Simplified)
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    available: ['/', '/api/health', '/api/test', '/api/auth/login', '/api/invoices']
  });
});

// ✅ SERVER START
const PORT = process.env.PORT || 5000;

// For local development
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🌐 CORS enabled`);
    console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
  });
}

// Export for Vercel
module.exports = app;