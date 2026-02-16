const express = require('express');
const router = express.Router();
const jwtController = require('../controllers/jwt.controller');
const enterpriseAuth = require('../middlewares/enterpriseAuth.middleware');

/**
 * Enterprise JWT Token Routes
 * Token issuance and management for enterprise clients
 */

// POST /api/enterprise/jwt/issue-token
// Issue new JWT token after successful canvas verification
// Body: { gridId: string, gridScore: number, metadata: object }
// Response: { token: string, expiresIn: number, tokenType: 'Bearer' }
router.post('/issue-token', enterpriseAuth, jwtController.issueToken);

// POST /api/enterprise/jwt/verify-token
// Verify if a JWT token is valid
// Body: { token: string }
// Response: { valid: boolean, decoded: object, expiresIn: number }
router.post('/verify-token', enterpriseAuth, jwtController.verifyToken);

// POST /api/enterprise/jwt/revoke-token
// Revoke/blacklist a JWT token
// Body: { token: string }
router.post('/revoke-token', enterpriseAuth, jwtController.revokeToken);

// GET /api/enterprise/jwt/token-info
// Get information about current token
router.get('/token-info', enterpriseAuth, jwtController.getTokenInfo);

module.exports = router;
