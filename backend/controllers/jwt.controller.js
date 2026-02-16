const logger = require('../config/logger');
const jwtSigner = require('../services/crypto/jwtSigner.service');
const auditLogger = require('../services/audit/auditLogger.service');

// Phase 4: JWT Handshake (Cryptographic Security)

exports.issueToken = async (req, res) => {
  try {
    const { userId, gridSessionId } = req.body;

    if (!userId || !gridSessionId) {
      return res.status(400).json({ error: 'userId and gridSessionId required' });
    }

    // Issue access token (60-second TTL)
    const accessToken = jwtSigner.signToken(
      {
        userId,
        gridSessionId,
        type: 'access'
      },
      'access'
    );

    // Issue refresh token (1-hour TTL)
    const refreshToken = jwtSigner.signToken(
      {
        userId,
        gridSessionId,
        type: 'refresh'
      },
      'refresh'
    );

    await auditLogger.logEvent({
      userId,
      sessionId: req.sessionID,
      action: 'jwt_issued',
      resource: 'phase_4_cryptographic_handshake',
      details: { jti: accessToken.jti },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
      expiresIn: accessToken.expiresIn,
      tokenType: 'Bearer',
      phase: 4,
      nextPhase: 'bank_verification'
    });
  } catch (error) {
    logger.error('JWT issuance failed:', error);
    res.status(500).json({ error: 'Token issuance failed' });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'token required' });
    }

    const verification = jwtSigner.verifyToken(token);

    if (!verification.isValid) {
      await auditLogger.logEvent({
        userId: verification.decoded?.userId,
        sessionId: req.sessionID,
        action: 'jwt_verification_failed',
        resource: 'token_verification',
        details: { reason: verification.reason },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'failed'
      });
    }

    res.json({
      isValid: verification.isValid,
      userId: verification.userId,
      jti: verification.jti,
      suspiciousActivity: verification.suspiciousActivity || false,
      reason: !verification.isValid ? verification.reason : null
    });
  } catch (error) {
    logger.error('Token verification failed:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const userId = req.user?.id;

    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken required' });
    }

    const verification = jwtSigner.verifyToken(refreshToken);

    if (!verification.isValid) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Issue new access token
    const newAccessToken = jwtSigner.signToken(
      {
        userId: verification.userId,
        type: 'access'
      },
      'access'
    );

    res.json({
      accessToken: newAccessToken.token,
      expiresIn: newAccessToken.expiresIn,
      tokenType: 'Bearer'
    });
  } catch (error) {
    logger.error('Token refresh failed:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

exports.revokeToken = async (req, res) => {
  try {
    const { jti } = req.params;
    const userId = req.user?.id;

    jwtSigner.revokeToken(jti);

    await auditLogger.logEvent({
      userId,
      sessionId: req.sessionID,
      action: 'jwt_revoked',
      resource: jti,
      details: {},
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({ revoked: true, jti });
  } catch (error) {
    logger.error('Token revocation failed:', error);
    res.status(500).json({ error: 'Revocation failed' });
  }
};

exports.getTokenStatus = async (req, res) => {
  try {
    const { jti } = req.params;
    res.json({ jti, status: 'active' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve token status' });
  }
};
