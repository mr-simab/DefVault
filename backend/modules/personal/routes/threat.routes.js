const express = require('express');
const router = express.Router();
const threatController = require('../controllers/threat.controller');
const personalAuth = require('../middlewares/personalAuth.middleware');

/**
 * Personal Module Threat Analysis & Quarantine Routes
 * Email threat analysis, quarantine management, and threat logs
 */

// Require personal auth for all routes
router.use(personalAuth);

// POST /api/personal/threat/scan-email
// Manually scan an email for threats
// Body: { messageId: string }
// Response: { threatLevel: string, threatScore: number, details: object }
router.post('/scan-email', threatController.scanEmail);

// POST /api/personal/threat/scan-url
// Manually scan a URL for threats
// Body: { url: string }
// Response: { threatLevel: string, sources: object[] }
router.post('/scan-url', threatController.scanUrl);

// POST /api/personal/threat/scan-attachment
// Scan email attachment for malware
// Body: { messageId: string, attachmentId: string }
// Response: { threatLevel: string, verdict: string }
router.post('/scan-attachment', threatController.scanAttachment);

// GET /api/personal/threat/logs
// Get threat analysis logs for user
// Query params: { page: number, limit: number, threatLevel: string }
router.get('/logs', threatController.getThreatLogs);

// GET /api/personal/threat/statistics
// Get threat statistics for date range
// Query params: { startDate: ISO, endDate: ISO }
router.get('/statistics', threatController.getThreatStatistics);

// GET /api/personal/threat/summary
// Get quick threat summary (dashboard overview)
router.get('/summary', threatController.getThreatSummary);

module.exports = router;
