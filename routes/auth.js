const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Check if admin exists (public - no auth required)
const checkAdminExists = async () => {
  try {
    return await User.findOne({ role: 'admin' });
  } catch (error) {
    console.error('Error checking admin exists:', error);
    throw error;
  }
};

// =============== PUBLIC ENDPOINTS ===============

// Check if admin exists - PUBLIC
router.get('/check-admin-exists', async (req, res) => {
  try {
    console.log('🔍 Checking if admin exists...');
    const adminExists = await checkAdminExists();
    console.log('Admin exists result:', adminExists ? 'Yes' : 'No');
    
    res.json({ 
      adminExists: !!adminExists,
      message: adminExists ? 'Admin exists, please login' : 'No admin found, please register'
    });
    
  } catch (error) {
    console.error('💥 Check admin exists error:', error.message);
    console.error('Full error:', error);
    
    res.status(500).json({ 
      error: 'Server error while checking admin status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Admin Registration - PUBLIC
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, email } = req.body;
    
    console.log('📝 Admin registration attempt:', {
      username,
      hasName: !!name,
      hasEmail: !!email
    });

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Username already exists',
        code: 'USER_EXISTS'
      });
    }

    // Check if admin already exists
    const adminExists = await checkAdminExists();
    if (adminExists) {
      return res.status(400).json({ 
        error: 'Admin already exists. Cannot register another admin.',
        code: 'ADMIN_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create admin user
    const newAdmin = new User({
      username,
      password: hashedPassword,
      role: 'admin',
      name: name || username,
      email: email || `${username}@vqs.com`
    });

    await newAdmin.save();
    
    console.log('✅ Admin registered successfully:', username);
    
    // Generate token
    const token = jwt.sign(
      { 
        userId: newAdmin._id, 
        username: newAdmin.username,
        role: newAdmin.role 
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({ 
      message: 'Admin registered successfully',
      token,
      user: {
        id: newAdmin._id,
        username: newAdmin.username,
        name: newAdmin.name,
        role: newAdmin.role,
        email: newAdmin.email
      }
    });
    
  } catch (error) {
    console.error('💥 Admin registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Login route - PUBLIC
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 Login attempt for username:', username);

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required',
        code: 'VALIDATION_ERROR'
      });
    }

    const user = await User.findOne({ username });
    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(400).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    if (!user.isActive) {
      return res.status(400).json({ 
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Password mismatch for user:', username);
      return res.status(400).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username,
        role: user.role 
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful:', {
      username: user.username,
      role: user.role,
      userId: user._id
    });

    res.json({ 
      token, 
      username: user.username,
      name: user.name,
      role: user.role,
      userId: user._id,
      email: user.email
    });
    
  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// =============== PROTECTED ENDPOINTS ===============

// Check current user's admin status - PROTECTED
router.get('/check-admin', authMiddleware, async (req, res) => {
  try {
    console.log('🔐 Check-admin endpoint accessed by user:', req.user);
    
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      console.log('❌ User not found in database:', req.user.userId);
      return res.status(404).json({ 
        isAdmin: false, 
        message: 'User account not found.',
        error: 'USER_NOT_FOUND'
      });
    }
    
    console.log('✅ User found:', {
      username: user.username,
      role: user.role,
      email: user.email
    });
    
    res.json({ 
      isAdmin: user.role === 'admin',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.name || user.username
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Check admin error:', error);
    res.status(500).json({ 
      isAdmin: false, 
      message: 'Server error while checking admin status',
      error: 'SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// Get current user info - PROTECTED
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    res.json(user);
  } catch (error) {
    console.error('💥 Get user error:', error);
    res.status(500).json({ 
      error: 'Failed to get user info',
      message: error.message
    });
  }
});

// Change password - PROTECTED
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Find user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Current password and new password are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        error: 'Current password is incorrect',
        code: 'INVALID_PASSWORD'
      });
    }

    // Check if new password is same as old
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ 
        error: 'New password must be different from current password',
        code: 'SAME_PASSWORD'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    user.password = hashedNewPassword;
    await user.save();

    console.log('✅ Password changed successfully for user:', user.username);
    
    res.json({ 
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('💥 Change password error:', error);
    res.status(500).json({ 
      error: 'Failed to change password',
      message: error.message
    });
  }
});

module.exports = router;