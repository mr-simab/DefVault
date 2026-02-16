# DefVault SDK

Lightweight Node.js/browser client for DefVault's modular API.

## Installation

```bash
npm install defvault-connect
```

## Quick Start

```javascript
const DefVault = require('defvault-connect');

const defvault = new DefVault({
  apiUrl: 'https://api.defvault.com',
  apiKey: process.env.DEFVAULT_API_KEY,
  defaultModule: 'personal'  // or 'enterprise'
});

// Login
const session = await defvault.login({
  email: 'user@example.com',
  password: 'password'
});

// Analyze URL
const result = await defvault.threat.analyze({
  url: 'https://example.com'
}, session.token);

console.log(result.threatLevel); // 'safe', 'low', 'medium', 'high', 'critical'
```

## Methods

### Authentication

- `register(credentials, module?)` - Create account (personal or enterprise)
- `login(credentials, module?)` - Authenticate user
- `logout(token, module?)` - End session

### Threat Analysis

- `threat.analyze(options, token)` - Scan URL or email
- `threat.list(token)` - Get threat history

### Module-Specific (Enterprise)

- `canvas.generate(options, token)` - Create visual auth grid
- `canvas.verify(selections, token)` - Validate grid response
- `jwt.issue(options, token)` - Generate session token

### Module-Specific (Personal)

- `gmail.getAuthUrl()` - Get Gmail OAuth consent URL
- `gmail.connect(code, token)` - Link Gmail account
- `quarantine.list(token)` - View quarantined emails
- `quarantine.recover(messageId, token)` - Restore email

## Token Verification

### Local Verification (RS256)

```javascript
const { verifyToken } = require('defvault-connect/verify-token');

const decoded = verifyToken(token, {
  publicKey: process.env.DEFVAULT_PUBLIC_KEY
});
```

### Server Verification

```javascript
const isValid = await defvault.jwt.verify(token);
```

## Notes

- SDK auto-routes to correct module endpoint based on `module` parameter
- For browser usage: Enable CORS and avoid embedding API keys in client code
- For server-side: Use local verification with public key to avoid extra network calls
- Requires global `fetch` (Node 18+) or `node-fetch` polyfill

## Complete Documentation

See [integration-guide.md](../docs/integration-guide.md) for comprehensive examples and best practices.