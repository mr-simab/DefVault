# DefVault API Reference

DefVault REST API with Enterprise (B2B) and Personal (B2C) modules sharing a core threat detection engine.

---

## 🏗️ Architecture Overview

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

---

## 🔐 Authentication Methods

| Module | Type | Flow |
|--------|------|------|
| **Enterprise** | JWT (RS256) + Canvas Visual Auth | Login → Canvas Generation → Verification → JWT |
| **Personal** | JWT (RS256) + Email/Password | Login/Register → Email Verification → JWT |

**Header Format**: `Authorization: Bearer <token>`

---

## 📋 ENTERPRISE MODULE

### 🔑 Authentication: `/auth`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/enterprise/auth/register` | `POST` | ❌ | Register enterprise account |
| `/api/enterprise/auth/login` | `POST` | ❌ | Login to enterprise account |
| `/api/enterprise/auth/me` | `GET` | ✅ | Get current user profile |

#### Register
```json
POST /api/enterprise/auth/register

{
  "email": "company@example.com",
  "password": "SecurePassword123",
  "username": "john_doe",
  "clientName": "Acme Corporation"
}

✓ 201 Created
{ "userId": "...", "email": "...", "accountType": "enterprise" }
```

#### Login
```json
POST /api/enterprise/auth/login

{
  "email": "company@example.com",
  "password": "SecurePassword123"
}

✓ 200 OK
{ "userId": "...", "email": "...", "username": "...", "accountType": "enterprise" }
```

#### Get Profile
```json
GET /api/enterprise/auth/me

✓ 200 OK
{
  "user": {
    "id": "user_123",
    "email": "company@example.com",
    "username": "john_doe",
    "clientName": "Acme Corporation",
    "accountType": "enterprise",
    "createdAt": "2025-02-14T10:30:00Z"
  }
}
```

---

### Canvas Authentication: `/canvas`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/enterprise/canvas/generate` | `POST` | ✅ | Generate new canvas grid |
| `/api/enterprise/canvas/verify` | `POST` | ✅ | Verify canvas selections |

#### Generate Canvas Grid
```json
POST /api/enterprise/canvas/generate

{ "clientName": "Acme Corporation" }

✓ 200 OK
{
  "gridId": "grid_abc123",
  "grid": [[1,0,1,0], [0,1,0,1], [1,0,1,0], [0,1,0,1]],
  "sessionTtl": 600,
  "instructions": "Click on all the colorful squares"
}
```

#### Verify Canvas Selections
```json
POST /api/enterprise/canvas/verify

{
  "gridId": "grid_abc123",
  "userSelections": [0, 2, 4, 6, 8, 10, 12, 14],
  "timestamp": 1708000200000
}

✓ 200 OK (Success)
{ "verified": true, "score": 95, "nextStep": "jwt-issuance" }

✗ 401 Unauthorized (Failed)
{ "verified": false, "score": 45, "code": "VERIFICATION_FAILED" }
```

---

### 🎟️ JWT Management: `/jwt`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/enterprise/jwt/issue-token` | `POST` | ✅ | Issue new JWT token |
| `/api/enterprise/jwt/verify-token` | `POST` | ✅ | Verify existing token |

#### Issue Token
```json
POST /api/enterprise/jwt/issue-token

{
  "gridId": "grid_abc123",
  "gridScore": 95,
  "metadata": { "ipAddress": "192.168.1.1", "deviceName": "Desktop" }
}

✓ 200 OK
{ "token": "eyJhbGciOiJSUzI1NiIs...", "expiresIn": 86400, "tokenType": "Bearer" }

✗ 403 Forbidden
{ "error": "Canvas score too low", "code": "SCORE_TOO_LOW", "score": 45, "threshold": 80 }
```

#### Verify Token
```json
POST /api/enterprise/jwt/verify-token

{ "token": "eyJhbGciOiJSUzI1NiIs..." }

✓ 200 OK
{
  "valid": true,
  "decoded": { "userId": "user_123", "email": "...", "gridScore": 95, "exp": 1708086600 },
  "expiresIn": 86000
}
```

---

### Audit Logs: `/audit`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/enterprise/audit/logs` | `GET` | ✅ | Get audit logs |
| `/api/enterprise/audit/statistics` | `GET` | ✅ | Get event statistics |

#### Get Logs
```json
GET /api/enterprise/audit/logs?page=1&limit=50&startDate=2025-01-01T00:00:00Z

✓ 200 OK
{
  "logs": [
    {
      "id": "log_123",
      "eventType": "canvas_verification",
      "severity": "low",
      "description": "Canvas verification successful",
      "createdAt": "2025-02-14T10:30:00Z"
    }
  ],
  "pagination": { "total": 150, "page": 1, "limit": 50, "pages": 3 }
}
```

#### Get Statistics
```json
GET /api/enterprise/audit/statistics?period=month

✓ 200 OK
{
  "period": "month",
  "eventBreakdown": { "canvas_verification": 250, "token_issued": 240, "login_success": 245 },
  "severityBreakdown": { "low": 500, "medium": 30, "high": 5, "critical": 0 }
}
```

