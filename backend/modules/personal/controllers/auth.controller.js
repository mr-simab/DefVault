const bcrypt = require('bcrypt');
const logger = require('../../config/logger');
const User = require('../../models/User.model');

/**
 * Personal Module Authentication Controller
 * Handles user registration, login, and password management
 */

exports.register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Missing required fields: email, password, name',
        code: 'INVALID_INPUT',
        fields: { email: !email, password: !password, name: !name }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters',
        code: 'WEAK_PASSWORD'
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

    // Create user with personal account type
    const newUser = new User({
      email,
      password: hashedPassword,
      name,
      accountType: 'personal',
      module: 'personal',
      gmailConnected: false,
      createdAt: new Date()
    });

    await newUser.save();

    logger.info(`Personal user registered: ${email}`, {
      module: 'personal',
      controller: 'auth',
      action: 'register'
    });

    res.status(201).json({
      message: 'Account created successfully',
      userId: newUser._id,
      email: newUser.email,
      accountType: 'personal'
    });
  } catch (error) {
    logger.error('Personal registration error', { error: error.message });
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
    if (user.accountType !== 'personal') {
      return res.status(403).json({
        error: 'This account is not a personal account',
        code: 'PERSONAL_ONLY'
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

    logger.info(`Personal user logged in: ${email}`, {
      module: 'personal',
      controller: 'auth',
      action: 'login'
    });

    res.status(200).json({
      message: 'Login successful',
      userId: user._id,
      email: user.email,
      name: user.name,
      accountType: 'personal',
      gmailConnected: user.gmailConnected
    });
  } catch (error) {
    logger.error('Personal login error', { error: error.message });
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    logger.info(`Personal user logged out: ${req.user.email}`, {
      module: 'personal',
      controller: 'auth',
      action: 'logout'
    });

    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    logger.error('Personal logout error', { error: error.message });
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
        name: user.name,
        accountType: user.accountType,
        gmailConnected: user.gmailConnected || false,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error('Error fetching current user', { error: error.message });
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: 'Current password, new password, and confirmation required',
        code: 'INVALID_INPUT'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: 'New passwords do not match',
        code: 'PASSWORD_MISMATCH'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters',
        code: 'WEAK_PASSWORD'
      });
    }

    // Get user and verify current password
    const user = await User.findById(userId);
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Current password is incorrect',
        code: 'AUTH_FAILED'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await user.save();

    logger.info(`Personal user changed password: ${user.email}`, {
      module: 'personal',
      controller: 'auth',
      action: 'change-password'
    });

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Password change error', { error: error.message });
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
