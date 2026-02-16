const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Simple key generator that writes keys to ./secrets (local dev only)
const outDir = path.join(__dirname, '..', 'secrets');

function generateKeys() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  const pubPath = path.join(outDir, 'defvault_public.pem');
  const privPath = path.join(outDir, 'defvault_private.pem');

  fs.writeFileSync(pubPath, publicKey, { mode: 0o600 });
  fs.writeFileSync(privPath, privateKey, { mode: 0o600 });

  console.log('Generated RSA key pair to:', outDir);
  console.log('PUBLIC:', pubPath);
  console.log('PRIVATE:', privPath);
  console.log('Note: These files are for local development only. Secure keys in production.');
}

if (require.main === module) generateKeys();

module.exports = generateKeys;
