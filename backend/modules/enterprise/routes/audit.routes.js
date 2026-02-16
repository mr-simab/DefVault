const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const enterpriseAuth = require('../middlewares/enterpriseAuth.middleware');

/**
 * Enterprise Audit Log Routes
 * Access to audit logs and security events
 */

// Require enterprise auth for all routes
router.use(enterpriseAuth);

// GET /api/enterprise/audit/logs
// Get audit logs for enterprise account
// Query params: { page: number, limit: number, startDate: ISO, endDate: ISO }
// Response: { logs: AuditLog[], total: number, page: number }
router.get('/logs', auditController.getAuditLogs);

// GET /api/enterprise/audit/logs/:logId
// Get specific audit log by ID
router.get('/logs/:logId', auditController.getAuditLogById);

// GET /api/enterprise/audit/events
// Get recent security events
// Query params: { severity: 'critical|high|medium|low', limit: 50 }
router.get('/events', auditController.getSecurityEvents);

// GET /api/enterprise/audit/statistics
// Get audit statistics (events by type, time range, etc)
// Query params: { period: 'day|week|month', startDate: ISO }
router.get('/statistics', auditController.getAuditStatistics);

// POST /api/enterprise/audit/export
// Export audit logs (CSV, JSON)
// Body: { format: 'csv|json', filters: object }
router.post('/export', auditController.exportAuditLogs);

module.exports = router;
