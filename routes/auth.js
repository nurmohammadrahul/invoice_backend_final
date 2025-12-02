const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

// Create admin user if not exists (FIXED VERSION)
router.post('/init', async (req, res) => {
  try {
    console.log('🔄 Checking for admin user...');
    
    const adminExists = await User.findOne({ username: 'admin' });
    if (adminExists) {
      console.log('✅ Admin user already exists');
      return res.json({ message: 'Admin user already exists' });
    }

    // Hash password before creating user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = new User({
      username: 'admin',
      password: hashedPassword, // Already hashed
      role: 'admin'
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully');
    res.json({ message: 'Admin user created successfully' });
    
  } catch (error) {
    console.error('❌ Error in init:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Login attempt for username:', username);

    const user = await User.findOne({ username });
    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Password mismatch for user:', username);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful for user:', username);
    res.json({ 
      token, 
      username: user.username,
      name: user.name 
    });
    
  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug route to see all users (optional)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    console.log('📊 Users in database:', users.length);
    res.json({ 
      totalUsers: users.length,
      users: users 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;