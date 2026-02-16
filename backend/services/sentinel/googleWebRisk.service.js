const axios = require('axios');
const logger = require('../../config/logger');
const cache = require('../../config/redis');

class GoogleWebRiskService {
  constructor() {
    this.apiUrl = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';
    this.threatTypes = ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'];
    this.platformTypes = ['ANY_PLATFORM'];
    this.threatEntryTypes = ['URL'];
  }

  async checkUrl(url) {
    try {
      // Check cache first (5-minute TTL)
      const cacheKey = `threat:${url}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Validate URL format
      if (!this._isValidUrl(url)) {
        return { isMalicious: false, matches: [], reason: 'invalid_url' };
      }

      const response = await axios.post(this.apiUrl, {
        client: {
          clientId: process.env.GOOGLE_CLIENT_ID || 'defvault',
          clientVersion: process.env.APP_VERSION || '1.0.0'
        },
        threatInfo: {
          threatTypes: this.threatTypes,
          platformTypes: this.platformTypes,
          threatEntryTypes: this.threatEntryTypes,
          threatEntries: [{ url: url }]
        }
      }, {
        params: { key: process.env.GOOGLE_API_KEY },
        timeout: 10000
      });

      const result = {
        isMalicious: response.data.matches && response.data.matches.length > 0,
        matches: response.data.matches || [],
        threatTypes: response.data.matches?.map(m => m.threatType) || [],
        timestamp: new Date().toISOString(),
        source: 'google_safe_browsing'
      };

      // Cache the result
      await cache.setex(cacheKey, 300, JSON.stringify(result));
      return result;
    } catch (error) {
      logger.error('Google Web Risk check failed:', { url, error: error.message });
      // Return safe result on API failure (fail-open approach)
      return {
        isMalicious: false,
        matches: [],
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  _isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new GoogleWebRiskService();
