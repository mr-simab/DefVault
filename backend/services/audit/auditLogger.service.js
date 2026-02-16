const logger = require('../../config/logger');
const hashService = require('../crypto/hash.service');
const cache = require('../../config/redis');

class AuditLoggerService {
  constructor() {
    this.logChainHead = null; // For maintaining audit log chain
  }

  async logEvent(event) {
    try {
      const auditEntry = {
        id: require('crypto').randomBytes(8).toString('hex'),
        timestamp: new Date().toISOString(),
        userId: event.userId,
        sessionId: event.sessionId,
        action: event.action,
        resource: event.resource,
        details: event.details,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        status: event.status || 'success',
        severity: this._calculateSeverity(event.action, event.status),
        source: 'defvault_audit'
      };

      // Create chained hash for integrity
      const auditHash = hashService.createAuditHash(auditEntry, this.logChainHead);
      auditEntry.hash = auditHash.hash;
      auditEntry.previousHash = auditHash.chainedFrom;
      
      this.logChainHead = auditEntry.hash;

      // Store in cache (7-day TTL minimum)
      const cacheKey = `audit:${auditEntry.id}`;
      await cache.setex(cacheKey, 604800, JSON.stringify(auditEntry));

      // Log to application logger
      logger.info(`Audit log [${event.action}/"${event.resource}"]`, {
        userId: event.userId,
        sessionId: event.sessionId,
        status: event.status,
        id: auditEntry.id
      });

      return auditEntry;
    } catch (error) {
      logger.error('Audit logging failed:', { error: error.message, event });
      throw error;
    }
  }

  async getAuditLogs(filters = {}) {
    try {
      // In production, query from database with indexes
      // filters: userId, sessionId, action, startDate, endDate, severity, status
      
      const logs = [];
      
      // Apply filters
      if (filters.userId) {
        // Query: WHERE userId = filters.userId
      }
      
      if (filters.action) {
        // Query: WHERE action = filters.action
      }

      if (filters.startDate && filters.endDate) {
        // Query: WHERE timestamp BETWEEN startDate AND endDate
      }

      return {
        logs: logs,
        count: logs.length,
        filters: filters,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Audit log retrieval failed:', { error: error.message });
      throw error;
    }
  }

  async getUserAuditLogs(userId, limit = 100) {
    try {
      return await this.getAuditLogs({ userId, limit });
    } catch (error) {
      logger.error('User audit log retrieval failed:', { userId, error: error.message });
      throw error;
    }
  }

  async getSessionAuditLogs(sessionId) {
    try {
      return await this.getAuditLogs({ sessionId });
    } catch (error) {
      logger.error('Session audit log retrieval failed:', { sessionId, error: error.message });
      throw error;
    }
  }

  async exportAuditLogs(filters = {}, format = 'json') {
    try {
      const logs = await this.getAuditLogs(filters);
      
      let exportData;
      let contentType;

      if (format === 'csv') {
        exportData = this._convertToCSV(logs.logs);
        contentType = 'text/csv';
      } else {
        exportData = JSON.stringify(logs, null, 2);
        contentType = 'application/json';
      }

      return {
        format: format,
        contentType: contentType,
        data: exportData,
        recordCount: logs.count,
        exportedAt: new Date().toISOString(),
        hash: hashService.hashData(exportData) // Integrity verification
      };
    } catch (error) {
      logger.error('Audit log export failed:', { error: error.message });
      throw error;
    }
  }

  async verifyAuditIntegrity(startId, endId) {
    try {
      // Retrieve log chain between startId and endId
      const logs = []; // Query logs with IDs in range
      
      // Verify chain continuity
      const chainVerification = hashService.verifyAuditChain(logs);

      return {
        isValid: chainVerification.isValid,
        entriesVerified: chainVerification.entriesVerified,
        brokenAt: chainVerification.brokenAt,
        finalHash: chainVerification.finalHash,
        verifiedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Audit integrity verification failed:', { error: error.message });
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  _calculateSeverity(action, status) {
    // Incident severity: critical, high, medium, low, info
    const failedActions = ['failed_auth', 'invalid_token', 'access_denied', 'suspicious_activity'];
    const criticalActions = ['jwt_forged', 'honeytrap_triggered', 'replay_attack', 'device_mismatch'];

    if (status === 'failed' && criticalActions.some(a => action.includes(a))) {
      return 'critical';
    }

    if (status === 'failed' && failedActions.some(a => action.includes(a))) {
      return 'high';
    }

    if (action.includes('threat_detected')) {
      return 'high';
    }

    if (action.includes('warning')) {
      return 'medium';
    }

    return 'info';
  }

  _convertToCSV(logs) {
    if (!logs || logs.length === 0) return 'timestamp,userId,action,resource,status,severity\n';

    const headers = ['timestamp', 'userId', 'sessionId', 'action', 'resource', 'status', 'severity', 'ipAddress'];
    const rows = logs.map(log => 
      headers.map(h => `"${(log[h] || '').toString().replace(/"/g, '""')}"`).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }
}

module.exports = new AuditLoggerService();
      logger.error('Audit log export failed:', error);
      throw error;
    }
  }
}

module.exports = new AuditLoggerService();
