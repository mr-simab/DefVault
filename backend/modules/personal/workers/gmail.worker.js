const logger = require('../../../config/logger');
const threatEngineService = require('../../core/services/threat/threatEngine.service');
const emailExtractorService = require('./emailExtractor.service');
const quarantineService = require('./quarantine.service');

/**
 * Gmail Worker
 * Background worker that monitors Gmail for new emails
 * Runs threat analysis and takes quarantine actions
 */
class GmailWorker {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Start the Gmail monitoring worker
   */
  start() {
    if (this.isRunning) {
      logger.warn('Gmail worker already running');
      return;
    }

    this.isRunning = true;
    logger.info('Gmail worker started');

    // Process all active users periodically
    this.workerInterval = setInterval(() => {
      this.processAllUsers().catch(err => {
        logger.error('Error in Gmail worker:', err);
      });
    }, this.checkInterval);
  }

  /**
   * Stop the worker
   */
  stop() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
    }
    this.isRunning = false;
    logger.info('Gmail worker stopped');
  }

  /**
   * Process emails for all active personal users
   */
  async processAllUsers() {
    try {
      // In production: get list of active personal users from database
      logger.debug('Processing emails for all active users');
      // await this.processUserEmails(userId) for each user
    } catch (error) {
      logger.error('Error processing all users:', error);
    }
  }

  /**
   * Process emails for specific user
   */
  async processUserEmails(userId) {
    try {
      const gmailService = require('./gmail.service');
      const emailExtractor = require('./emailExtractor.service');
      const threatEngine = threatEngineService;

      // Fetch new emails
      const messages = await gmailService.fetchEmails(userId, 5);

      for (const message of messages) {
        try {
          // Get full message details
          const fullMessage = await gmailService.getMessageDetails(userId, message.id);
          
          // Parse email
          const emailData = emailExtractor.parseMessage(fullMessage);
          if (!emailData) continue;

          // Analyze each URL in email
          for (const url of emailData.urls) {
            try {
              const analysis = await threatEngine.analyzeUrl(url, {
                source: 'email',
                sender: emailData.sender,
                messageId: message.id
              });

              // Take action based on threat level
              if (analysis.threatLevel === 'critical' || analysis.threatLevel === 'high') {
                logger.warn(`High threat detected in email: ${message.id}`);
                
                // Quarantine the email
                await gmailService.quarantineMessage(userId, message.id);
                
                // Log to quarantine database
                await quarantineService.quarantineEmail(userId, message.id, {
                  sender: emailData.sender,
                  subject: emailData.subject,
                  threatLevel: analysis.threatLevel,
                  threats: analysis.threats,
                  url
                });
              } else if (analysis.threatLevel === 'medium') {
                logger.info(`Medium threat detected in email: ${message.id}`);
                // Log but don't quarantine - user sees warning in dashboard
              }
            } catch (err) {
              logger.error(`Error analyzing URL in email: ${err.message}`);
            }
          }
        } catch (err) {
          logger.error(`Error processing message ${message.id}: ${err.message}`);
        }
      }

      logger.info(`Processed ${messages.length} emails for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to process emails for user ${userId}:`, error);
    }
  }
}

module.exports = new GmailWorker();
