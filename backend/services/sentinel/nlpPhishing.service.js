const logger = require('../../config/logger');

class NLPPhishingService {
  constructor() {
    this.urgencyKeywords = [
      'verify', 'confirm', 'urgent', 'action required', 'click here',
      'immediately', 'asap', 'secure', 'suspended', 'reactivate',
      'unusual activity', 'confirm identity', 'validate account'
    ];
    
    this.phishingIndicators = [
      'verify account', 'confirm password', 'update payment',
      'unusual access', 'unauthorized activity', 'suspicious login'
    ];
    
    this.urgencyPatterns = ['urgent', '24 hours', 'act now', 'limited time'];
  }

  async analyzeContent(content) {
    try {
      if (!content || content.length === 0) {
        return {
          phishingScore: 0,
          isPhishing: false,
          indicators: [],
          confidence: 1.0
        };
      }

      const phishingScore = this._calculatePhishingScore(content);
      const indicators = this._identifyIndicators(content);
      const urgencyLevel = this._assessUrgency(content);
      
      return {
        phishingScore: parseFloat(phishingScore.toFixed(2)),
        isPhishing: phishingScore > 0.6,
        urgencyLevel: urgencyLevel,
        indicators: indicators,
        confidence: Math.min(1.0, 0.7 + (indicators.length * 0.1)),
        timestamp: new Date().toISOString(),
        source: 'nlp_phishing_detector'
      };
    } catch (error) {
      logger.error('NLP phishing analysis failed:', { error: error.message });
      return {
        phishingScore: 0,
        isPhishing: false,
        indicators: ['analysis_error'],
        error: error.message
      };
    }
  }

  _calculatePhishingScore(content) {
    let score = 0;
    const lowerContent = content.toLowerCase();
    
    // Check urgency keywords (each adds up to 0.1 points)
    for (const keyword of this.urgencyKeywords) {
      if (lowerContent.includes(keyword)) {
        score += 0.1;
      }
    }
    
    // Check phishing-specific indicators (each adds up to 0.15 points)
    for (const indicator of this.phishingIndicators) {
      if (lowerContent.includes(indicator)) {
        score += 0.15;
      }
    }
    
    // Check URL count (multiple links = higher risk)
    const urlCount = (lowerContent.match(/https?:\\/\\//g) || []).length;
    if (urlCount > 2) score += 0.2;
    
    // Check for CTA phrases
    const ctaPatterns = /click|login|verify|confirm|update/gi;
    const ctaCount = (content.match(ctaPatterns) || []).length;
    if (ctaCount > 3) score += 0.15;
    
    // Spelling/grammar issues (simple check)
    if (this._hasSpellingIssues(content)) score += 0.1;
    
    // Check for generic greetings
    if (/^dear (user|customer|member)/i.test(content)) score += 0.05;
    
    return Math.min(score, 1.0);
  }

  _identifyIndicators(content) {
    const indicators = [];
    const lowerContent = content.toLowerCase();
    
    // Urgency
    if (/urgent|asap|immediately|[0-9]+ hours?/i.test(content)) {
      indicators.push('urgency_language');
    }
    
    // Account verification requests
    if (/verify|confirm|validate|authenticate/i.test(content)) {
      indicators.push('account_verification_request');
    }
    
    // Threat/penalty language
    if (/suspended|locked|closed|disabled|account will/i.test(content)) {
      indicators.push('threat_language');
    }
    
    // Multiple CTAs
    const ctaCount = (content.match(/click|login|verify|confirm/gi) || []).length;
    if (ctaCount >= 3) indicators.push('multiple_ctas');
    
    // Generic greeting
    if (/^(dear|hello|hi) (user|customer|member|sir|madam)/i.test(content)) {
      indicators.push('generic_greeting');
    }
    
    // Missing personalization
    if (lowerContent.length < 50) indicators.push('unusually_short');
    
    return indicators;
  }

  _assessUrgency(content) {
    const urgencyCount = (content.match(/urgent|asap|immediately|act now/gi) || []).length;
    if (urgencyCount >= 3) return 'critical';
    if (urgencyCount >= 1) return 'high';
    return 'normal';
  }

  _hasSpellingIssues(content) {
    // Simple heuristic - common misspellings
    const misspellings = /verfiy|confrim|passwod|acount|recieve/i;
    return misspellings.test(content);
  }
}

module.exports = new NLPPhishingService();
