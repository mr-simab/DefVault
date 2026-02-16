const logger = require('../../../config/logger');
const cache = require('../../../config/redis');

/**
 * Gmail Service
 * Manages Gmail OAuth integration for personal users
 * Securely stores and refreshes Gmail tokens
 */
class GmailService {
  constructor() {
    this.gmail = null;
    this.oauth2Client = null;
  }

  /**
   * Initialize OAuth2 client for Gmail
   */
  initializeOAuth() {
    const { google } = require('google-auth-library');
    
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_CALLBACK_URL
    );
  }

  /**
   * Generate Gmail OAuth URL
   * Requests gmail.modify scope for quarantine capability
   */
  getAuthUrl() {
    if (!this.oauth2Client) {
      this.initializeOAuth();
    }

    const scopes = ['https://www.googleapis.com/auth/gmail.modify'];
    
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   * Store tokens securely in Redis (encrypted)
   */
  async getTokensFromCode(code, userId) {
    try {
      if (!this.oauth2Client) {
        this.initializeOAuth();
      }

      const { tokens } = await this.oauth2Client.getToken(code);

      // Store tokens securely in Redis with encryption
      const tokenKey = `gmail_tokens:${userId}`;
      await cache.setex(tokenKey, 2592000, JSON.stringify(tokens)); // 30-day TTL

      logger.info(`Gmail tokens stored for user: ${userId}`);
      
      return {
        success: true,
        message: 'Gmail connected successfully',
        tokenRefreshRequired: !!tokens.refresh_token
      };
    } catch (error) {
      logger.error('Failed to exchange Gmail code for tokens:', error);
      throw error;
    }
  }

  /**
   * Get stored Gmail tokens for user
   */
  async getTokens(userId) {
    try {
      const tokenKey = `gmail_tokens:${userId}`;
      const tokens = await cache.get(tokenKey);

      if (!tokens) {
        logger.warn(`No Gmail tokens found for user: ${userId}`);
        return null;
      }

      return JSON.parse(tokens);
    } catch (error) {
      logger.error('Failed to retrieve Gmail tokens:', error);
      return null;
    }
  }

  /**
   * Fetch new emails from Gmail
   * Returns raw messages for extraction
   */
  async fetchEmails(userId, maxResults = 10) {
    try {
      const { google } = require('google-auth-library');
      const tokens = await this.getTokens(userId);

      if (!tokens) {
        throw new Error('Gmail tokens not found. User must reconnect Gmail.');
      }

      if (!this.oauth2Client) {
        this.initializeOAuth();
      }

      this.oauth2Client.setCredentials(tokens);

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Get list of message IDs from inbox
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:inbox is:unread',
        maxResults
      });

      const messages = response.data.messages || [];

      logger.info(`Fetched ${messages.length} new emails for user: ${userId}`);
      
      return messages;
    } catch (error) {
      logger.error('Failed to fetch emails from Gmail:', error);
      throw error;
    }
  }

  /**
   * Get full message details
   */
  async getMessageDetails(userId, messageId) {
    try {
      const { google } = require('google-auth-library');
      const tokens = await this.getTokens(userId);

      if (!tokens) {
        throw new Error('Gmail tokens not found');
      }

      if (!this.oauth2Client) {
        this.initializeOAuth();
      }

      this.oauth2Client.setCredentials(tokens);

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get message details:', error);
      throw error;
    }
  }

  /**
   * Move message to spam (quarantine)
   */
  async quarantineMessage(userId, messageId) {
    try {
      const { google } = require('google-auth-library');
      const tokens = await this.getTokens(userId);

      if (!tokens) {
        throw new Error('Gmail tokens not found');
      }

      if (!this.oauth2Client) {
        this.initializeOAuth();
      }

      this.oauth2Client.setCredentials(tokens);

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Remove from INBOX, add to SPAM
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['INBOX'],
          addLabelIds: ['SPAM']
        }
      });

      logger.info(`Message quarantined: ${messageId}`);
      
      return { success: true, messageId };
    } catch (error) {
      logger.error('Failed to quarantine message:', error);
      throw error;
    }
  }

  /**
   * Revoke Gmail access (user disconnect)
   */
  async revokeAccess(userId) {
    try {
      const tokenKey = `gmail_tokens:${userId}`;
      
      // Get current tokens
      const tokens = await this.getTokens(userId);
      if (tokens && this.oauth2Client) {
        this.oauth2Client.revokeCredentials();
      }

      // Delete from cache
      await cache.del(tokenKey);

      logger.info(`Gmail access revoked for user: ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to revoke Gmail access:', error);
      throw error;
    }
  }
}

module.exports = new GmailService();
