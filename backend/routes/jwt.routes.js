const express = require('express');
const router = express.Router();
const jwtController = require('../controllers/jwt.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Phase 4: JWT Handshake (Cryptographic Security)

// Issue JWT token (after successful Canvas verification)
router.post('/issue', authMiddleware, jwtController.issueToken);

// Verify JWT token (called by partner bank)
router.post('/verify', jwtController.verifyToken);

// Refresh token (for long-lived sessions)
router.post('/refresh', authMiddleware, jwtController.refreshToken);

// Revoke token (logout or security incident)
router.post('/:jti/revoke', authMiddleware, jwtController.revokeToken);

// Get token metadata
router.get('/:jti/status', authMiddleware, jwtController.getTokenStatus);

module.exports = router;