---

## 👤 PERSONAL MODULE

### Authentication: `/auth`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/personal/auth/register` | `POST` | ❌ | Register personal account |
| `/api/personal/auth/login` | `POST` | ❌ | Login to personal account |
| `/api/personal/auth/change-password` | `POST` | ✅ | Change account password |

#### Register
```json
POST /api/personal/auth/register

{
  "email": "user@gmail.com",
  "password": "SecurePassword123",
  "name": "John Doe"
}

✓ 201 Created
{ "userId": "user_456", "email": "user@gmail.com", "accountType": "personal" }
```

#### Login
```json
POST /api/personal/auth/login

{
  "email": "user@gmail.com",
  "password": "SecurePassword123"
}

✓ 200 OK
{ "userId": "user_456", "email": "user@gmail.com", "name": "John Doe", "gmailConnected": false }
```

#### Change Password
```json
POST /api/personal/auth/change-password

{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456",
  "confirmPassword": "NewPassword456"
}

✓ 200 OK
{ "message": "Password changed successfully" }
```

---

### 📧 Gmail Integration: `/gmail`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/personal/gmail/auth-url` | `GET` | ✅ | Get Gmail auth URL |
| `/api/personal/gmail/connect` | `POST` | ✅ | Connect Gmail account |
| `/api/personal/gmail/emails` | `GET` | ✅ | Fetch Gmail emails |
| `/api/personal/gmail/sync` | `POST` | ✅ | Sync emails & scan |

#### Get Gmail Auth URL
```json
GET /api/personal/gmail/auth-url

✓ 200 OK
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "message": "Redirect to this URL to authorize Gmail access"
}
```

#### Connect Gmail
```json
POST /api/personal/gmail/connect

{
  "code": "4/0AW-pxW8bK...",
  "state": "state_123"
}

✓ 200 OK
{ "connected": true, "email": "user@gmail.com", "message": "Gmail successfully connected" }
```

#### Fetch Emails
```json
GET /api/personal/gmail/emails?limit=10

✓ 200 OK
{
  "emails": [
    {
      "messageId": "msg_123",
      "sender": "sender@example.com",
      "subject": "Important Update",
      "snippet": "This is a preview...",
      "date": "2025-02-14T09:00:00Z"
    }
  ],
  "nextPageToken": "token_456",
  "count": 10
}
```

#### Sync & Scan Emails
```json
POST /api/personal/gmail/sync

✓ 200 OK
{ "synced": 15, "threats": 3, "quarantined": 2, "message": "Email sync initiated" }
```

---

### Threat Scanning: `/threat`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/personal/threat/scan-url` | `POST` | ✅ | Scan URL for threats |
| `/api/personal/threat/scan-email` | `POST` | ✅ | Scan email for threats |
| `/api/personal/threat/logs` | `GET` | ✅ | Get threat logs |
| `/api/personal/threat/summary` | `GET` | ✅ | Get threat summary |

#### Scan URL
```json
POST /api/personal/threat/scan-url

{ "url": "https://example.com/page" }

✓ 200 OK
{
  "url": "https://example.com/page",
  "threatLevel": "safe",
  "threatScore": 5,
  "sources": [
    { "service": "Google Web Risk", "verdict": "SAFE" },
    { "service": "URL Entropy", "entropy": 3.2 }
  ]
}
```

#### Scan Email
```json
POST /api/personal/threat/scan-email

{ "messageId": "msg_123" }

✓ 200 OK
{
  "messageId": "msg_123",
  "threatLevel": "high",
  "threatScore": 78,
  "threats": [
    { "url": "https://phishing-site.com", "threatLevel": "high", "threatScore": 85 }
  ]
}
```

#### Get Threat Logs
```json
GET /api/personal/threat/logs?page=1&limit=50&threatLevel=high

✓ 200 OK
{
  "logs": [
    {
      "id": "log_123",
      "messageId": "msg_123",
      "senderEmail": "sender@example.com",
      "subject": "Suspicious Email",
      "threatLevel": "high",
      "threatScore": 75,
      "createdAt": "2025-02-14T10:30:00Z"
    }
  ],
  "pagination": { "total": 45, "page": 1, "limit": 50, "pages": 1 }
}
```

#### Get Threat Summary
```json
GET /api/personal/threat/summary

✓ 200 OK
{
  "summary": {
    "total": 150,
    "critical": 0,
    "high": 3,
    "medium": 12,
    "low": 35,
    "safe": 100,
    "recentThreats": 5
  }
}
```

---

### 🚫 Quarantine Management: `/quarantine`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/personal/quarantine/list` | `GET` | ✅ | Get quarantined emails |
| `/api/personal/quarantine/recover` | `POST` | ✅ | Recover email |
| `/api/personal/quarantine/delete` | `POST` | ✅ | Delete email |
| `/api/personal/quarantine/bulk-action` | `POST` | ✅ | Bulk action |
| `/api/personal/quarantine/statistics` | `GET` | ✅ | Get statistics |

