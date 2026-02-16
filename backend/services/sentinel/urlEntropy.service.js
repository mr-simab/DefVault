const logger = require('../../config/logger');

class UrlEntropyService {
  calculateEntropy(url) {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const path = urlObj.pathname + urlObj.search;
      
      const domainEntropy = this._shannonEntropy(domain);
      const pathEntropy = this._shannonEntropy(path);
      const overallEntropy = this._shannonEntropy(url);
      
      // High entropy indicates obfuscation (homograph attacks, URL shorteners)
      const isAnomalous = overallEntropy > 5.8 || domainEntropy > 5.2;
      const suspiciousPatterns = this._detectPatterns(url);
      
      return {
        entropy: {
          overall: parseFloat(overallEntropy.toFixed(2)),
          domain: parseFloat(domainEntropy.toFixed(2)),
          path: parseFloat(pathEntropy.toFixed(2))
        },
        isAnomalous: isAnomalous,
        suspiciousPatterns: suspiciousPatterns,
        riskLevel: this._calculateRiskLevel(overallEntropy, suspiciousPatterns),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('URL entropy calculation failed:', { url, error: error.message });
      return {
        entropy: { overall: 0, domain: 0, path: 0 },
        isAnomalous: false,
        suspiciousPatterns: [],
        riskLevel: 'unknown'
      };
    }
  }

  _shannonEntropy(str) {
    if (!str || str.length === 0) return 0;
    
    let entropy = 0;
    const length = str.length;
    const freq = {};
    
    for (let i = 0; i < length; i++) {
      const char = str[i];
      freq[char] = (freq[char] || 0) + 1;
    }
    
    for (const char in freq) {
      const p = freq[char] / length;
      entropy -= p * Math.log2(p);
    }
    
    return entropy;
  }

  _detectPatterns(url) {
    const patterns = [];
    const lowerUrl = url.toLowerCase();
    
    // Homograph attack indicators (Cyrillic characters)
    if (/[\u0430-\u044f]/g.test(lowerUrl)) patterns.push('non_ascii_domain');
    
    // URL shortener patterns
    if (/(bit\.ly|tinyurl|short\.link|qr\.net)/i.test(lowerUrl)) patterns.push('url_shortener');
    
    // Excessive special characters
    if ((lowerUrl.match(/[%@#]/g) || []).length > 3) patterns.push('excessive_special_chars');
    
    // Suspicious subdomains (many levels)
    const subdomainCount = (lowerUrl.match(/\./g) || []).length;
    if (subdomainCount > 4) patterns.push('excessive_subdomains');
    
    // Base64 or hex encoding
    if (/[a-f0-9]{32,}/i.test(lowerUrl)) patterns.push('possible_encoding');
    
    return patterns;
  }

  _calculateRiskLevel(entropy, patterns) {
    let riskScore = 0;
    if (entropy > 5.8) riskScore += 3;
    else if (entropy > 5.5) riskScore += 2;
    else if (entropy > 5.0) riskScore += 1;
    
    riskScore += patterns.length * 2;
    
    if (riskScore >= 7) return 'high';
    if (riskScore >= 4) return 'medium';
    return 'low';
  }
}

module.exports = new UrlEntropyService();
