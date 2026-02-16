const dns = require('dns').promises;
const logger = require('../../config/logger');
const cache = require('../../config/redis');

class EmailAuthService {
  async validateEmailAuth(domain) {
    try {
      // Check cache first (7-day TTL for email auth records)
      const cacheKey = `email_auth:${domain}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const dkimCheck = await this._checkDkim(domain);
      const spfCheck = await this._checkSpf(domain);
      const dmarcCheck = await this._checkDmarc(domain);

      const isAuthenticated = dkimCheck.configured && spfCheck.configured && dmarcCheck.configured;
      const authenticationScore = this._calculateAuthScore(dkimCheck, spfCheck, dmarcCheck);

      const result = {
        domain: domain,
        dkim: dkimCheck,
        spf: spfCheck,
        dmarc: dmarcCheck,
        isAuthenticated: isAuthenticated,
        authenticationScore: parseFloat(authenticationScore.toFixed(2)),
        riskLevel: this._assessRiskLevel(isAuthenticated, authenticationScore),
        timestamp: new Date().toISOString(),
        source: 'email_authentication_check'
      };

      // Cache for 7 days
      await cache.setex(cacheKey, 604800, JSON.stringify(result));
      return result;
    } catch (error) {
      logger.error('Email authentication check failed:', { domain, error: error.message });
      return {
        domain: domain,
        dkim: { configured: false, status: 'error' },
        spf: { configured: false, status: 'error' },
        dmarc: { configured: false, status: 'error' },
        isAuthenticated: false,
        authenticationScore: 0,
        error: error.message
      };
    }
  }

  async _checkDkim(domain) {
    try {
      // Default DKIM selector (most common)
      const dkimSelector = 'default';
      const dkimRecord = `${dkimSelector}._domainkey.${domain}`;
      
      const txtRecords = await dns.resolveTxt(dkimRecord);
      const hasValidDkim = txtRecords && txtRecords.length > 0;

      return {
        configured: hasValidDkim,
        status: hasValidDkim ? 'pass' : 'none',
        selector: dkimSelector,
        keyPresent: hasValidDkim
      };
    } catch (error) {
      logger.debug(`DKIM check failed for ${domain}:`, error.message);
      return {
        configured: false,
        status: 'fail',
        error: error.message
      };
    }
  }

  async _checkSpf(domain) {
    try {
      const txtRecords = await dns.resolveTxt(domain);
      const spfRecord = txtRecords?.find(record => 
        record.join('').startsWith('v=spf1')
      )?.join('');

      if (!spfRecord) {
        return {
          configured: false,
          status: 'none',
          record: null
        };
      }

      // Check SPF policy strength
      const hasQualifier = spfRecord.includes('-all'); // hard fail
      const hasSoftFail = spfRecord.includes('~all'); // soft fail

      return {
        configured: true,
        status: hasQualifier ? 'pass' : hasSoftFail ? 'softfail' : 'neutral',
        record: spfRecord,
        policy: hasQualifier ? 'hard_fail' : hasSoftFail ? 'soft_fail' : 'neutral'
      };
    } catch (error) {
      logger.debug(`SPF check failed for ${domain}:`, error.message);
      return {
        configured: false,
        status: 'error',
        error: error.message
      };
    }
  }

  async _checkDmarc(domain) {
    try {
      const dmarcRecord = `_dmarc.${domain}`;
      const txtRecords = await dns.resolveTxt(dmarcRecord);
      const dmarcPolicy = txtRecords?.find(record => 
        record.join('').startsWith('v=DMARC1')
      )?.join('');

      if (!dmarcPolicy) {
        return {
          configured: false,
          status: 'none',
          policy: null
        };
      }

      // Extract policy from DMARC record
      const policyMatch = dmarcPolicy.match(/p=([a-z]+)/);
      const policy = policyMatch ? policyMatch[1] : 'none';

      return {
        configured: true,
        status: 'pass',
        record: dmarcPolicy,
        policy: policy
      };
    } catch (error) {
      logger.debug(`DMARC check failed for ${domain}:`, error.message);
      return {
        configured: false,
        status: 'error',
        error: error.message
      };
    }
  }

  _calculateAuthScore(dkimCheck, spfCheck, dmarcCheck) {
    let score = 0;
    
    // DKIM: up to 30 points
    if (dkimCheck.configured && dkimCheck.status === 'pass') score += 30;
    
    // SPF: up to 35 points
    if (spfCheck.configured && spfCheck.status === 'pass') score += 35;
    else if (spfCheck.configured && spfCheck.status === 'softfail') score += 20;
    
    // DMARC: up to 35 points
    if (dmarcCheck.configured && dmarcCheck.status === 'pass') {
      if (dmarcCheck.policy === 'reject') score += 35;
      else if (dmarcCheck.policy === 'quarantine') score += 25;
      else score += 15;
    }
    
    return score;
  }

  _assessRiskLevel(isAuthenticated, score) {
    if (!isAuthenticated) return 'high';
    if (score >= 90) return 'low';
    if (score >= 60) return 'medium';
    return 'high';
  }
}

module.exports = new EmailAuthService();
