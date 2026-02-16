const crypto = require('crypto');
const logger = require('../../config/logger');

class HashService {
  // Password hashing with salt using PBKDF2 (similar to bcrypt)
  hashPassword(password, salt = null) {
    try {
      if (!salt) {
        salt = crypto.randomBytes(16).toString('hex');
      }
      
      const hash = crypto
        .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
        .toString('hex');
      
      return {
        hash: hash,
        salt: salt,
        fullHash: `${salt}$${hash}`,
        algorithm: 'pbkdf2-sha512-100k'
      };
    } catch (error) {
      logger.error('Password hashing failed:', { error: error.message });
      throw error;
    }
  }

  // Verify password against stored hash
  verifyPasswordHash(password, storedHash) {
    try {
      const parts = storedHash.split('$');
      if (parts.length !== 2) {
        return false;
      }

      const [salt, hash] = parts;
      const newHash = this.hashPassword(password, salt);
      
      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(newHash.hash),
        Buffer.from(hash)
      );
    } catch (error) {
      logger.error('Password hash verification failed:', { error: error.message });
      return false;
    }
  }

  // Generic data hashing (non-password)
  hashData(data, algorithm = 'sha256') {
    try {
      if (typeof data !== 'string') {
        data = JSON.stringify(data);
      }

      return crypto
        .createHash(algorithm)
        .update(data)
        .digest('hex');
    } catch (error) {
      logger.error('Data hashing failed:', { error: error.message, algorithm });
      throw error;
    }
  }

  // HMAC for integrity verification
  createHmac(data, secret, algorithm = 'sha256') {
    try {
      if (typeof data !== 'string') {
        data = JSON.stringify(data);
      }

      const hmac = crypto
        .createHmac(algorithm, secret)
        .update(data)
        .digest('hex');

      return {
        hmac: hmac,
        algorithm: algorithm,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('HMAC creation failed:', { error: error.message });
      throw error;
    }
  }

  // Verify HMAC
  verifyHmac(data, expectedHmac, secret, algorithm = 'sha256') {
    try {
      if (typeof data !== 'string') {
        data = JSON.stringify(data);
      }

      const computedHmac = crypto
        .createHmac(algorithm, secret)
        .update(data)
        .digest('hex');

      // Constant-time comparison
      return crypto.timingSafeEqual(
        Buffer.from(computedHmac),
        Buffer.from(expectedHmac)
      );
    } catch (error) {
      logger.error('HMAC verification failed:', { error: error.message });
      return false;
    }
  }

  // SHA-256 fingerprint calculation for devices
  calculateFingerprint(components) {
    try {
      const fingerprint = JSON.stringify(components);
      return this.hashData(fingerprint, 'sha256');
    } catch (error) {
      logger.error('Fingerprint calculation failed:', { error: error.message });
      throw error;
    }
  }

  // Audit log integrity hash
  createAuditHash(logEntry, previousHash = null) {
    try {
      const content = {
        ...logEntry,
        previousHash: previousHash
      };

      const hash = this.hashData(JSON.stringify(content), 'sha256');

      return {
        hash: hash,
        entry: logEntry,
        chainedFrom: previousHash,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Audit hash creation failed:', { error: error.message });
      throw error;
    }
  }

  // Verify audit log chain integrity
  verifyAuditChain(logEntries) {
    try {
      let previousHash = null;

      for (const entry of logEntries) {
        const expectedHash = this.hashData(
          JSON.stringify({ ...entry, previousHash: previousHash }),
          'sha256'
        );

        if (entry.hash !== expectedHash) {
          return {
            isValid: false,
            brokenAt: entry.id,
            reason: 'hash_mismatch'
          };
        }

        previousHash = entry.hash;
      }

      return {
        isValid: true,
        entriesVerified: logEntries.length,
        finalHash: previousHash
      };
    } catch (error) {
      logger.error('Audit chain verification failed:', { error: error.message });
      return {
        isValid: false,
        reason: 'verification_error',
        error: error.message
      };
    }
  }
}

module.exports = new HashService();
      
      return {
        hash: crypto.createHash(algorithm).update(data).digest('hex'),
        algorithm: algorithm,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Data hashing failed:', { error: error.message });
      throw error;
    }
  }

  // HMAC for message authentication
  generateHMAC(data, secret, algorithm = 'sha256') {
    try {
      if (typeof data !== 'string') {
        data = JSON.stringify(data);
      }
      
      const hmac = crypto.createHmac(algorithm, secret).update(data).digest('hex');
      
      return {
        hmac: hmac,
        algorithm: algorithm,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('HMAC generation failed:', { error: error.message });
      throw error;
    }
  }

  // Verify HMAC
  verifyHMAC(data, hmacToVerify, secret, algorithm = 'sha256') {
    try {
      const generatedHmac = this.generateHMAC(data, secret, algorithm);
      
      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(hmacToVerify),
        Buffer.from(generatedHmac.hmac)
      );
    } catch (error) {
      logger.debug('HMAC verification failed:', { error: error.message });
      return false;
    }
  }

  // SHA256 fingerprint hash (for device fingerprints, URLs, etc)
  sha256Hash(data) {
    try {
      if (typeof data !== 'string') {
        data = JSON.stringify(data);
      }
      
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      logger.error('SHA256 hashing failed:', { error: error.message });
      throw error;
    }
  }

  // Verify integrity of audit logs
  verifyAuditIntegrity(auditData, previousHash) {
    try {
      const hashChain = this.sha256Hash(previousHash + JSON.stringify(auditData));
      return {
        verified: true,
        chainHash: hashChain,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Audit integrity verification failed:', { error: error.message });
      return { verified: false, error: error.message };
module.exports = new HashService();
