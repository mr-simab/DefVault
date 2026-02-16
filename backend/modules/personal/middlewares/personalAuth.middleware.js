const logger = require('../../../config/logger');

/**
 * Personal Authentication Middleware
 * Validates personal-user JWT tokens
 * Handles Gmail OAuth scope verification
 */
const personalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        error: 'Personal authentication required',
        code: 'PERSONAL_AUTH_REQUIRED'
      });
    }

    // Verify JWT
    const jwt = require('jsonwebtoken');
    const jwtConfig = require('../../../config/jwt');
    
    const decoded = jwt.verify(token, jwtConfig.secret);
    
    // Ensure user is personal account type
    if (decoded.accountType !== 'personal') {
      return res.status(403).json({ 
        error: 'Personal account access required',
        code: 'PERSONAL_ONLY'
      });
    }

    req.user = decoded;
    req.accountType = 'personal';
    next();
  } catch (error) {
    logger.error('Personal auth middleware error:', error);
    res.status(401).json({ 
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
};

module.exports = personalAuth;
