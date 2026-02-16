const quarantineService = require('../services/quarantine.service');
const gmailService = require('../services/gmail.service');
const logger = require('../../config/logger');

/**
 * Personal Module Quarantine Controller
 * Manages quarantined emails and recovery operations
 */

exports.getQuarantineList = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50, status = 'active' } = req.query;

    // Get quarantine list
    const quarantined = await quarantineService.getQuarantineList(
      userId,
      (parseInt(page) - 1) * parseInt(limit),
      parseInt(limit),
      status
    );

    logger.info(`Quarantine list retrieved for user ${userId}`, {
      module: 'personal',
      controller: 'quarantine',
      action: 'get-list',
      status,
      count: quarantined.length
    });

    res.status(200).json({
      quarantined,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: quarantined.length
      }
    });
  } catch (error) {
    logger.error('Error fetching quarantine list', { error: error.message });
    next(error);
  }
};

exports.getQuarantineDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({
        error: 'Message ID required',
        code: 'INVALID_INPUT'
      });
    }

    // Get quarantine details
    const details = await quarantineService.getThreatDetails(userId, messageId);

    if (!details) {
      return res.status(404).json({
        error: 'Quarantined email not found',
        code: 'NOT_FOUND'
      });
    }

    res.status(200).json({ details });
  } catch (error) {
    logger.error('Error fetching quarantine details', { error: error.message });
    next(error);
  }
};

exports.recoverEmail = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { messageId, action = 'recover' } = req.body;

    if (!messageId || !['recover', 'delete'].includes(action)) {
      return res.status(400).json({
        error: 'Message ID and valid action required',
        code: 'INVALID_INPUT'
      });
    }

    if (action === 'recover') {
      // Recover email - move from spam back to inbox
      await gmailService.recoverMessage(userId, messageId);
      await quarantineService.recoverEmail(userId, messageId);

      logger.info(`Email recovered for user ${userId}`, {
        module: 'personal',
        controller: 'quarantine',
        action: 'recover',
        messageId
      });

      res.status(200).json({
        message: 'Email recovered successfully',
        action: 'recovered'
      });
    } else {
      // Delete email permanently
      await gmailService.deleteMessage(userId, messageId);
      await quarantineService.deleteEmail(userId, messageId);

      logger.info(`Email deleted for user ${userId}`, {
        module: 'personal',
        controller: 'quarantine',
        action: 'delete',
        messageId
      });

      res.status(200).json({
        message: 'Email deleted permanently',
        action: 'deleted'
      });
    }
  } catch (error) {
    logger.error('Error recovering email', { error: error.message });
    next(error);
  }
};

exports.deleteQuarantine = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({
        error: 'Message ID required',
        code: 'INVALID_INPUT'
      });
    }

    // Delete email permanently
    await gmailService.deleteMessage(userId, messageId);
    await quarantineService.deleteEmail(userId, messageId);

    logger.info(`Email permanently deleted for user ${userId}`, {
      module: 'personal',
      controller: 'quarantine',
      action: 'permanent-delete',
      messageId
    });

    res.status(200).json({ message: 'Email deleted permanently' });
  } catch (error) {
    logger.error('Error deleting email', { error: error.message });
    next(error);
  }
};

exports.bulkAction = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { messageIds, action } = req.body;

    if (!Array.isArray(messageIds) || !action || !['recover', 'delete'].includes(action)) {
      return res.status(400).json({
        error: 'Message IDs array and valid action required',
        code: 'INVALID_INPUT'
      });
    }

    let successful = 0;
    let failed = 0;

    for (const messageId of messageIds) {
      try {
        if (action === 'recover') {
          await gmailService.recoverMessage(userId, messageId);
          await quarantineService.recoverEmail(userId, messageId);
        } else {
          await gmailService.deleteMessage(userId, messageId);
          await quarantineService.deleteEmail(userId, messageId);
        }
        successful++;
      } catch (error) {
        logger.warn(`Bulk action failed for messageId ${messageId}`, { error: error.message });
        failed++;
      }
    }

    logger.info(`Bulk ${action} completed for user ${userId}`, {
      module: 'personal',
      controller: 'quarantine',
      action: `bulk-${action}`,
      successful,
      failed
    });

    res.status(200).json({
      action,
      total: messageIds.length,
      successful,
      failed
    });
  } catch (error) {
    logger.error('Error performing bulk action', { error: error.message });
    next(error);
  }
};

exports.getStatistics = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get quarantine statistics
    const stats = await quarantineService.getQuarantineStatistics(userId);

    res.status(200).json({
      statistics: {
        totalQuarantined: stats.total || 0,
        byThreatLevel: stats.byThreatLevel || {},
        recovered: stats.recovered || 0,
        deleted: stats.deleted || 0,
        avgTimeInQuarantine: stats.avgTime || 'N/A'
      }
    });
  } catch (error) {
    logger.error('Error fetching quarantine statistics', { error: error.message });
    next(error);
  }
};
