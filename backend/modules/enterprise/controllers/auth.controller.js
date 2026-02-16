const bcrypt = require('bcrypt');
const logger = require('../../config/logger');
const User = require('../../models/User.model');

/**
 * Enterprise Authentication Controller
 * Handles login, registration, and session management
 */

exports.register = async (req, res, next) => {
  try {
    const { email, password, username, clientName } = req.body;

    // Validation
    if (!email || !password || !username || !clientName) {
      return res.status(400).json({
        error: 'Missing required fields',
        code: 'INVALID_INPUT',
        fields: { email: !email, password: !password, username: !username, clientName: !clientName }
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered',
        code: 'EMAIL_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with enterprise account type
    const newUser = new User({
      email,
      password: hashedPassword,
      username,
      clientName,
      accountType: 'enterprise',
      module: 'enterprise',
      createdAt: new Date()
    });

    await newUser.save();

    logger.info(`Enterprise user registered: ${email}`, {
      module: 'enterprise',
      controller: 'auth',
      action: 'register'
    });

    res.status(201).json({
      message: 'Enterprise account created successfully',
      userId: newUser._id,
      email: newUser.email
    });
  } catch (error) {
    logger.error('Enterprise registration error', { error: error.message, stack: error.stack });
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password required',
        code: 'INVALID_INPUT'
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'LOGIN_FAILED'
      });
    }

    // Verify account type
    if (user.accountType !== 'enterprise') {
      return res.status(403).json({
        error: 'This account is not an enterprise account',
        code: 'ENTERPRISE_ONLY'
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'LOGIN_FAILED'
      });
    }

    logger.info(`Enterprise user logged in: ${email}`, {
      module: 'enterprise',
      controller: 'auth',
      action: 'login'
    });

    res.status(200).json({
      message: 'Login successful',
      userId: user._id,
      email: user.email,
      username: user.username,
      clientName: user.clientName,
      accountType: 'enterprise'
    });
  } catch (error) {
    logger.error('Enterprise login error', { error: error.message });
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    logger.info(`Enterprise user logged out: ${req.user.email}`, {
      module: 'enterprise',
      controller: 'auth',
      action: 'logout'
    });

    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    logger.error('Enterprise logout error', { error: error.message });
    next(error);
  }
};

exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        clientName: user.clientName,
        accountType: user.accountType,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error('Error fetching current user', { error: error.message });
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required',
        code: 'MISSING_TOKEN'
      });
    }

    // TODO: Implement token refresh logic with JWT config
    res.status(200).json({ message: 'Token refreshed' });
  } catch (error) {
    logger.error('Token refresh error', { error: error.message });
    next(error);
  }
};
