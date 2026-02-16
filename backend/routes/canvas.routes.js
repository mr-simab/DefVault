const express = require('express');
const router = express.Router();
const canvasController = require('../controllers/canvas.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rateLimit = require('express-rate-limit');

// Canvas grid-specific rate limiting
const canvasLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30
});

// Phase 3: Canvas Grid Authentication
// Generate randomized grid for user
router.post('/generate', authMiddleware, canvasLimiter, canvasController.generateGrid);

// Get grid metadata (after generation)
router.get('/:gridSessionId', authMiddleware, canvasController.getGrid);

// Verify user's icon selection
router.post('/:gridSessionId/verify', authMiddleware, canvasController.verifySelection);

// Get canvas session status
router.get('/:gridSessionId/status', authMiddleware, canvasController.getGridStatus);

module.exports = router;
