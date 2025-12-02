const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://vqs-invoice.vercel.app',
  'https://invoice-backend-final.vercel.app'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ ADD HEALTH CHECK ENDPOINT
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.send('Server is running! API available at /api/health, /api/auth, /api/invoices');
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/invoices', require('./routes/invoices'));

// MongoDB connection with better error handling
const connectDB = async () => {
  try {
    // ✅ FIX THE TYPO: MONGODB_URI not MONGOODB_URI
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.log('MONGODB_URI exists?', !!process.env.MONGODB_URI);
    process.exit(1);
  }
};

// Connect to DB
connectDB();

// MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.log('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

// Add debug endpoint
app.get('/api/debug', (req, res) => {
  res.json({
    mongodbState: mongoose.connection.readyState,
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    envMongoDBUri: process.env.MONGODB_URI ? 'Set (first 20 chars): ' + process.env.MONGODB_URI.substring(0, 20) + '...' : 'Not set',
    nodeEnv: process.env.NODE_ENV,
    time: new Date().toISOString()
  });
});

// Export the app for serverless deployment
module.exports = app;