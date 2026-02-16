const axios = require('axios');
const logger = require('../../config/logger');
const cache = require('../../config/redis');

class VirusTotalService {
  constructor() {
    this.apiUrl = 'https://www.virustotal.com/api/v3';
    this.maxRetries = 3;
  }

  async scanUrl(url) {
    try {
      // Check cache first (1-hour TTL)
      const cacheKey = `vt_url:${url}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const response = await axios.post(
        `${this.apiUrl}/urls`,
        new URLSearchParams({ url: url }),
        {
          headers: {
            'x-apikey': process.env.VIRUSTOTAL_API_KEY
          },
          timeout: 15000
        }
      );

      const result = {
        analysisId: response.data.data.id,
        url: url,
        timestamp: new Date().toISOString()
      };

      // Cache for 1 hour
      await cache.setex(cacheKey, 3600, JSON.stringify(result));
      return result;
    } catch (error) {
      logger.error('VirusTotal URL scan failed:', { url, error: error.message });
      return {
        error: error.message,
        url: url,
        timestamp: new Date().toISOString()
      };
    }
  }

  async scanFile(fileHash) {
    try {
      // Check cache first (7-day TTL for file hashes)
      const cacheKey = `vt_file:${fileHash}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const response = await axios.get(
        `${this.apiUrl}/files/${fileHash}`,
        {
          headers: {
            'x-apikey': process.env.VIRUSTOTAL_API_KEY
          },
          timeout: 15000
        }
      );

      const stats = response.data.data.attributes.last_analysis_stats;
      const names = response.data.data.attributes.names || [];
      const capabilities = response.data.data.attributes.capabilities || [];

      const result = {
        hash: fileHash,
        stats: stats,
        maliciousCount: stats.malicious || 0,
        suspiciousCount: stats.suspicious || 0,
        totalVendors: stats.malicious + stats.suspicious + stats.undetected + stats.type_unsupported,
        names: names,
        capabilities: capabilities,
        isMalicious: (stats.malicious || 0) > 0,
        sourceNames: response.data.data.attributes.meaningful_name || null,
        timestamp: new Date().toISOString(),
        source: 'virustotal'
      };

      // Cache for 7 days
      await cache.setex(cacheKey, 604800, JSON.stringify(result));
      return result;
    } catch (error) {
      logger.error('VirusTotal file scan failed:', { hash: fileHash, error: error.message });
      return {
        error: error.message,
        hash: fileHash,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getAnalysisResult(analysisId) {
    try {
      // Check cache first (5-minute TTL)
      const cacheKey = `vt_analysis:${analysisId}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      let response;
      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        try {
          response = await axios.get(
            `${this.apiUrl}/analyses/${analysisId}`,
            {
              headers: {
                'x-apikey': process.env.VIRUSTOTAL_API_KEY
              },
              timeout: 15000
            }
          );
          break;
        } catch (error) {
          if (error.response?.status === 404 && attempt < this.maxRetries - 1) {
            // Analysis not ready yet, retry after delay
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            throw error;
          }
        }
      }

      const attributes = response.data.data.attributes;
      const stats = attributes.stats;
      
      const result = {
        analysisId: analysisId,
        stats: stats,
        maliciousCount: stats.malicious || 0,
        suspiciousCount: stats.suspicious || 0,
        undetectedCount: stats.undetected || 0,
        status: attributes.status,
        detectionRatio: `${stats.malicious}/${stats.malicious + stats.suspicious + stats.undetected}`,
        isMalicious: (stats.malicious || 0) > 0,
        timestamp: new Date().toISOString(),
        source: 'virustotal'
      };

      // Cache for 5 minutes
      await cache.setex(cacheKey, 300, JSON.stringify(result));
      return result;
    } catch (error) {
      logger.error('VirusTotal result fetch failed:', { analysisId, error: error.message });
      return {
        error: error.message,
        analysisId: analysisId,
        timestamp: new Date().toISOString()
      };
  }
}

module.exports = new VirusTotalService();
