const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/invoices', require('./routes/invoices'));

// Root route
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// MongoDB connection (prevent multiple connections in serverless)
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGOODB_URI);
    isConnected = true;
    console.log('MongoDB connected');
  } catch (err) {
    console.error(err);
  }
};
connectDB();

// Export the app for serverless deployment
module.exports = app;
