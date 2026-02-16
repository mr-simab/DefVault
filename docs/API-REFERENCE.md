# DefVault API Reference

DefVault REST API with Enterprise (B2B) and Personal (B2C) modules sharing a core threat detection engine.

## Architecture Overview

```
/api
├── /enterprise              # Enterprise module (Canvas visual auth)
│   ├── /auth               # User registration & login
│   ├── /canvas             # Canvas-based visual authentication
│   ├── /jwt                # Token issuance & verification
│   └── /audit              # Security event logs & compliance
├── /personal               # Personal module (Gmail integration)
│   ├── /auth               # User registration & login
│   ├── /gmail              # Gmail OAuth & email operations
│   ├── /threat             # URL & email threat scanning
│   └── /quarantine         # Quarantined email management
└── /health                 # System health checks
```

## Authentication

### Enterprise Module
- **Type**: JWT (RS256) + Canvas Visual Authentication  
- **Flow**: Login → Canvas Grid Generation → User Verification → JWT Token Issuance
- **Header**: `Authorization: Bearer <token>`
- **Enforcement**: `accountType === 'enterprise'`

### Personal Module
- **Type**: JWT (RS256) + Email/Password Authentication
- **Flow**: Login/Register → Email Verification → JWT Token Issuance → Optional Gmail OAuth
- **Header**: `Authorization: Bearer <token>`
- **Enforcement**: `accountType === 'personal'`

---

## ENTERPRISE MODULE

### Authentication: `/auth`

**POST /api/enterprise/auth/register**
```json
{
  "email": "company@example.com",
  "password": "SecurePassword123",
  "username": "john_doe",
  "clientName": "Acme Corporation"
}
```
Response `201`: `{ userId, email, accountType: 'enterprise' }`

**POST /api/enterprise/auth/login**
```json
{
  "email": "company@example.com",
  "password": "SecurePassword123"
}
```
Response `200`: `{ userId, email, username, clientName, accountType: 'enterprise' }`

**GET /api/enterprise/auth/me** (Auth required)  
Response `200`: `{ user: { id, email, username, clientName, accountType, createdAt } }`

### Canvas Authentication: `/canvas`

**POST /api/enterprise/canvas/generate** (Auth required)
```json
{ "clientName": "Acme Corporation" }
```
Response `200`: `{ gridId, grid: [[1,0,1,0]...], sessionTtl: 600, instructions }`

**POST /api/enterprise/canvas/verify** (Auth required)
```json
{
  "gridId": "grid_abc123",
  "userSelections": [0, 2, 4, 6, 8, 10, 12, 14],
  "timestamp": 1708000200000
}
```
Response `200`: `{ verified: true, score: 95, message, nextStep: 'jwt-issuance' }`  
Response `401`: `{ verified: false, score: 45, message, code: 'VERIFICATION_FAILED' }`

### JWT Management: `/jwt`

**POST /api/enterprise/jwt/issue-token** (Auth required)
```json
{
  "gridId": "grid_abc123",
  "gridScore": 95,
  "metadata": { "ipAddress": "192.168.1.1", "deviceName": "Desktop" }
}
```
Response `200`: `{ token, expiresIn: 86400, tokenType: 'Bearer', issuedAt }`  
Response `403`: `{ error: 'Canvas score too low', code: 'SCORE_TOO_LOW', score: 45, threshold: 80 }`

**POST /api/enterprise/jwt/verify-token** (Auth required)
```json
{ "token": "eyJhbGciOiJSUzI1NiIs..." }
```
Response `200`: `{ valid: true, decoded: { userId, email, clientName, gridScore, iat, exp }, expiresIn }`

### Audit Logs: `/audit`

**GET /api/enterprise/audit/logs** (Auth required)  
Query: `?page=1&limit=50&startDate=2025-01-01T00:00:00Z&endDate=2025-02-14T23:59:59Z`  
Response `200`: `{ logs: [...], pagination: { total, page, limit, pages } }`

**GET /api/enterprise/audit/statistics** (Auth required)  
Query: `?period=month&startDate=2025-01-14T00:00:00Z`  
Response `200`: `{ period, startDate, endDate, eventBreakdown: {...}, severityBreakdown: {...} }`

---

## PERSONAL MODULE

### Authentication: `/auth`

**POST /api/personal/auth/register**
```json
{
  "email": "user@gmail.com",
  "password": "SecurePassword123",
  "name": "John Doe"
}
```
Response `201`: `{ userId, email, accountType: 'personal' }`

**POST /api/personal/auth/login**
```json
{
  "email": "user@gmail.com",
  "password": "SecurePassword123"
}
```
Response `200`: `{ userId, email, name, accountType: 'personal', gmailConnected: false }`

