const express = require('express');
const router = express.Router();
const canvasController = require('../controllers/canvas.controller');
const enterpriseAuth = require('../middlewares/enterpriseAuth.middleware');

/**
 * Enterprise Canvas (Visual Authentication) Routes
 * All routes require enterprise authentication
 */

// Require enterprise auth for all routes
router.use(enterpriseAuth);

// POST /api/enterprise/canvas/generate
// Generate new canvas grid for user authentication
// Body: { userId: string }
// Response: { gridId: string, grid: num[][], sessionTtl: number }
router.post('/generate', canvasController.generateGrid);

// POST /api/enterprise/canvas/verify
// Verify user's canvas grid selection
// Body: { gridId: string, userSelections: number[], timestamp: number }
// Response: { verified: boolean, score: number, timestamp: number }
router.post('/verify', canvasController.verifyGridResponse);

// GET /api/enterprise/canvas/sessions
// Get all active canvas sessions for user
router.get('/sessions', canvasController.getActiveSessions);

// DELETE /api/enterprise/canvas/sessions/:gridId
// Invalidate a canvas session
router.delete('/sessions/:gridId', canvasController.invalidateSession);

module.exports = router;
