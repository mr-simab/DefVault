const logger = require('../../../config/logger');

/**
 * Enterprise Authentication Middleware
 * Validates enterprise-specific JWT tokens
 * Uses session-scoped binding without device fingerprinting
 */
const enterpriseAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'Enterprise authentication required',
        code: 'ENTERPRISE_AUTH_REQUIRED'
      });
    }

    // Verify JWT
    const jwt = require('jsonwebtoken');
    const jwtConfig = require('../../../config/jwt');
    
    const decoded = jwt.verify(token, jwtConfig.secret);
    
    // Ensure user belongs to enterprise
    if (decoded.accountType !== 'enterprise') {
      return res.status(403).json({ 
        error: 'Enterprise access required',
        code: 'ENTERPRISE_ONLY'
      });
    }

    req.user = decoded;
    req.accountType = 'enterprise';
    next();
  } catch (error) {
    logger.error('Enterprise auth middleware error:', error);
    res.status(401).json({ 
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
};

module.exports = enterpriseAuth;