**POST /api/personal/auth/change-password** (Auth required)
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456",
  "confirmPassword": "NewPassword456"
}
```
Response `200`: `{ message: 'Password changed successfully' }`

### Gmail Integration: `/gmail`

**GET /api/personal/gmail/auth-url** (Auth required)  
Response `200`: `{ authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?...', message }`

**POST /api/personal/gmail/connect** (Auth required)
```json
{
  "code": "4/0AW-pxW8bK...",
  "state": "state_123"
}
```
Response `200`: `{ connected: true, email, message: 'Gmail successfully connected' }`

**GET /api/personal/gmail/emails** (Auth required)  
Query: `?limit=10`  
Response `200`: `{ emails: [{messageId, sender, subject, snippet, date}...], nextPageToken, count }`

**POST /api/personal/gmail/sync** (Auth required)  
Response `200`: `{ synced: 15, threats: 3, quarantined: 2, message }`

### Threat Scanning: `/threat`

**POST /api/personal/threat/scan-url** (Auth required)
```json
{ "url": "https://example.com/page" }
```
Response `200`: `{ url, threatLevel: 'safe'|'low'|'medium'|'high'|'critical', threatScore: 0-100, sources: [...] }`

**POST /api/personal/threat/scan-email** (Auth required)
```json
{ "messageId": "msg_123" }
```
Response `200`: `{ messageId, threatLevel, threatScore, threatCount, threats: [{url, threatLevel, threatScore, sources}...], senderEmail, subject }`

**GET /api/personal/threat/logs** (Auth required)  
Query: `?page=1&limit=50&threatLevel=high`  
Response `200`: `{ logs: [...], pagination: { total, page, limit, pages } }`

**GET /api/personal/threat/summary** (Auth required)  
Response `200`: `{ summary: { total, critical: 0, high: 3, medium: 12, low: 35, safe: 100, recentThreats: 5 } }`

### Quarantine Management: `/quarantine`

**GET /api/personal/quarantine/list** (Auth required)  
Query: `?page=1&limit=50&status=active`  
Response `200`: `{ quarantined: [{messageId, sender, subject, threatLevel, quarantinedAt, reason}...], pagination }`

**POST /api/personal/quarantine/recover** (Auth required)
```json
{
  "messageId": "msg_123",
  "action": "recover"
}
```
Response `200`: `{ message: 'Email recovered successfully', action: 'recovered' }`

**POST /api/personal/quarantine/bulk-action** (Auth required)
```json
{
  "messageIds": ["msg_123", "msg_124"],
  "action": "delete"
}
```
Response `200`: `{ action, total: 3, successful: 3, failed: 0 }`

**GET /api/personal/quarantine/statistics** (Auth required)  
Response `200`: `{ statistics: { totalQuarantined: 25, byThreatLevel: {...}, recovered: 3, deleted: 5, avgTimeInQuarantine: '2.5 days' } }`

---

## Health & Status

**GET /health** (No auth required)  
Response `200`: `{ status: 'OK', timestamp, environment }`

**GET /api/health/db**  
Response `200`: `{ connected: true, latency: 15ms }`

**GET /api/health/redis**  
Response `200`: `{ connected: true, latency: 5ms }`

---

## Error Handling

All errors follow this format:
```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

**Common Status Codes**
- `200` - Success
- `201` - Created
- `400` - Bad request (invalid input)
- `401` - Unauthorized (invalid/expired token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `429` - Rate limit exceeded
- `500` - Internal server error

**Common Error Codes**
- `INVALID_INPUT` - Required fields missing
- `EMAIL_EXISTS` - Email already registered
- `LOGIN_FAILED` - Invalid credentials
- `TOKEN_EXPIRED` - JWT token expired
- `INVALID_TOKEN` - JWT signature invalid
- `VERIFICATION_FAILED` - Canvas verification failed
- `SCORE_TOO_LOW` - Canvas score below threshold
- `ENTERPRISE_ONLY` - Endpoint requires enterprise account
- `PERSONAL_ONLY` - Endpoint requires personal account

## Rate Limiting

**Global**: 100 requests per IP per 15 minutes

**Module-Specific**:
- Authentication: 5 requests per minute
- Canvas operations: 3 requests per minute
- Threat scanning: 60 requests per hour per user
- Gmail operations: 30 requests per hour per user

## Fault Isolation

Each module operates independently to prevent cascade failures:
- Gmail service failure → Does not affect Enterprise module
- Canvas service failure → Does not affect Personal module
- Network issues → Individual services continue with degraded functionality (Promise.allSettled)

## Environment Variables Required

Key `.env` variables for API:
- `JWT_SECRET` - JWT signing secret
- `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` - RSA keys for RS256
- `GOOGLE_API_KEY` - Google Safe Browsing API
- `VIRUSTOTAL_API_KEY` - VirusTotal scanning API
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_CALLBACK_URL` - Gmail OAuth
- `DATABASE_URL` or `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

See `.env.example` for complete configuration details.

## Version & Documentation

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | Feb 2025 | Modular architecture with Enterprise & Personal modules |
| 1.0.0 | Jan 2025 | Single dashboard architecture |

For route implementations, see: `backend/modules/{enterprise,personal}/routes/`
