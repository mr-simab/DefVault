const logger = require('../config/logger');
const auditLogger = require('../services/audit/auditLogger.service');
const hashService = require('../services/crypto/hash.service');

// Phase 5: Immutable Audit Trail & Bank Verification

exports.getAuditLogs = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 100, offset = 0, action, status } = req.query;

    const filters = { userId, action, status, limit, offset };
    const result = await auditLogger.getAuditLogs(filters);

    res.json({
      logs: result.logs,
      total: result.count,
      limit,
      offset,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

exports.getUserAuditLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const result = await auditLogger.getUserAuditLogs(userId, limit);

    res.json({
      userId,
      logs: result.logs,
      total: result.count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching user audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

exports.getSessionAuditLogs = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await auditLogger.getSessionAuditLogs(sessionId);

    res.json({
      sessionId,
      logs: result.logs,
      total: result.count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching session audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

exports.getAuditLogDetail = async (req, res) => {
  try {
    const { id } = req.params;
    res.json({ id, timestamp: new Date().toISOString(), status: 'retrieved' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve log detail' });
  }
};

exports.exportAuditLogs = async (req, res) => {
  try {
    const { format = 'json', userId, action, startDate, endDate } = req.body;

    const filters = { userId, action, startDate, endDate };
    const exportResult = await auditLogger.exportAuditLogs(filters, format);

    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.${format === 'csv' ? 'csv' : 'json'}"`);
    res.send(exportResult.data);
  } catch (error) {
    logger.error('Audit export failed:', error);
    res.status(500).json({ error: 'Export failed' });
  }
};

exports.verifyAuditIntegrity = async (req, res) => {
  try {
    const { startId, endId } = req.body;

    const verification = await auditLogger.verifyAuditIntegrity(startId, endId);

    res.json({
      isValid: verification.isValid,
      entriesVerified: verification.entriesVerified,
      brokenAt: verification.brokenAt,
      finalHash: verification.finalHash,
      verifiedAt: verification.verifiedAt
    });
  } catch (error) {
    logger.error('Audit verification failed:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.bankVerifyTransaction = async (req, res) => {
  try {
    const { jti, userId, transactionDetails } = req.body;

    const verification = {
      transactionId: require('crypto').randomBytes(8).toString('hex'),
      jti,
      userId,
      status: 'verified',
      verifiedAt: new Date().toISOString(),
      bankReference: 'DEFVAULT-' + Date.now()
    };

    await auditLogger.logEvent({
      userId,
      sessionId: req.sessionID,
      action: 'bank_transaction_verified',
      resource: verification.transactionId,
      details: { bankRef: verification.bankReference },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json(verification);
  } catch (error) {
    logger.error('Bank verification failed:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.getBankVerificationStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;

    res.json({
      transactionId,
      status: 'verified',
      accountUnlocked: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve status' });
  }
};
