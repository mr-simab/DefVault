const logger = require('../config/logger');
const googleWebRisk = require('../services/sentinel/googleWebRisk.service');
const urlEntropy = require('../services/sentinel/urlEntropy.service');
const domainReputation = require('../services/sentinel/domainReputation.service');
const nlpPhishing = require('../services/sentinel/nlpPhishing.service');
const emailAuth = require('../services/sentinel/emailAuth.service');
const sslValidation = require('../services/sentinel/sslValidation.service');
const virusTotal = require('../services/sentinel/virusTotal.service');
const apkPermission = require('../services/sentinel/apkPermission.service');
const auditLogger = require('../services/audit/auditLogger.service');

exports.analyzeUrl = async (req, res) => {
  try {
    const { url } = req.body;
    const userId = req.user?.id;
    const ipAddress = req.ip;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter required' });
    }

    // Phase 1: Run all 8 threat detection mechanisms with graceful degradation
    let googleCheck = {};
    let entropy = {};
    let domain = {};
    let phishing = {};
    let email = {};
    let ssl = {};
    let vt = {};
    const failedServices = [];

    // Execute checks with individual error handling
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

    const scanId = require('crypto').randomBytes(8).toString('hex');
    const threatLevel = calculateThreatLevel(googleCheck, entropy, domain, phishing, email, ssl);
    const isMalicious = googleCheck.isMalicious || domain.reputation === 'malicious' || phishing.isPhishing;

    const result = {
      scanId,
      url,
      timestamp: new Date().toISOString(),
      threatLevel,
      isMalicious,
      threats: {
        googleWebRisk: googleCheck,
        urlEntropy: entropy,
        domainReputation: domain,
        nlpPhishing: phishing,
        emailAuth: email,
        sslValidation: ssl,
        virusTotal: vt
      },
      ...(failedServices.length > 0 && { failedServices })
    };

    // Audit the scan
    await auditLogger.logEvent({
      userId,
      sessionId: req.sessionID,
      action: 'url_scanned',
      resource: url,
      details: { threatLevel, malicious: isMalicious, failedServices: failedServices.length },
      ipAddress,
      userAgent: req.headers['user-agent'],
      status: isMalicious ? 'threat_detected' : 'clean'
    }).catch(err => logger.warn('Failed to log audit event:', err.message));

    if (failedServices.length > 0) {
      logger.warn(`URL analysis completed with ${failedServices.length} service failures:`, { url, failedServices });
    } else {
      logger.info(`URL analysis completed: ${url}, Threat: ${threatLevel}`);
    }
    res.json(result);
  } catch (error) {
    logger.error('URL analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      code: 'ANALYSIS_ERROR',
      message: 'Unable to complete analysis. Please try again.'
    });
  }
};

exports.analyzeFile = async (req, res) => {
  try {
    const { fileHash, fileName } = req.body;
    const userId = req.user?.id;

    if (!fileHash) {
      return res.status(400).json({ error: 'File hash required' });
    }

    const failedServices = [];
    let vtAnalysis = {};
    let apkAnalysis = null;

    try {
      vtAnalysis = await virusTotal.scanFile(fileHash);
    } catch (e) {
      failedServices.push({ service: 'virusTotal', error: e.message });
      vtAnalysis = { isMalicious: false, error: 'service_unavailable' };
    }

    if (fileName?.endsWith('.apk') || vtAnalysis.names?.some(n => n.includes('apk'))) {
      try {
        apkAnalysis = await apkPermission.analyzeAPKPermissions(fileHash, vtAnalysis);
      } catch (e) {
        failedServices.push({ service: 'apkPermission', error: e.message });
        apkAnalysis = { isSuspicious: false, error: 'service_unavailable' };
      }
    }

    const result = {
      scanId: require('crypto').randomBytes(8).toString('hex'),
      fileHash,
      fileName,
      timestamp: new Date().toISOString(),
      virusTotal: vtAnalysis,
      apkAnalysis,
      isMalicious: vtAnalysis.isMalicious || apkAnalysis?.isSuspicious,
      ...(failedServices.length > 0 && { failedServices })
    };

    try {
      await auditLogger.logEvent({
        userId,
        sessionId: req.sessionID,
        action: 'file_scanned',
        resource: fileName,
        details: { isMalicious: result.isMalicious, failedServices: failedServices.length },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: result.isMalicious ? 'threat_detected' : 'clean'
      });
    } catch (e) {
      logger.warn('Failed to log audit event:', e.message);
    }

    res.json(result);
  } catch (error) {
    logger.error('File analysis error:', error);
    res.status(500).json({ 
      error: 'File analysis failed',
      code: 'FILE_ANALYSIS_ERROR',
      message: 'Unable to analyze file. Please try again.'
    });
  }
};

exports.getScanResult = async (req, res) => {
  try {
    const { scanId } = req.params;
    res.json({ scanId, status: 'pending' });
  } catch (error) {
    logger.error('Error fetching scan result:', error);
    res.status(500).json({ error: 'Failed to fetch result' });
  }
};

exports.getScanHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 50 } = req.query;
    res.json({ scans: [], total: 0, limit, userId });
  } catch (error) {
    logger.error('Error fetching scan history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

exports.rescanThreat = async (req, res) => {
  try {
    const { scanId } = req.params;
    res.json({ rescanId: scanId, status: 'queued' });
  } catch (error) {
    res.status(500).json({ error: 'Rescan failed' });
  }
};

exports.getThreatIntelligence = async (req, res) => {
  try {
    const { scanId } = req.params;
    res.json({ scanId, intelligence: { source: 'virustotal', updated: new Date() } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve intelligence' });
  }
};

exports.getDailyThreatStats = async (req, res) => {
  try {
    res.json({ date: new Date(), threats: { malware: 0, phishing: 0, totalScanned: 0 } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
};

exports.getThreatTypeStats = async (req, res) => {
  try {
    res.json({ malware: 0, phishing: 0, suspicious: 0, timestamp: new Date() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
};

function calculateThreatLevel(googleCheck, entropy, domain, phishing, email, ssl) {
  let score = 0;
  if (googleCheck.isMalicious) score += 25;
  if (entropy.isAnomalous) score += 15;
  if (domain.reputation !== 'good') score += 20;
  if (phishing.isPhishing) score += 20;
  if (!email.isAuthenticated) score += 10;
  if (!ssl.isValid) score += 10;

  if (score >= 60) return 'critical';
  if (score >= 40) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}
