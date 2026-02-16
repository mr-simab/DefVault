// Verify JWT token utility (RS256 support)
const crypto = require('crypto');

function base64urlDecode(str) {
  // replace URL-safe chars
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  // pad
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

function parseJsonBase64Url(str) {
  try {
    return JSON.parse(base64urlDecode(str).toString('utf8'));
  } catch (e) {
    return null;
  }
}

function verifyToken(token, publicKeyOrOptions) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, error: 'Invalid token format' };

    const header = parseJsonBase64Url(parts[0]);
    const payload = parseJsonBase64Url(parts[1]);
    const signature = base64urlDecode(parts[2]);

    if (!header || !payload) return { valid: false, error: 'Malformed token' };

    // If a publicKey is provided, verify RS256 signature
    const publicKey = typeof publicKeyOrOptions === 'string' ? publicKeyOrOptions : (publicKeyOrOptions && publicKeyOrOptions.publicKey);

    if (publicKey && header.alg && header.alg.startsWith('RS')) {
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(`${parts[0]}.${parts[1]}`);
      verify.end();
      const ok = verify.verify(publicKey, signature);
      if (!ok) return { valid: false, error: 'Invalid signature' };
    }

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Token expired', payload };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

module.exports = { verifyToken };
