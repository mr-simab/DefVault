const express = require('express');
const router = express.Router();
const quarantineController = require('../controllers/quarantine.controller');
const personalAuth = require('../middlewares/personalAuth.middleware');

/**
 * Personal Module Quarantine Management Routes
 * View, manage, and recover quarantined emails
 */

// Require personal auth for all routes
router.use(personalAuth);

// GET /api/personal/quarantine/list
// Get quarantined emails for user
// Query params: { page: number, limit: number, status: 'active|recovered' }
// Response: { quarantined: QuarantineItem[], total: number, page: number }
router.get('/list', quarantineController.getQuarantineList);

// GET /api/personal/quarantine/list/:messageId
// Get details of quarantined email
router.get('/list/:messageId', quarantineController.getQuarantineDetails);

// POST /api/personal/quarantine/recover
// Recover quarantined email (move back to inbox)
// Body: { messageId: string, action: 'recover|delete' }
router.post('/recover', quarantineController.recoverEmail);

// POST /api/personal/quarantine/delete
// Permanently delete quarantined email
// Body: { messageId: string }
router.post('/delete', quarantineController.deleteQuarantine);

// POST /api/personal/quarantine/bulk-action
// Perform bulk action on quarantined emails
// Body: { messageIds: string[], action: 'recover|delete' }
router.post('/bulk-action', quarantineController.bulkAction);

// GET /api/personal/quarantine/statistics
// Get quarantine statistics
// Response: { totalQuarantined: number, byThreatLevel: object, avgRecoveryTime: number }
router.get('/statistics', quarantineController.getStatistics);

module.exports = router;
