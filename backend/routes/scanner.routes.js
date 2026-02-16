const express = require('express');
const router = express.Router();
const scannerController = require('../controllers/scanner.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rateLimit = require('express-rate-limit');

// Phase 1: Threat Detection & Scanning

// Scanner-specific rate limiting
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30
});

// Analyze URL/link for threats
router.post('/analyze-url', authMiddleware, scanLimiter, scannerController.analyzeUrl);

// Analyze file (APK, PDF, etc.)
router.post('/analyze-file', authMiddleware, scanLimiter, scannerController.analyzeFile);

// Get scan results
router.get('/:scanId', authMiddleware, scannerController.getScanResult);

// Get scan history
router.get('/', authMiddleware, scannerController.getScanHistory);

// Re-scan URL/file
router.post('/:scanId/rescan', authMiddleware, scanLimiter, scannerController.rescanThreat);

// Get threat intelligence
router.get('/:scanId/intelligence', authMiddleware, scannerController.getThreatIntelligence);

// Threat statistics
router.get('/stats/daily', authMiddleware, scannerController.getDailyThreatStats);
router.get('/stats/threats', authMiddleware, scannerController.getThreatTypeStats);

module.exports = router;
