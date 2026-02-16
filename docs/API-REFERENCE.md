# API Reference

DefVault REST API with Enterprise (B2B) and Personal (B2C) modules.

## Overview

```
/api
├── /enterprise         # Business accounts (Canvas auth)
│   ├── /auth          # Login, register, logout
│   ├── /canvas        # Visual authentication
│   ├── /jwt           # Token management
│   └── /audit         # Security logs
├── /personal          # Consumer accounts (Email auth)
│   ├── /auth          # Login, register, logout
│   ├── /threat        # URL/email scanning
│   └── /quarantine    # Email quarantine
└── /health            # Service health checks
```

## Authentication

All endpoints require: `Authorization: Bearer <token>`

**Enterprise**: Login → Canvas Verification → JWT Token
**Personal**: Login → JWT Token

## Enterprise Module

### POST /api/enterprise/auth/login

```json
{
  "email": "company@example.com",
  "password": "password"
}
```

Response: `{ userId, email, accountType: 'enterprise' }`

### POST /api/enterprise/auth/logout

Requires auth token. No body.

### POST /api/enterprise/canvas/generate

```json
{ "clientName": "Acme Corp" }
```

Response: `{ gridId, grid: [[1,0],[0,1]], sessionTtl }`

### POST /api/enterprise/canvas/verify

```json
{
  "gridId": "grid_123",
  "userSelections": [0, 2, 4, 6],
  "timestamp": 1708000200000
}
```

Response: `{ verified: true, score: 95 }`

### POST /api/enterprise/jwt/issue-token

```json
{
  "gridId": "grid_123",
  "gridScore": 95
}
```

Response: `{ token: "jwt_token", expiresIn: 3600 }`

### GET /api/enterprise/audit/logs

Query params: `page=1&limit=50`

Response: `{ logs: [...], total, page }`

## Personal Module

### POST /api/personal/auth/login

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Response: `{ userId, email, accountType: 'personal' }`

### POST /api/personal/threat/scan-url

```json
{ "url": "https://example.com" }
```

Response: `{ threatLevel: 'safe'|'low'|'medium'|'high'|'critical', threatScore: 0-100, sources: [...] }`

### POST /api/personal/threat/scan-email

```json
{ "messageId": "msg_123" }
```

Response: `{ threatLevel, threatScore, details }`

### GET /api/personal/threat/logs

Query params: `page=1&limit=50&threatLevel=high`

Response: `{ logs: [...], total, page }`

### POST /api/personal/quarantine/recover

```json
{ "messageId": "msg_123" }
```

Response: `{ recovered: true }`

### GET /api/personal/quarantine/list

Query params: `page=1&limit=50`

Response: `{ quarantine: [...], total }`

## Health Endpoints

### GET /health

No auth required. Response: `{ status: 'OK', environment }`

### GET /api/health/db

Response: `{ connected: true, latency: 15ms }`

### GET /api/health/redis

Response: `{ connected: true, latency: 5ms }`

## Error Codes

- `401` - Invalid/expired token
- `403` - Insufficient permissions
- `400` - Bad request format
- `404` - Endpoint not found
- `429` - Rate limit exceeded
- `500` - Server error

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `429` - Too many requests
- `500` - Server error

## Rate Limiting

- Global: 100 requests/15 minutes per IP
- Auth: 5 login attempts/15 minutes per email
- Threat scan: 60 scans/hour per user

## For More Details

See route files in `backend/modules/{enterprise,personal}/routes/`
