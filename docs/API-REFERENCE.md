# DefVault API Reference

DefVault REST API with Enterprise (B2B) and Personal (B2C) modules sharing a core threat detection engine.

---

## 🏗️ Architecture Overview

```
/api
├── /gateway                 # Enterprise B2B Security Gateway
│   ├── /register-enterprise
│   ├── /handshake
│   ├── /challenge
│   ├── /session
│   ├── /ticket
│   └── /audit
│
├── /enterprise              # Enterprise account management
│   ├── /auth
│   ├── /canvas
│   ├── /face
│   ├── /jwt
│   └── /audit
│
├── /personal                # Personal (Gmail protection)
│   ├── /auth
│   ├── /gmail
│   ├── /threat
│   └── /quarantine
│
└── /health

```
## Authentication Methods

| Layer               | Purpose               | Mechanism                    |
| ------------------- | --------------------- | ---------------------------- |
| Enterprise Gateway  | Mutual verification   | Challenge–Response + HMAC    |
| Ticket System       | Session authorization | Short-lived RS256 JWT        |
| Visual Verification | Human validation      | Canvas interaction           |
| Face Authentication | Biometric validation  | AI confidence scoring        |
| API Protection      | Transport security    | HTTPS + Signature validation |

---
# 🔐 ENTERPRISE SECURITY GATEWAY (B2B)

The Gateway module enables secure integration between enterprises and DefVault using challenge–response verification and ticket-based authorization.

## 🏢 Enterprise Registration
**Endpoint**
POST /api/gateway/register-enterprise

**Request**
```json
{
  "enterpriseName": "DEF Bank",
  "callbackUrl": "https://defbank.com/defvault/callback"
}
```

**Response**
```json
{
  "enterpriseId": "ent_789XYZ",
  "clientSecret": "generated_secret",
  "publicKey": "rsa_public_key",
  "status": "approved"
}
```

## 🔄 Handshake Initialization

Enterprise initiates secure connection.

**Endpoint**
POST /api/gateway/handshake/initiate

**Request**
```json
{
  "enterpriseId": "ent_789XYZ",
  "timestamp": 1708000000000,
  "signature": "hmac_signature"
}
```

**Response**
```json
{
  "challengeId": "chal_12345",
  "challengeHash": "A94A8FE5CCB19BA61C4C0873D391E987",
  "algorithm": "SHA256",
  "expiresIn": 60
}
```

Challenge stored with 60-second TTL.

## 🔐 Challenge Verification

Enterprise solves challenge:

responseHash = HASH(challengeHash + HASH(password))

**Endpoint**
POST /api/gateway/challenge/verify

**Request**
```json
{
  "enterpriseId": "ent_789XYZ",
  "challengeId": "chal_12345",
  "responseHash": "calculated_hash"
}
```

**Success Response**
```json
{
  "verified": true,
  "ticket": "TKT_eyJhbGciOiJSUzI1NiIs...",
  "expiresIn": 300
}
```

**Failure Response**
```json
{
  "verified": false,
  "error": "INVALID_CHALLENGE_RESPONSE"
}
```

## 🎟️ Ticket System

Short-lived RS256 signed JWT issued after successful challenge validation.

**Ticket Payload**
```json
{
  "iss": "defvault",
  "enterpriseId": "ent_789XYZ",
  "challengeId": "chal_12345",
  "nonce": "random_string",
  "iat": 1708000000,
  "exp": 1708000300
}
```

**Ticket Validation**
Endpoint
POST /api/gateway/ticket/validate

**Request**
```json
{
  "ticket": "TKT_..."
}
```

**Response**
```json
{
  "valid": true,
  "enterpriseId": "ent_789XYZ",
  "expiresIn": 240
}
```

## 👤 Session Start (User Verification Flow)

Enterprise sends customer for visual + face authentication.

**Endpoint**
POST /api/gateway/session/start

**Request**
```json
{
  "ticket": "TKT_...",
  "customerId": "CUST_7898",
  "deviceFingerprint": "device_hash",
  "ipAddress": "1.2.3.4"
}
```

## 🎨 Canvas Visual Authentication

Generate Canvas
POST /api/enterprise/canvas/generate

Verify Canvas
POST /api/enterprise/canvas/verify

**Response**
```json
{
  "verified": true,
  "score": 94
}
```

## 🧠 Face Authentication

**Endpoint**
POST /api/enterprise/face/verify

**Request**
```json
{
  "customerId": "CUST_7898",
  "faceData": "base64_encoded_image"
}
```

**Response**
```json
{
  "verified": true,
  "confidenceScore": 97
}
```

## ✅ Final Verification Response

After visual + face success:

```json
{
  "customerId": "CUST_7898",
  "enterpriseId": "ent_789XYZ",
  "verificationStatus": "verified",
  "confidenceScore": 97,
  "ticket": "TKT_...",
  "timestamp": 1708000200000,
  "signature": "defvault_signed_signature"
}
```

Enterprise validates:
- Ticket signature
- Expiry
- Nonce
- Verification status
- IP consistency

If valid → Unlock portal
Else → Block access

## 🧾 Gateway Audit Logs

**Endpoint**
GET /api/gateway/audit/logs

**Response**
```json
{
  "logs": [
    {
      "eventType": "challenge_verified",
      "enterpriseId": "ent_789XYZ",
      "severity": "low",
      "timestamp": "2025-02-14T10:30:00Z"
    }
  ]
}
```

## 👤 ENTERPRISE ACCOUNT MODULE

**Authentication**
/api/enterprise/auth/register
/api/enterprise/auth/login
/api/enterprise/auth/me

JWT issued only after full verification chain.

## 👤 PERSONAL MODULE (B2C)

Unaffected by enterprise gateway.

**Authentication**
/api/personal/auth/register
/api/personal/auth/login

**Gmail Integration**
/api/personal/gmail/connect
/api/personal/gmail/emails

**Threat Detection**
/api/personal/threat/scan-url
/api/personal/threat/scan-email

**Quarantine**
/api/personal/quarantine/list

## Rate Limiting

| Category               | Limit        |
| ---------------------- | ------------ |
| Handshake              | 5 per minute |
| Challenge Verification | 5 per minute |
| Session Start          | 3 per minute |
| Canvas                 | 3 per minute |
| Face Auth              | 5 per minute |
| Threat Scanning        | 60 per hour  |

## Error Format

```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

## 🛡️ Security Controls

- HMAC signature validation
- RS256 signed tickets
- Nonce-based replay prevention
- Redis challenge TTL
- Device fingerprint validation
- IP binding
- Full audit logging
- Zero-trust session design

## 🌐 Health Endpoints

GET /health
GET /api/health/db
GET /api/health/redis

## Version

3.0.0

---
Enterprise Security Gateway + Ticket-Based Verification Architecture
