const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

// Phase 5: Immutable Audit Trail & Bank Verification
router.get('/', auditController.getAuditLogs);
router.get('/user/:userId', auditController.getUserAuditLogs);
router.get('/session/:sessionId', auditController.getSessionAuditLogs);
router.get('/:id', auditController.getAuditLogDetail);

// Export audit logs (CSV/JSON)
router.post('/export', auditController.exportAuditLogs);

// Verify audit log integrity
router.post('/verify', auditController.verifyAuditIntegrity);

// Bank verification endpoints
router.post('/bank/verify', auditController.bankVerifyTransaction);
router.get('/bank/status/:transactionId', auditController.getBankVerificationStatus);

module.exports = router;
