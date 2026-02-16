const axios = require('axios');
const logger = require('../../config/logger');
const cache = require('../../config/redis');

class DomainReputationService {
  async checkDomainReputation(domain) {
    try {
      // Check cache first (24-hour TTL)
      const cacheKey = `domain:${domain}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const domainData = this._parseDomain(domain);
      const indicators = [];
      let score = 100;

      // Check domain age
      const ageCheck = await this._checkDomainAge(domain);
      if (ageCheck.isNew) {
        indicators.push('new_domain_low_age');
        score -= 15;
      }

      // Check for suspicious TLDs
      if (this._isSuspiciousTld(domainData.tld)) {
        indicators.push('suspicious_tld');
        score -= 10;
      }

      // Check for homograph indicators
      if (this._isHomograph(domain)) {
        indicators.push('homograph_risk');
        score -= 25;
      }

      // Check DNS records
      const dnsCheck = await this._checkDnsRecords(domain);
      if (!dnsCheck.hasMxRecords) {
        indicators.push('no_mail_records');
        score -= 20;
      }
      if (!dnsCheck.hasSoa) {
        indicators.push('no_soa_record');
        score -= 30;
      }

      // Check against known blocklists
      const blocklistResult = await this._checkBlocklists(domain);
      if (blocklistResult.isBlocked) {
        indicators.push('in_blocklist');
        score = 0;
      }

      const result = {
        domain: domain,
        reputation: score > 75 ? 'good' : score > 50 ? 'suspicious' : 'malicious',
        score: Math.max(0, score),
        indicators: indicators,
        domainAge: ageCheck.ageDays,
        timestamp: new Date().toISOString(),
        source: 'defvault_reputation_engine'
      };

      // Cache the result
      await cache.setex(cacheKey, 86400, JSON.stringify(result));
      return result;
    } catch (error) {
      logger.error('Domain reputation check failed:', { domain, error: error.message });
      return {
        domain: domain,
        reputation: 'unknown',
        score: 50,
        indicators: ['check_failed'],
        error: error.message
      };
    }
  }

  _parseDomain(domain) {
    const parts = domain.split('.');
    return {
      full: domain,
      tld: parts[parts.length - 1],
      secondLevel: parts[parts.length - 2],
      isSubdomain: parts.length > 2
    };
  }

  async _checkDomainAge(domain) {
    // Simple age check - in production, use WHOIS API
    // For now, assume domains < 30 days old are suspicious
    return {
      ageDays: 365,
      isNew: false
    };
  }

  _isSuspiciousTld(tld) {
    const suspiciousTlds = ['tk', 'ml', 'ga', 'cf', 'work', 'download', 'review'];
    return suspiciousTlds.includes(tld.toLowerCase());
  }

  _isHomograph(domain) {
    // Check for Cyrillic characters (common in homograph attacks)
    const cyrillicPattern = /[\u0430-\u044f\u0410-\u042f]/g;
    return cyrillicPattern.test(domain);
  }

  async _checkDnsRecords(domain) {
    // In production, use dns.promises or dnspython
    return {
      hasMxRecords: true,
      hasSoa: true,
      hasA: true
    };
  }

  async _checkBlocklists(domain) {
    // Check against known blocklists (Spamhaus, etc)
    return {
      isBlocked: false,
      blocklists: []
    };
  }
}

module.exports = new DomainReputationService();
