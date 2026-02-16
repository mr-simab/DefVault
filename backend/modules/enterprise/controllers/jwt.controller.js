const jwt = require('jsonwebtoken');
const jwtConfig = require('../../config/jwt');
const logger = require('../../config/logger');
const redis = require('../../config/redis');

/**
 * Enterprise JWT Token Controller
 * Issues, verifies, and revokes JWT tokens
 */

exports.issueToken = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { gridId, gridScore, metadata } = req.body;

    if (!gridId || gridScore === undefined) {
      return res.status(400).json({
        error: 'Grid ID and score required',
        code: 'INVALID_INPUT'
      });
    }

    // Verify grid score meets threshold (e.g., >= 80%)
    if (gridScore < 80) {
      return res.status(403).json({
        error: 'Canvas score too low for token issuance',
        code: 'SCORE_TOO_LOW',
        score: gridScore,
        threshold: 80
      });
    }

    // Create JWT token
    const payload = {
      userId,
      email: req.user.email,
      clientName: req.user.clientName,
      accountType: 'enterprise',
      gridId,
      gridScore,
      metadata: metadata || {},
      issuedAt: Date.now()
    };

    const token = jwt.sign(payload, jwtConfig.privateKey, {
      algorithm: 'RS256',
      expiresIn: '24h',
      issuer: 'DefVault:Enterprise',
      subject: userId
    });

    // Store token in Redis for tracking
    await redis.setex(`jwt:enterprise:${userId}:${gridId}`, 86400, token);

    logger.info(`Enterprise JWT token issued for user ${userId}`, {
      module: 'enterprise',
      controller: 'jwt',
      action: 'issue',
      gridId,
      score: gridScore
    });

    res.status(200).json({
      token,
      expiresIn: 86400, // 24 hours in seconds
      tokenType: 'Bearer',
      gridId,
      issuedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('JWT issuance error', { error: error.message });
    next(error);
  }
};

exports.verifyToken = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token required',
        code: 'MISSING_TOKEN'
      });
    }

    // Verify token signature and expiration
    const decoded = jwt.verify(token, jwtConfig.publicKey, {
      algorithms: ['RS256'],
      issuer: 'DefVault:Enterprise'
    });

    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`jwt:blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        valid: false,
        message: 'Token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }

    logger.info(`Enterprise JWT verified for user ${decoded.userId}`, {
      module: 'enterprise',
      controller: 'jwt',
      action: 'verify'
    });

    res.status(200).json({
      valid: true,
      decoded: {
        userId: decoded.userId,
        email: decoded.email,
        clientName: decoded.clientName,
        accountType: decoded.accountType,
        gridScore: decoded.gridScore,
        iat: decoded.iat,
        exp: decoded.exp
      },
      expiresIn: Math.floor((decoded.exp * 1000 - Date.now()) / 1000)
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        valid: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
        expiredAt: new Date(error.expiredAt).toISOString()
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        valid: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    logger.error('JWT verification error', { error: error.message });
    next(error);
  }
};

exports.revokeToken = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token required',
        code: 'MISSING_TOKEN'
      });
    }

    // Decode token to get expiration
    let decoded;
    try {
      decoded = jwt.decode(token);
    } catch (e) {
      return res.status(400).json({
        error: 'Invalid token format',
        code: 'INVALID_TOKEN'
      });
    }

    if (!decoded) {
      return res.status(400).json({
        error: 'Could not decode token',
        code: 'DECODE_ERROR'
      });
    }

    // Add to blacklist with TTL = token expiration time
    const ttl = Math.floor((decoded.exp * 1000 - Date.now()) / 1000);
    if (ttl > 0) {
      await redis.setex(`jwt:blacklist:${token}`, ttl, 'revoked');
    }

    logger.info(`Enterprise JWT token revoked for user ${decoded.userId || 'unknown'}`, {
      module: 'enterprise',
      controller: 'jwt',
      action: 'revoke'
    });

    res.status(200).json({ message: 'Token revoked successfully' });
  } catch (error) {
    logger.error('Token revocation error', { error: error.message });
    next(error);
  }
};

exports.getTokenInfo = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({
        error: 'Authorization header missing or invalid',
        code: 'MISSING_AUTH_HEADER'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.decode(token);

    if (!decoded) {
      return res.status(400).json({
        error: 'Could not decode token',
        code: 'DECODE_ERROR'
      });
    }

    res.status(200).json({
      token: {
        userId: decoded.userId,
        email: decoded.email,
        clientName: decoded.clientName,
        accountType: decoded.accountType,
        gridScore: decoded.gridScore,
        issuedAt: new Date(decoded.iat * 1000).toISOString(),
        expiresAt: new Date(decoded.exp * 1000).toISOString(),
        expiresIn: Math.floor((decoded.exp * 1000 - Date.now()) / 1000)
      }
    });
  } catch (error) {
    logger.error('Error fetching token info', { error: error.message });
    next(error);
  }
};
