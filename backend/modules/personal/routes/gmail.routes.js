const express = require('express');
const router = express.Router();
const gmailController = require('../controllers/gmail.controller');
const personalAuth = require('../middlewares/personalAuth.middleware');

/**
 * Personal Module Gmail Integration Routes
 * OAuth setup, email management, and Gmail operations
 */

// Require personal auth for all routes
router.use(personalAuth);

// GET /api/personal/gmail/auth-url
// Get Gmail OAuth consent URL for user
// Response: { authUrl: string, state: string }
router.get('/auth-url', gmailController.getAuthUrl);

// POST /api/personal/gmail/connect
// Complete OAuth flow and connect Gmail account
// Body: { code: string, state: string }
// Response: { connected: boolean, email: string }
router.post('/connect', gmailController.connectGmail);

// POST /api/personal/gmail/disconnect
// Disconnect Gmail account (revoke access)
// Response: { disconnected: boolean }
router.post('/disconnect', gmailController.disconnectGmail);

// GET /api/personal/gmail/status
// Get Gmail connection status
// Response: { connected: boolean, email: string, lastSync: timestamp }
router.get('/status', gmailController.getConnectionStatus);

// GET /api/personal/gmail/emails
// Get unread emails from inbox
// Query params: { limit: number, pageToken: string }
// Response: { emails: Email[], nextPageToken: string }
router.get('/emails', gmailController.getEmails);

// GET /api/personal/gmail/emails/:messageId
// Get detailed email with full content
router.get('/emails/:messageId', gmailController.getEmailDetails);

// POST /api/personal/gmail/sync
// Manually trigger email sync and threat analysis
// Response: { synced: number, threats: number, quarantined: number }
router.post('/sync', gmailController.syncEmails);

module.exports = router;
