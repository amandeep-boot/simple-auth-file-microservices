import fetch from 'node-fetch';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please include Authorization: Bearer header'
      });
    }

    // Call Auth Service's validate endpoint
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/validate`, {
      headers: {
        'Authorization': authHeader
      }
    });

    if (!response.ok) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Please login again to get a new token'
      });
    }

    const data = await response.json();
    
    // Attach user data to request
    req.userId = data.data.user.id;
    next();
  } catch (error) {
    console.error('Auth validation error:', error);
    res.status(500).json({ 
      error: 'Authentication service error',
      message: 'Please try again later'
    });
  }
};

export { authenticateToken };
