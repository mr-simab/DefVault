const threatEngine = require('../../modules/core/services/threat/threatEngine.service');
const emailExtractorService = require('../services/emailExtractor.service');
const gmailService = require('../services/gmail.service');
const ThreatLog = require('../../models/ThreatLog.model');
const logger = require('../../config/logger');

/**
 * Personal Module Threat Analysis Controller
 * Handles threat scanning for emails and URLs
 */

exports.scanEmail = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({
        error: 'Message ID required',
        code: 'INVALID_INPUT'
      });
    }

    // Get email details
    const message = await gmailService.getMessageDetails(userId, messageId);
    const parsedMessage = await emailExtractorService.parseMessage(message);

    // Scan URLs in email
    const threats = [];
    for (const url of parsedMessage.urls || []) {
      try {
        const threatAnalysis = await threatEngine.analyzeUrl(url, {
          module: 'personal',
          userId,
          source: 'email'
        });

        if (threatAnalysis.threatLevel !== 'safe') {
          threats.push({
            url,
            ...threatAnalysis
          });
        }
      } catch (error) {
        logger.warn(`Error analyzing URL: ${url}`, { error: error.message });
      }
    }

    // Determine overall threat level
    const threatLevel = threats.length > 0 
      ? threats.some(t => t.threatLevel === 'critical') ? 'critical'
      : threats.some(t => t.threatLevel === 'high') ? 'high'
      : threats.some(t => t.threatLevel === 'medium') ? 'medium'
      : 'low'
      : 'safe';

    const threatScore = Math.max(...threats.map(t => t.threatScore || 0), 0);

    // Log threat analysis
    const threatLog = new ThreatLog({
      userId,
      module: 'personal',
      messageId,
      senderEmail: parsedMessage.sender,
      subject: parsedMessage.subject,
      threatLevel,
      threatScore,
      details: threats,
      createdAt: new Date()
    });

    await threatLog.save();

    logger.info(`Email threat scanned for user ${userId}`, {
      module: 'personal',
      controller: 'threat',
      action: 'scan-email',
      messageId,
      threatLevel,
      threatCount: threats.length
    });

    res.status(200).json({
      messageId,
      threatLevel,
      threatScore,
      threatCount: threats.length,
      threats,
      senderEmail: parsedMessage.sender,
      subject: parsedMessage.subject
    });
  } catch (error) {
    logger.error('Error scanning email', { error: error.message });
    next(error);
  }
};

exports.scanUrl = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'URL required',
        code: 'INVALID_INPUT'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({
        error: 'Invalid URL format',
        code: 'INVALID_URL'
      });
    }

    // Analyze URL
    const threatAnalysis = await threatEngine.analyzeUrl(url, {
      module: 'personal',
      userId,
      source: 'manual-scan'
    });

    // Log threat analysis
    const threatLog = new ThreatLog({
      userId,
      module: 'personal',
      url,
      threatLevel: threatAnalysis.threatLevel,
      threatScore: threatAnalysis.threatScore,
      details: threatAnalysis,
      createdAt: new Date()
    });

    await threatLog.save();

    logger.info(`URL threat scanned for user ${userId}`, {
      module: 'personal',
      controller: 'threat',
      action: 'scan-url',
      url,
      threatLevel: threatAnalysis.threatLevel
    });

    res.status(200).json({
      url,
      threatLevel: threatAnalysis.threatLevel,
      threatScore: threatAnalysis.threatScore,
      sources: threatAnalysis.sources || []
    });
  } catch (error) {
    logger.error('Error scanning URL', { error: error.message });
    next(error);
  }
};

exports.scanAttachment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { messageId, attachmentId } = req.body;

    if (!messageId || !attachmentId) {
      return res.status(400).json({
        error: 'Message ID and attachment ID required',
        code: 'INVALID_INPUT'
      });
    }

    // Download attachment
    const attachmentData = await emailExtractorService.downloadAttachment(
      userId,
      messageId,
      attachmentId
    );

    // Analyze file
    const threatAnalysis = await threatEngine.analyzeFile(attachmentData.hash, {
      module: 'personal',
      userId,
      source: 'email-attachment',
      fileName: attachmentData.filename
    });

    // Log threat analysis
    const threatLog = new ThreatLog({
      userId,
      module: 'personal',
      messageId,
      fileName: attachmentData.filename,
      threatLevel: threatAnalysis.threatLevel,
      threatScore: threatAnalysis.threatScore,
      details: threatAnalysis,
      createdAt: new Date()
    });

    await threatLog.save();

    logger.info(`Attachment threat scanned for user ${userId}`, {
      module: 'personal',
      controller: 'threat',
      action: 'scan-attachment',
      fileName: attachmentData.filename,
      threatLevel: threatAnalysis.threatLevel
    });

    res.status(200).json({
      fileName: attachmentData.filename,
      threatLevel: threatAnalysis.threatLevel,
      threatScore: threatAnalysis.threatScore,
      verdict: threatAnalysis.verdict || 'UNKNOWN'
    });
  } catch (error) {
    logger.error('Error scanning attachment', { error: error.message });
    next(error);
  }
};

exports.getThreatLogs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50, threatLevel } = req.query;

    const query = {
      userId,
      module: 'personal'
    };

    if (threatLevel) {
      query.threatLevel = threatLevel;
    }

    const logs = await ThreatLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ThreatLog.countDocuments(query);

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
    logger.error('Error fetching threat logs', { error: error.message });
    next(error);
  }
};

exports.getThreatStatistics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    const query = {
      userId,
      module: 'personal'
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Aggregate statistics
    const stats = await ThreatLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$threatLevel',
          count: { $sum: 1 },
          avgScore: { $avg: '$threatScore' }
        }
      }
    ]);

    res.status(200).json({
      period: {
        startDate: startDate || 'All time',
        endDate: endDate || 'Today'
      },
      threatBreakdown: stats.reduce((acc, s) => {
        acc[s._id] = {
          count: s.count,
          avgScore: Math.round(s.avgScore)
        };
        return acc;
      }, {})
    });
  } catch (error) {
    logger.error('Error fetching threat statistics', { error: error.message });
    next(error);
  }
};

exports.getThreatSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get counts by threat level
    const stats = await ThreatLog.aggregate([
      { $match: { userId, module: 'personal' } },
      {
        $group: {
          _id: '$threatLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent threats (last 7 days)
    const recentThreats = await ThreatLog.countDocuments({
      userId,
      module: 'personal',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const breakdown = stats.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {});

    res.status(200).json({
      summary: {
        total: stats.reduce((sum, s) => sum + s.count, 0),
        critical: breakdown.critical || 0,
        high: breakdown.high || 0,
        medium: breakdown.medium || 0,
        low: breakdown.low || 0,
        safe: breakdown.safe || 0,
        recentThreats: recentThreats
      }
    });
  } catch (error) {
    logger.error('Error fetching threat summary', { error: error.message });
    next(error);
  }
};