#### List Quarantined Emails
```json
GET /api/personal/quarantine/list?page=1&limit=50

✓ 200 OK
{
  "quarantined": [
    {
      "messageId": "msg_123",
      "sender": "phisher@fake.com",
      "subject": "Claim your prize!",
      "threatLevel": "critical",
      "quarantinedAt": "2025-02-14T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 5 }
}
```

#### Recover Email
```json
POST /api/personal/quarantine/recover

{ "messageId": "msg_123", "action": "recover" }

✓ 200 OK
{ "message": "Email recovered successfully" }
```

#### Delete Email
```json
POST /api/personal/quarantine/delete

{ "messageId": "msg_123" }

✓ 200 OK
{ "message": "Email deleted permanently" }
```

#### Bulk Action
```json
POST /api/personal/quarantine/bulk-action

{
  "messageIds": ["msg_123", "msg_124", "msg_125"],
  "action": "delete"
}

✓ 200 OK
{ "action": "delete", "total": 3, "successful": 3, "failed": 0 }
```

#### Get Statistics
```json
GET /api/personal/quarantine/statistics

✓ 200 OK
{
  "statistics": {
    "totalQuarantined": 25,
    "byThreatLevel": { "critical": 2, "high": 8, "medium": 15 },
    "recovered": 3,
    "deleted": 5,
    "avgTimeInQuarantine": "2.5 days"
  }
}
```

---

## Health & Status Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/health` | `GET` | ❌ | Service health check |
| `/api/health/db` | `GET` | ❌ | Database connection status |
| `/api/health/redis` | `GET` | ❌ | Redis connection status |

```json
GET /health

✓ 200 OK
{ "status": "OK", "timestamp": "2025-02-14T10:30:00Z", "environment": "production" }
```

---

## ⚠️ Error Handling

### Error Response Format
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

### Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| **200** | Success | Request completed successfully |
| **201** | Created | New resource created |
| **400** | Bad Request | Invalid input, missing fields |
| **401** | Unauthorized | Invalid/expired token |
| **403** | Forbidden | Insufficient permissions |
| **404** | Not Found | Resource doesn't exist |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Server Error | Internal server error |

### Common Error Codes

| Code | Meaning |
|------|---------|
| `INVALID_INPUT` | Required fields missing or invalid format |
| `EMAIL_EXISTS` | Email already registered |
| `LOGIN_FAILED` | Invalid email or password |
| `TOKEN_EXPIRED` | JWT token has expired |
| `INVALID_TOKEN` | JWT signature is invalid |
| `VERIFICATION_FAILED` | Canvas verification failed |
| `SCORE_TOO_LOW` | Canvas score below threshold |
| `ENTERPRISE_ONLY` | Route requires enterprise account |
| `PERSONAL_ONLY` | Route requires personal account |
| `NOT_FOUND` | Resource doesn't exist |

---

## ⏱️ Rate Limiting

| Limit | Rate |
|-------|------|
| **Global** | 100 requests per IP per 15 minutes |
| **Authentication** | 5 requests per minute |
| **Canvas Operations** | 3 requests per minute |
| **Threat Scanning** | 60 requests per hour per user |
| **Gmail Operations** | 30 requests per hour per user |

---

## 🛡️ Fault Isolation

Each module operates independently to prevent cascade failures:

- **Gmail service failure** → Does NOT affect Enterprise module
- **Canvas service failure** → Does NOT affect Personal module
- **Network issues** → Individual services continue (Promise.allSettled)

---

## 📝 Environment Variables Required

| Variable | Purpose | Example |
|----------|---------|---------|
| `JWT_SECRET` | JWT signing secret | `your_secret_key_here` |
| `JWT_PRIVATE_KEY` | RS256 private key | RSA private key content |
| `JWT_PUBLIC_KEY` | RS256 public key | RSA public key content |
| `GOOGLE_API_KEY` | Google Safe Browsing API | API key from Google Cloud |
| `VIRUSTOTAL_API_KEY` | VirusTotal scanning API | API key from VirusTotal |
| `GMAIL_CLIENT_ID` | Gmail OAuth client ID | From Google Console |
| `GMAIL_CLIENT_SECRET` | Gmail OAuth secret | From Google Console |
| `GMAIL_CALLBACK_URL` | Gmail OAuth callback | `http://localhost:3000/api/auth/gmail/callback` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `REDIS_HOST` | Redis server host | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |

See `.env.example` for complete configuration details.

---

## 📚 Version History

| Version | Date | Changes |
|---------|------|---------|
| **2.0.0** | Feb 2025 | Modular architecture with Enterprise & Personal modules |
| **1.0.0** | Jan 2025 | Single dashboard architecture |

---

## 📖 Additional Documentation

- **Route Implementations**: `backend/modules/{enterprise,personal}/routes/`
- **Full Setup Guide**: [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)
- **Architecture Details**: [MODULAR-ARCHITECTURE.md](./MODULAR-ARCHITECTURE.md)
- **Integration Guide**: [integration-guide.md](./integration-guide.md)
