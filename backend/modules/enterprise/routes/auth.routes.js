const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const enterpriseAuth = require('../middlewares/enterpriseAuth.middleware');

/**
 * Enterprise Authentication Routes
 * All routes require accountType === 'enterprise'
 */

// POST /api/enterprise/auth/login
// Login for enterprise client accounts
router.post('/login', authController.login);

// POST /api/enterprise/auth/register
// Register new enterprise client account
router.post('/register', authController.register);

// POST /api/enterprise/auth/logout
// Logout enterprise user (requires auth)
router.post('/logout', enterpriseAuth, authController.logout);

// GET /api/enterprise/auth/me
// Get current authenticated enterprise user
router.get('/me', enterpriseAuth, authController.getCurrentUser);

// POST /api/enterprise/auth/refresh-token
// Refresh JWT token
router.post('/refresh-token', authController.refreshToken);

module.exports = router;
