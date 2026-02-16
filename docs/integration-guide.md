# Integration Guide

Quick-start for integrating DefVault into your application.

## Installation

```bash
npm install defvault-connect
```

## Basic Setup

```javascript
import DefVault from 'defvault-connect';

const defvault = new DefVault({
  apiUrl: 'https://api.defvault.com',
  apiKey: process.env.DEFVAULT_API_KEY,
  defaultModule: 'personal'
});
```

## Enterprise Module Example

```javascript
// Login
const session = await defvault.login({
  email: 'company@example.com',
  password: 'password'
}, 'enterprise');

// Generate Canvas Grid
const grid = await defvault.canvas.generate({ clientName: 'Acme' }, session.token);

// Verify Selection
const verified = await defvault.canvas.verify({
  gridId: grid.gridId,
  userSelections: [0, 2, 4, 6],
  timestamp: Date.now()
}, session.token);

// Get JWT Token
const token = await defvault.jwt.issue({
  gridId: grid.gridId,
  gridScore: verified.score
}, session.token);
```

## Personal Module Example

```javascript
// Login
const session = await defvault.login({
  email: 'user@example.com',
  password: 'password'
}, 'personal');

// Scan URL
const analysis = await defvault.threat.analyze({
  url: 'https://example.com'
}, session.token);

console.log(analysis.threatLevel); // 'safe', 'low', 'medium', 'high', 'critical'
```

## Token Verification

```javascript
// Server-side (RS256)
const { verifyToken } = require('defvault-connect/verify-token');
const decoded = verifyToken(token, { publicKey: process.env.DEFVAULT_PUBLIC_KEY });
```

## Error Handling

```javascript
try {
  const result = await defvault.threat.analyze({ url }, session.token);
} catch (error) {
  console.error(error.code, error.message);
}
```

## Best Practices

- Use environment variables for API keys
- Implement error handling and graceful degradation
- Use HTTPS for all communications
- Cache threat analysis results
- Rotate API keys regularly
- Test in sandbox before production

## API Reference

See [API-REFERENCE.md](API-REFERENCE.md) for detailed endpoint documentation.
