const AuditLog = require('../../models/AuditLog.model');
const logger = require('../../config/logger');

/**
 * Enterprise Audit Log Controller
 * Manages access to security audit logs and events
 */

exports.getAuditLogs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50, startDate, endDate } = req.query;

    // Build query
    const query = {
      userId,
      module: 'enterprise'
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Execute query with pagination
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    res.status(200).json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching audit logs', { error: error.message });
    next(error);
  }
};

exports.getAuditLogById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { logId } = req.params;

    const log = await AuditLog.findOne({
      _id: logId,
      userId,
      module: 'enterprise'
    });

    if (!log) {
      return res.status(404).json({
        error: 'Audit log not found',
        code: 'LOG_NOT_FOUND'
      });
    }

    res.status(200).json({ log });
  } catch (error) {
    logger.error('Error fetching audit log', { error: error.message });
    next(error);
  }
};

exports.getSecurityEvents = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { severity, limit = 50 } = req.query;

    const query = {
      userId,
      module: 'enterprise'
    };

    if (severity) {
      query.severity = severity;
    } else {
      // Default: high risk events
      query.severity = { $in: ['critical', 'high'] };
    }

    const events = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      events,
      count: events.length
    });
  } catch (error) {
    logger.error('Error fetching security events', { error: error.message });
    next(error);
  }
};

exports.getAuditStatistics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { period = 'month', startDate } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let start;

    switch (period) {
      case 'day':
        start = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'week':
        start = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
      default:
        start = new Date(now.setMonth(now.getMonth() - 1));
        break;
    }

    if (startDate) {
      start = new Date(startDate);
    }

    // Aggregate statistics
    const stats = await AuditLog.aggregate([
      {
        $match: {
          userId,
          module: 'enterprise',
          createdAt: { $gte: start }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get severity breakdown
    const severityStats = await AuditLog.aggregate([
      {
        $match: {
          userId,
          module: 'enterprise',
          createdAt: { $gte: start }
        }
      },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      period,
      startDate: start.toISOString(),
      endDate: new Date().toISOString(),
      eventBreakdown: stats.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      severityBreakdown: severityStats.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {})
    });
  } catch (error) {
    logger.error('Error fetching audit statistics', { error: error.message });
    next(error);
  }
};

exports.exportAuditLogs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { format = 'json', filters = {} } = req.body;

    const query = { userId, module: 'enterprise', ...filters };
    const logs = await AuditLog.find(query).sort({ createdAt: -1 });

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(logs);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
      res.status(200).send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.json');
      res.status(200).json({ logs, exportedAt: new Date().toISOString() });
    }

    logger.info(`Audit logs exported by user ${userId}`, {
      module: 'enterprise',
      controller: 'audit',
      action: 'export',
      format,
      count: logs.length
    });
  } catch (error) {
    logger.error('Error exporting audit logs', { error: error.message });
    next(error);
  }
};

/**
 * Helper function to convert logs to CSV format
 */
function convertToCSV(logs) {
  if (!logs || logs.length === 0) {
    return 'No logs available';
  }

  const headers = ['Date', 'Event Type', 'Severity', 'Module', 'Description'];
  const rows = logs.map(log => [
    log.createdAt.toISOString(),
    log.eventType,
    log.severity,
    log.module,
    log.description || ''
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}
