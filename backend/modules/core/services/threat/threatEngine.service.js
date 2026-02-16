const logger = require('../../config/logger');
const cache = require('../../config/redis');

/**
 * Shared Core Threat Engine
 * Used by both Enterprise and Personal modules
 * Performs parallel threat analysis on URLs and files
 */
class ThreatEngineService {
  constructor() {
    this.checkServices = [];
  }

  /**
   * Main threat analysis entry point
   * Runs all checks in parallel with graceful degradation
   */
  async analyzeUrl(url, context = {}) {
    try {
      const failedServices = [];
      let googleCheck = {};
      let entropy = {};
      let domain = {};
      let phishing = {};
      let email = {};
      let ssl = {};
      let vt = {};

      // Import sentinel services
      const googleWebRisk = require('../sentinel/googleWebRisk.service');
      const urlEntropy = require('../sentinel/urlEntropy.service');
      const domainReputation = require('../sentinel/domainReputation.service');
      const nlpPhishing = require('../sentinel/nlpPhishing.service');
      const emailAuth = require('../sentinel/emailAuth.service');
      const sslValidation = require('../sentinel/sslValidation.service');
      const virusTotal = require('../sentinel/virusTotal.service');

      // Run all checks in parallel with graceful degradation
      [googleCheck, entropy, domain, phishing, email, ssl, vt] = await Promise.allSettled([
        googleWebRisk.checkUrl(url).catch(e => {
          failedServices.push({ service: 'googleWebRisk', error: e.message });
          return { isMalicious: false, matches: [], error: 'service_unavailable' };
        }),
        urlEntropy.calculateEntropy(url).catch(e => {
          failedServices.push({ service: 'urlEntropy', error: e.message });
          return { isAnomalous: false, entropy: 0, error: 'service_unavailable' };
        }),
        domainReputation.checkDomainReputation(new URL(url).hostname).catch(e => {
          failedServices.push({ service: 'domainReputation', error: e.message });
          return { reputation: 'unknown', score: 50, error: 'service_unavailable' };
        }),
        nlpPhishing.analyzeContent(url).catch(e => {
          failedServices.push({ service: 'nlpPhishing', error: e.message });
          return { isPhishing: false, phishingScore: 0, error: 'service_unavailable' };
        }),
        emailAuth.validateEmailAuth(new URL(url).hostname).catch(e => {
          failedServices.push({ service: 'emailAuth', error: e.message });
          return { isAuthenticated: true, error: 'service_unavailable' };
        }),
        sslValidation.validateSSL(new URL(url).hostname).catch(e => {
          failedServices.push({ service: 'sslValidation', error: e.message });
          return { isValid: true, error: 'service_unavailable' };
        }),
        virusTotal.scanUrl(url).catch(e => {
          failedServices.push({ service: 'virusTotal', error: e.message });
          return { isMalicious: false, analysisId: null, error: 'service_unavailable' };
        })
      ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : r.reason));

      const threatLevel = this.calculateThreatLevel(googleCheck, entropy, domain, phishing, email, ssl);
      const isMalicious = googleCheck.isMalicious || domain.reputation === 'malicious' || phishing.isPhishing;

      return {
        url,
        threatLevel,
        isMalicious,
        threats: { googleCheck, entropy, domain, phishing, email, ssl, virusTotal: vt },
        failedServices: failedServices.length > 0 ? failedServices : undefined,
        context, // Preserve user context for module-specific handling
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Threat engine analysis failed:', error);
      throw error;
    }
  }

  /**
   * Calculate threat score from all sentinel checks
   */
  calculateThreatLevel(googleCheck, entropy, domain, phishing, email, ssl) {
    let score = 0;
    if (googleCheck.isMalicious) score += 25;
    if (entropy.isAnomalous) score += 15;
    if (domain.reputation === 'malicious') score += 20;
    if (phishing.isPhishing) score += 20;
    if (!email.isAuthenticated) score += 10;
    if (!ssl.isValid) score += 10;

    if (score >= 60) return 'critical';
    if (score >= 40) return 'high';
    if (score >= 20) return 'medium';
    return 'low';
  }

  /**
   * File analysis using VirusTotal
   */
  async analyzeFile(fileHash, context = {}) {
    try {
      const virusTotal = require('../sentinel/virusTotal.service');
      const result = await virusTotal.scanFile(fileHash).catch(e => {
        logger.warn('VirusTotal file scan failed:', e.message);
        return { isMalicious: false, error: 'service_unavailable' };
      });

      return {
        fileHash,
        isMalicious: result.isMalicious,
        virusTotalResult: result,
        context,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('File analysis failed:', error);
      throw error;
    }
  }
}

module.exports = new ThreatEngineService();
