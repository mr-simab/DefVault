const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('../../config/logger');
const cache = require('../../config/redis');

class KeyManagerService {
  constructor() {
    this.keyDirectory = path.join(__dirname, '../../keys');
    this.keyRotationInterval = 86400 * 30; // 30 days in seconds
  }

  generateKeyPair() {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      const keyId = crypto.randomBytes(8).toString('hex');
      
      return {
        keyId: keyId,
        publicKey: publicKey,
        privateKey: privateKey,
        algorithm: 'RSA-2048',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.keyRotationInterval * 1000).toISOString()
      };
    } catch (error) {
      logger.error('Key generation failed:', { error: error.message });
      throw error;
    }
  }

  rotateKeys(oldKeyId) {
    try {
      // Generate new key pair
      const newKeyPair = this.generateKeyPair();
      
      // Store old key for verification window (7 days)
      const oldKeyMetadata = {
        keyId: oldKeyId,
        status: 'deprecated',
        retiredAt: new Date().toISOString(),
        verificationUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      cache.setex(`key:deprecated:${oldKeyId}`, 604800, JSON.stringify(oldKeyMetadata));
      
      logger.info(`Keys rotated. New key: ${newKeyPair.keyId}, Old key: ${oldKeyId}`);
      
      return {
        newKeyPair: newKeyPair,
        deprecatedKeyId: oldKeyId,
        rotatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Key rotation failed:', { error: error.message });
      throw error;
    }
  }

  storeKeySecurely(keyId, publicKey, privateKey) {
    try {
      // Ensure key directory exists
      if (!fs.existsSync(this.keyDirectory)) {
        fs.mkdirSync(this.keyDirectory, { recursive: true });
      }

      // Store private key with restricted permissions
      const privateKeyPath = path.join(this.keyDirectory, `${keyId}.private.pem`);
      fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });

      // Store public key
      const publicKeyPath = path.join(this.keyDirectory, `${keyId}.public.pem`);
      fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });

      // Store metadata in cache
      const keyMetadata = {
        keyId: keyId,
        privateKeyPath: privateKeyPath,
        publicKeyPath: publicKeyPath,
        stored: true,
        storedAt: new Date().toISOString(),
        algorithm: 'RSA-2048'
      };

      cache.setex(`key:metadata:${keyId}`, 2592000, JSON.stringify(keyMetadata)); // 30 days
      
      logger.info(`Key stored securely: ${keyId}`);
      
      return { keyId: keyId, stored: true, paths: { privateKeyPath, publicKeyPath } };
    } catch (error) {
      logger.error('Key storage failed:', { error: error.message, keyId });
      throw error;
    }
  }

  retrievePublicKey(keyId) {
    try {
      const keyPath = path.join(this.keyDirectory, `${keyId}.public.pem`);
      
      if (!fs.existsSync(keyPath)) {
        throw new Error(`Public key not found: ${keyId}`);
      }

      const publicKey = fs.readFileSync(keyPath, 'utf8');
      return publicKey;
    } catch (error) {
      logger.error('Public key retrieval failed:', { error: error.message, keyId });
      throw error;
    }
  }

  retrievePrivateKey(keyId) {
    try {
      const keyPath = path.join(this.keyDirectory, `${keyId}.private.pem`);
      
      if (!fs.existsSync(keyPath)) {
        throw new Error(`Private key not found: ${keyId}`);
      }

      const privateKey = fs.readFileSync(keyPath, 'utf8');
      return privateKey;
    } catch (error) {
      logger.error('Private key retrieval failed:', { error: error.message, keyId });
      throw error;
    }
  }

  listKeys() {
    try {
      if (!fs.existsSync(this.keyDirectory)) {
        return [];
      }

      const files = fs.readdirSync(this.keyDirectory);
      const keys = {};

      files.forEach(file => {
        const match = file.match(/^(.+)\.(private|public)\.pem$/);
        if (match) {
          const keyId = match[1];
          if (!keys[keyId]) {
            keys[keyId] = { keyId, hasPrivate: false, hasPublic: false };
          }
          keys[keyId][`has${match[2].charAt(0).toUpperCase() + match[2].slice(1)}`] = true;
        }
      });

      return Object.values(keys);
    } catch (error) {
      logger.error('Key listing failed:', { error: error.message });
      return [];
    }
  }

  isKeyDeprecated(keyId) {
    try {
      const deprecatedData = cache.getSync(`key:deprecated:${keyId}`);
      return !!deprecatedData;
    } catch (error) {
      logger.error('Deprecation check failed:', { error: error.message, keyId });
      return false;
    }
  }
}

module.exports = new KeyManagerService();
      logger.error('Secure key storage failed:', error);
      throw error;
    }
  }
}

module.exports = new KeyManagerService();
