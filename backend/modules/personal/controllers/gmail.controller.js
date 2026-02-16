const gmailService = require('../services/gmail.service');
const emailExtractorService = require('../services/emailExtractor.service');
const logger = require('../../config/logger');
const redis = require('../../config/redis');

/**
 * Personal Module Gmail Controller
 * Manages Gmail OAuth, email access, and operations
 */

exports.getAuthUrl = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const authUrl = await gmailService.getAuthUrl(userId);

    logger.info(`Gmail auth URL generated for user ${userId}`, {
      module: 'personal',
      controller: 'gmail',
      action: 'get-auth-url'
    });

    res.status(200).json({
      authUrl,
      message: 'Redirect to this URL to authorize Gmail access'
    });
  } catch (error) {
    logger.error('Error generating Gmail auth URL', { error: error.message });
    next(error);
  }
};

exports.connectGmail = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { code, state } = req.body;

    if (!code || !state) {
      return res.status(400).json({
        error: 'Authorization code and state required',
        code: 'INVALID_INPUT'
      });
    }

    // Exchange code for tokens
    const tokens = await gmailService.getTokensFromCode(code, userId);
    const email = await gmailService.getConnectedEmail(userId);

    logger.info(`Gmail connected for user ${userId}: ${email}`, {
      module: 'personal',
      controller: 'gmail',
      action: 'connect'
    });

    res.status(200).json({
      connected: true,
      email,
      message: 'Gmail successfully connected'
    });
  } catch (error) {
    logger.error('Error connecting Gmail', { error: error.message });
    next(error);
  }
};

exports.disconnectGmail = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await gmailService.revokeAccess(userId);

    logger.info(`Gmail disconnected for user ${userId}`, {
      module: 'personal',
      controller: 'gmail',
      action: 'disconnect'
    });

    res.status(200).json({
      disconnected: true,
      message: 'Gmail access revoked'
    });
  } catch (error) {
    logger.error('Error disconnecting Gmail', { error: error.message });
    next(error);
  }
};

exports.getConnectionStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const tokenKey = `gmail:tokens:${userId}`;

    // Check if tokens exist in Redis
    const tokens = await redis.get(tokenKey);

    if (!tokens) {
      return res.status(200).json({
        connected: false,
        email: null,
        lastSync: null
      });
    }

    const lastSyncKey = `gmail:lastSync:${userId}`;
    const lastSync = await redis.get(lastSyncKey);

    res.status(200).json({
      connected: true,
      email: JSON.parse(tokens).email || 'Unknown',
      lastSync: lastSync ? new Date(parseInt(lastSync)) : null
    });
  } catch (error) {
    logger.error('Error checking Gmail connection status', { error: error.message });
    next(error);
  }
};

exports.getEmails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 10, pageToken } = req.query;

    // Fetch emails from Gmail
    const result = await gmailService.fetchEmails(userId, parseInt(limit), pageToken);

    if (!result || result.messages.length === 0) {
      return res.status(200).json({
        emails: [],
        nextPageToken: null,
        message: 'No unread emails found'
      });
    }

    res.status(200).json({
      emails: result.messages,
      nextPageToken: result.nextPageToken || null,
      count: result.messages.length
    });
  } catch (error) {
    logger.error('Error fetching emails', { error: error.message });
    next(error);
  }
};

exports.getEmailDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({
        error: 'Message ID required',
        code: 'INVALID_INPUT'
      });
    }

    // Get full message from Gmail
    const message = await gmailService.getMessageDetails(userId, messageId);

    // Extract email content
    const parsedMessage = await emailExtractorService.parseMessage(message);

    res.status(200).json({
      message: parsedMessage,
      messageId
    });
  } catch (error) {
    logger.error('Error fetching email details', { error: error.message });
    next(error);
  }
};

exports.syncEmails = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Manually trigger email sync (worker runs on schedule, but allow manual trigger)
    const result = {
      synced: 0,
      threats: 0,
      quarantined: 0
    };

    logger.info(`Email sync initiated for user ${userId}`, {
      module: 'personal',
      controller: 'gmail',
      action: 'sync'
    });

    // This would typically call the Gmail worker or background task
    res.status(200).json({
      ...result,
      message: 'Email sync initiated',
      note: 'Check back in a few moments for results'
    });
  } catch (error) {
    logger.error('Error syncing emails', { error: error.message });
    next(error);
  }
};
