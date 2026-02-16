const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('../../config/logger');
const cache = require('../../config/redis');

class JWTSignerService {
  constructor() {
    // RS256 (asymmetric) - public key verification by banks
    this.privateKey = process.env.JWT_PRIVATE_KEY || 
      this._loadKeyFile(path.join(__dirname, '../../keys/private.pem'));
    this.publicKey = process.env.JWT_PUBLIC_KEY || 
      this._loadKeyFile(path.join(__dirname, '../../keys/public.pem'));
    
    this.algorithm = 'RS256';
    this.tokenTTL = 60; // 60 seconds - one-time use token
    this.refreshTokenTTL = 3600; // 1 hour
  }

  signToken(payload, tokenType = 'access') {
    try {
      // Ensure critical payload fields
      const tokenPayload = {
        ...payload,
        type: tokenType,
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000),
        jti: crypto.randomBytes(16).toString('hex'), // Unique token ID
      };

      // Device fingerprinting removed: tokens are session-scoped only

      // Add appropriate expiration
      const expiresIn = tokenType === 'access' ? this.tokenTTL : this.refreshTokenTTL;

      const token = jwt.sign(tokenPayload, this.privateKey, {
        expiresIn: expiresIn,
        algorithm: this.algorithm,
        issuer: 'defvault',
        subject: payload.userId,
        audience: 'banking_partner'
      });

      // Track token issuance (prevent replay attacks)
      const tokenRegistry = {
        jti: tokenPayload.jti,
        userId: payload.userId,
        type: tokenType,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        // deviceFingerprint: removed
        used: false
      };

      cache.setex(`token:${tokenPayload.jti}`, expiresIn + 60, JSON.stringify(tokenRegistry));

      logger.info('JWT token issued', { 
        userId: payload.userId, 
        jti: tokenPayload.jti,
        type: tokenType 
      });

      return {
        token: token,
        expiresIn: expiresIn,
        tokenType: tokenType,
        jti: tokenPayload.jti
      };
    } catch (error) {
      logger.error('JWT signing failed:', { error: error.message, payload: payload.userId });
      throw new Error('Failed to sign token');
    }
  }

  verifyToken(token, rejectReplay = true) {
    try {
      // Verify signature with public key
      const decoded = jwt.verify(token, this.publicKey, {
        algorithms: [this.algorithm],
        issuer: 'defvault',
        audience: 'banking_partner'
      });

      // Verify token hasn't been revoked
      const tokenData = cache.getSync(`token:${decoded.jti}`);
      if (!tokenData) {
        return {
          isValid: false,
          reason: 'token_not_found_or_expired',
          decoded: null
        };
      }

      const registry = JSON.parse(tokenData);

      // Prevent replay attacks (one-time use)
      if (rejectReplay && registry.used) {
        logger.warn('Replay attack detected!', { jti: decoded.jti, userId: decoded.userId });
        return {
          isValid: false,
          reason: 'token_already_used',
          decoded: null,
          suspiciousActivity: true
        };
      }

      // Device fingerprint binding removed: skip dfp verification

      // Mark token as used
      registry.used = true;
      registry.usedAt = new Date().toISOString();
      cache.setex(`token:${decoded.jti}`, 60, JSON.stringify(registry));

      return {
        isValid: true,
        decoded: decoded,
        jti: decoded.jti,
        userId: decoded.userId,
        tokenType: decoded.type
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.info('Token expired:', { error: error.message });
        return {
          isValid: false,
          reason: 'token_expired',
          decoded: null
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid JWT:', { error: error.message });
        return {
          isValid: false,
          reason: 'invalid_signature',
          decoded: null
        };
      }

      logger.error('JWT verification failed:', { error: error.message });
      return {
        isValid: false,
        reason: 'verification_error',
        decoded: null,
        error: error.message
      };
    }
  }

  revokeToken(jti) {
    try {
      cache.del(`token:${jti}`);
      logger.info('Token revoked', { jti });
      return { revoked: true, jti };
    } catch (error) {
      logger.error('Token revocation failed:', { error: error.message, jti });
      throw error;
    }
  }

  decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      logger.error('JWT decode failed:', { error: error.message });
      return null;
    }
  }

  _loadKeyFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
      }
    } catch (error) {
      logger.warn(`Could not load key file: ${filePath}`, error.message);
    }
    return null;
}

module.exports = new JWTSignerService();
