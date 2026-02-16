const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const jwtConfig = require('../config/jwt');
const logger = require('../config/logger');

exports.register = async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username required' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    logger.info(`User registered: ${email}`);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      code: 'REGISTRATION_ERROR',
      message: 'Unable to complete registration. Please try again.'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const token = jwt.sign(
      { userId: 'user_id', email: email },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
    
    logger.info(`User logged in: ${email}`);
    res.status(200).json({ token, user: { email } });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      code: 'LOGIN_ERROR',
      message: 'Authentication service temporarily unavailable'
    });
  }
};

exports.logout = async (req, res) => {
  try {
    logger.info(`User logged out: ${req.user?.id}`);
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    res.status(200).json({ valid: true, user: req.user });
  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }
    
    const newToken = jwt.sign(
      { userId: 'user_id' },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
    
    res.status(200).json({ token: newToken });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ 
      error: 'Token refresh failed',
      code: 'TOKEN_REFRESH_ERROR'
    });
  }
};
