// api/server.js
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

// MongoDB connection
let isConnected = false; // prevent multiple connections in serverless
const connectDB = async () => {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGOODB_URI);
    isConnected = true;
    console.log('MongoDB connected');
  } catch (err) {
    console.log(err);
  }
};
connectDB();

// Export the app as a Vercel handler
module.exports = app;
