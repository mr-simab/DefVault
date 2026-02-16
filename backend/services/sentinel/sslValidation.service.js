const https = require('https');
const tls = require('tls');
const logger = require('../../config/logger');
const cache = require('../../config/redis');

class SSLValidationService {
  async validateSSL(domain) {
    try {
      // Check cache first (24-hour TTL)
      const cacheKey = `ssl:${domain}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const certificate = await this._fetchCertificate(domain);
      
      if (!certificate) {
        return {
          domain: domain,
          isValid: false,
          reason: 'no_certificate',
          timestamp: new Date().toISOString()
        };
      }

      const validationResult = this._validateCertificate(certificate, domain);
      
      const result = {
        domain: domain,
        isValid: validationResult.isValid,
        certificateIssuer: certificate.issuer?.O || 'Unknown',
        issuedBy: certificate.issuer?.CN || 'Unknown',
        expiryDate: new Date(certificate.valid_to),
        issuedDate: new Date(certificate.valid_from),
        daysUntilExpiry: this._daysUntilExpiry(certificate.valid_to),
        protocol: 'TLS',
        algorithm: certificate.serverName || null,
        subjectAltNames: certificate.subjectaltname || null,
        validationDetails: validationResult.details,
        riskFactors: this._assessRiskFactors(certificate, validationResult),
        timestamp: new Date().toISOString(),
        source: 'ssl_validation_engine'
      };

      // Cache for 24 hours
      await cache.setex(cacheKey, 86400, JSON.stringify(result));
      return result;
    } catch (error) {
      logger.error('SSL validation failed:', { domain, error: error.message });
      return {
        domain: domain,
        isValid: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  _fetchCertificate(domain) {
    return new Promise((resolve, reject) => {
      const options = {
        host: domain,
        port: 443,
        timeout: 5000,
        method: 'HEAD'
      };

      const request = https.request(options, (response) => {
        const cert = response.socket.getPeerCertificate();
        resolve(cert);
      });

      request.on('error', (error) => {
        logger.debug(`Certificate fetch error for ${domain}:`, error.message);
        resolve(null);
      });

      request.on('timeout', () => {
        request.destroy();
        resolve(null);
      });

      request.end();
    });
  }

  _validateCertificate(cert, domain) {
    const details = [];
    let isValid = true;

    // Check expiration
    const expiryDate = new Date(cert.valid_to);
    if (expiryDate < new Date()) {
      details.push('certificate_expired');
      isValid = false;
    } else if (this._daysUntilExpiry(cert.valid_to) < 30) {
      details.push('certificate_expiring_soon');
    }

    // Check domain match
    const subjectCN = cert.subject?.CN || '';
    const subjectAltNames = cert.subjectaltname || '';
    
    const domainMatches = this._checkDomainMatch(domain, subjectCN, subjectAltNames);
    if (!domainMatches) {
      details.push('domain_mismatch');
      isValid = false;
    }

    // Check for self-signed
    if (cert.issuer?.CN === cert.subject?.CN) {
      details.push('self_signed');
      isValid = false;
    }

    // Check certificate chain
    if (cert.ca === undefined || !cert.ca) {
      details.push('certificate_chain_incomplete');
    }

    return { isValid, details };
  }

  _checkDomainMatch(domain, commonName, altNames) {
    const domainLower = domain.toLowerCase();
    
    // Check CN
    if (commonName.toLowerCase() === domainLower || 
        commonName.toLowerCase() === `*.${domainLower.split('.').slice(1).join('.')}`) {
      return true;
    }

    // Check SANs
    if (altNames) {
      const sans = altNames.split(', ').map(s => s.replace('DNS:', '').toLowerCase());
      for (const san of sans) {
        if (san === domainLower || san === `*.${domainLower.split('.').slice(1).join('.')}`) {
          return true;
        }
      }
    }

    return false;
  }

  _daysUntilExpiry(expiryDate) {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  _assessRiskFactors(cert, validation) {
    const risks = [];
    
    if (validation.details.includes('certificate_expired')) risks.push('expired_certificate');
    if (validation.details.includes('certificate_expiring_soon')) risks.push('expiring_soon');
    if (validation.details.includes('domain_mismatch')) risks.push('domain_mismatch');
    if (validation.details.includes('self_signed')) risks.push('self_signed');
    if (validation.details.includes('certificate_chain_incomplete')) risks.push('incomplete_chain');
    
    return risks;
  }
}

module.exports = new SSLValidationService();
