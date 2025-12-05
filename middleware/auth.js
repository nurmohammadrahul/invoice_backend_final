const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Also check x-auth-token header
      token = req.header('x-auth-token');
    }
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ 
        error: 'No authentication token provided. Please log in.',
        code: 'NO_TOKEN'
      });
    }

    console.log('🔑 Token received (first 20 chars):', token.substring(0, 20) + '...');
    
    // Verify token with fallback secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    
    console.log('✅ Token verified for user:', decoded.userId);
    
    // Add user info to request object
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid authentication token. Please log in again.',
        code: 'INVALID_TOKEN'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Authentication token has expired. Please log in again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    res.status(401).json({ 
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

module.exports = auth;