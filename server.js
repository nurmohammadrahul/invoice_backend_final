const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoices');

const app = express();

// =============== CONFIGURATION ===============
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// =============== MIDDLEWARE ===============
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://vqs-invoice.vercel.app',
    'https://invoice-frontend-final.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));
app.options('*', cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============== DATABASE CONNECTION ===============
console.log('🔗 Connecting to MongoDB...');
console.log('Environment:', NODE_ENV);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice_system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
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
  console.log('⚠️  Server running without database connection');
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, '❌ MongoDB connection error:'));
db.on('disconnected', () => console.log('⚠️  MongoDB disconnected'));
db.on('connected', () => console.log('✅ MongoDB connected'));
db.on('reconnected', () => console.log('🔄 MongoDB reconnected'));

// =============== HEALTH CHECK ===============
app.get('/', (req, res) => {
  res.json({
    message: 'VQS Invoice Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    database: db.readyState === 1 ? 'connected' : 'disconnected',
    environment: NODE_ENV
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      state: ['disconnected', 'connected', 'connecting', 'disconnecting'][db.readyState],
      connected: db.readyState === 1
    },
    environment: NODE_ENV
  });
});

// =============== ROUTES ===============
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);

// =============== ERROR HANDLING ===============
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

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