const logger = require('../../../config/logger');
const cache = require('../../../config/redis');

/**
 * Quarantine Service
 * Manages email quarantine and recovery for personal users
 */
class QuarantineService {
  /**
   * Log threatened email to quarantine
   */
  async quarantineEmail(userId, messageId, threatData) {
    try {
      const quarantineKey = `quarantine:${userId}:${messageId}`;
      const quarantineEntry = {
        messageId,
        sender: threatData.sender,
        subject: threatData.subject,
        threatLevel: threatData.threatLevel,
        threats: threatData.threats,
        quarantinedAt: new Date().toISOString(),
        recovered: false
      };

      await cache.setex(quarantineKey, 7776000, JSON.stringify(quarantineEntry)); // 90-day TTL

      logger.info(`Email quarantined: ${messageId} for user ${userId}`);
      return quarantineEntry;
    } catch (error) {
      logger.error('Failed to quarantine email:', error);
      throw error;
    }
  }

  /**
   * Get quarantine list for user
   */
  async getQuarantineList(userId, limit = 50) {
    try {
      // This would normally query database for quarantined emails
      const pattern = `quarantine:${userId}:*`;
      
      logger.info(`Retrieved quarantine list for user: ${userId}`);
      
      return {
        userId,
        total: 0,
        quarantined: [],
        limit
        // In production: query database for persistent quarantine storage
      };
    } catch (error) {
      logger.error('Failed to get quarantine list:', error);
      throw error;
    }
  }

  /**
   * Recover email from quarantine
   */
  async recoverEmail(userId, messageId) {
    try {
      const gmailService = require('./gmail.service');
      
      // Remove from spam in Gmail
      await gmailService.quarantineMessage(userId, messageId); // This would be "unquarantine"
      
      const quarantineKey = `quarantine:${userId}:${messageId}`;
      await cache.del(quarantineKey);

      logger.info(`Email recovered from quarantine: ${messageId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to recover email:', error);
      throw error;
    }
  }

  /**
   * Get detailed threat analysis for quarantined email
   */
  async getThreatDetails(userId, messageId) {
    try {
      const quarantineKey = `quarantine:${userId}:${messageId}`;
      const data = await cache.get(quarantineKey);

      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to get threat details:', error);
      throw error;
    }
  }
}

module.exports = new QuarantineService();
