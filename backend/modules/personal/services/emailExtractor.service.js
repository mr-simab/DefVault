const logger = require('../../../config/logger');

/**
 * Email Extractor Service
 * Extracts URLs, attachments, and metadata from emails
 * Used by Personal module for threat analysis
 */
class EmailExtractorService {
  /**
   * Parse Gmail message and extract threat-relevant data
   */
  parseMessage(gmailMessage) {
    try {
      const headers = gmailMessage.payload.headers;
      const parts = gmailMessage.payload.parts || [];

      const extractHeader = (name) => {
        const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
        return header ? header.value : null;
      };

      const metadata = {
        messageId: gmailMessage.id,
        threadId: gmailMessage.threadId,
        sender: extractHeader('from'),
        subject: extractHeader('subject'),
        date: extractHeader('date'),
        replyTo: extractHeader('reply-to'),
        urls: [],
        attachments: [],
        body: ''
      };

      // Extract body and URLs
      if (gmailMessage.payload.mimeType === 'text/plain' || gmailMessage.payload.mimeType === 'text/html') {
        const body = Buffer.from(gmailMessage.payload.body.data || '', 'base64').toString('utf-8');
        metadata.body = body;
        metadata.urls = this._extractUrls(body);
      }

      // Extract attachments
      parts.forEach(part => {
        if (part.filename) {
          metadata.attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size,
            attachmentId: part.body.attachmentId
          });
        }
      });

      return metadata;
    } catch (error) {
      logger.error('Error parsing Gmail message:', error);
      return null;
    }
  }

  /**
   * Extract URLs from email body using regex
   */
  _extractUrls(body) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = body.match(urlRegex);
    return matches ? [...new Set(matches)] : [];
  }

  /**
   * Extract and download attachment
   */
  async downloadAttachment(userId, messageId, attachmentId) {
    try {
      const gmailService = require('./gmail.service');
      const { google } = require('google-auth-library');
      
      const tokens = await gmailService.getTokens(userId);
      if (!tokens) {
        throw new Error('Gmail tokens required');
      }

      // This would require implementing Gmail attachment download
      logger.info(`Would download attachment: ${attachmentId}`);
      
      return {
        messageId,
        attachmentId
        // In production: return actual attachment data for VirusTotal scanning
      };
    } catch (error) {
      logger.error('Failed to download attachment:', error);
      throw error;
    }
  }
}

module.exports = new EmailExtractorService();
