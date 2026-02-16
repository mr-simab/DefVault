const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const personalAuth = require('../middlewares/personalAuth.middleware');

/**
 * Personal Module Authentication Routes
 * User registration, login, and OAuth setup
 */

// POST /api/personal/auth/register
// Register new personal user account
// Body: { email: string, password: string, name: string }
router.post('/register', authController.register);

// POST /api/personal/auth/login
// Login personal user (email/password)
// Body: { email: string, password: string }
router.post('/login', authController.login);

// POST /api/personal/auth/logout
// Logout personal user (requires auth)
router.post('/logout', personalAuth, authController.logout);

// GET /api/personal/auth/me
// Get current authenticated personal user
router.get('/me', personalAuth, authController.getCurrentUser);

// POST /api/personal/auth/refresh-token
// Refresh JWT token
router.post('/refresh-token', authController.refreshToken);

// POST /api/personal/auth/change-password
// Change user password (requires auth)
router.post('/change-password', personalAuth, authController.changePassword);

module.exports = router;
