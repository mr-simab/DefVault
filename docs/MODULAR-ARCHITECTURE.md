# DefVault Modular Architecture Implementation Guide

## Overview

DefVault has been completely restructured into a modular architecture with two distinct product lines running on a shared threat detection engine:

- **Enterprise Module** (B2B): Visual grid authentication + JWT tokens + audit logs
- **Personal Module** (B2C): Email/password + Gmail integration + threat analysis + quarantine
- **Core Services**: Shared threat engine (8 Sentinel services) + security utilities

This document explains how the modular architecture works and how to develop within it.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)                  │
│  ┌──────────────────────────┬─────────────────────────────────┐ │
│  │  Enterprise Dashboard    │    Personal Dashboard           │ │
│  │  - Canvas Authentication │  - Gmail Connection            │ │
│  │  - Session Management    │  - Email List                  │ │
│  │  - Audit Logs            │  - Threat Analysis             │ │
│  │  - JWT Management        │  - Quarantine Management       │ │
│  └────────┬─────────────────┴──────────────┬──────────────────┘ │
└───────────┼──────────────────────────────────┼──────────────────┘
            │                                  │
            │ /api/enterprise/*                │ /api/personal/*
            │                                  │
┌───────────▼──────────────────────────────────▼──────────────────┐
│                     Express.js Gateway (app.js)                 │
│  Routes requests to appropriate module based on URL path        │
└───────────┬──────────────────────────────────┬──────────────────┘
            │                                  │
    ┌───────▼────────────┐          ┌─────────▼────────────┐
    │ Enterprise Module  │          │ Personal Module      │
    │ ─────────────────  │          │ ──────────────────── │
    │ Routes:            │          │ Routes:              │
    │ • auth/            │          │ • auth/              │
    │ • canvas/          │          │ • gmail/             │
    │ • jwt/             │          │ • threat/            │
    │ • audit/           │          │ • quarantine/        │
    │                    │          │                      │
    │ Controllers:       │          │ Controllers:         │
    │ • auth             │          │ • auth               │
    │ • canvas           │          │ • gmail              │
    │ • jwt              │          │ • threat             │
    │ • audit            │          │ • quarantine         │
    │                    │          │                      │
    │ Middlewares:       │          │ Middlewares:         │
    │ • enterpriseAuth   │          │ • personalAuth       │
    │ • rateLimit        │          │ • rateLimit          │
    └────────┬───────────┘          └──────────┬───────────┘
             │                                │
             └────────────────┬─────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │ Core Services      │
                    │ ──────────────────│
                    │ Threat Engine      │
                    │ • Google Web Risk  │
                    │ • Domain Rep       │
                    │ • URL Entropy      │
                    │ • NLP Phishing     │
                    │ • Email Auth       │
                    │ • SSL Validation   │
                    │ • APK Permission   │
                    │ • VirusTotal       │
                    │                    │
                    │ Services:          │
                    │ • auditLogger      │
                    │ • jwtSigner        │
                    │ • keyManager       │
                    │ • emailExtractor   │
                    │ • gmailService     │
                    │ • quarantine       │
                    │ • canvas           │
                    └────────┬───────────┘
                             │
                    ┌────────▼──────────┐
                    │ Databases         │
                    │ ──────────────────│
                    │ PostgreSQL:        │
                    │ • audit_logs      │
                    │ • enterprise_*     │
                    │ • personal_*       │
                    │                    │
                    │ Redis:             │
                    │ • sessions         │
                    │ • threat cache     │
                    │ • grid metadata    │
                    │ • tokens (TTL)     │
                    └────────────────────┘
```

## Directory Structure

```
backend/
├── app.js                          # Main gateway routing to modules
├── server.js                       # Entry point
├── config/                         # Shared configuration
│   ├── database.schema.js         # Supabase schema definitions
│   ├── google.js                  # Google API config
│   ├── jwt.js                     # JWT config (RS256 keys)
│   ├── logger.js                  # Logging configuration
│   ├── redis.js                   # Redis client
│   └── virustotal.js              # VirusTotal API config
├── models/                         # Shared data models
│   ├── User.model.js              # User (both modules)
│   ├── AuditLog.model.js          # Audit logs (shared)
│   ├── ThreatLog.model.js         # Threat logs (shared)
│   └── Session.model.js           # Sessions (shared)
├── middlewares/                    # Shared middlewares
│   ├── auth.middleware.js         # Legacy (will be removed)
│   ├── error.middleware.js        # Error handling
│   ├── rateLimit.middleware.js    # Rate limiting
│   └── requestLogger.middleware.js# Request logging
├── modules/
│   ├── enterprise/                # Enterprise module (B2B)
│   │   ├── routes/
│   │   │   ├── auth.routes.js     # Login, logout, register
│   │   │   ├── canvas.routes.js   # Canvas grid operations
│   │   │   ├── jwt.routes.js      # Token management
│   │   │   └── audit.routes.js    # Security logs
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── canvas.controller.js
│   │   │   ├── jwt.controller.js
│   │   │   └── audit.controller.js
│   │   ├── middlewares/
│   │   │   └── enterpriseAuth.middleware.js  # Enforce accountType
│   │   ├── services/
│   │   │   └── canvas.service.js  # Canvas grid generation
│   │   └── models/                # Module-specific models (if needed)
│   ├── personal/                  # Personal module (B2C)
│   │   ├── routes/
│   │   │   ├── auth.routes.js     # Register, login
│   │   │   ├── gmail.routes.js    # Gmail OAuth & ops
│   │   │   ├── threat.routes.js   # Threat scanning
│   │   │   └── quarantine.routes.js # Email quarantine
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── gmail.controller.js
│   │   │   ├── threat.controller.js
│   │   │   └── quarantine.controller.js
│   │   ├── middlewares/
│   │   │   └── personalAuth.middleware.js   # Enforce accountType
│   │   ├── services/
│   │   │   ├── gmail.service.js            # Gmail OAuth
│   │   │   ├── emailExtractor.service.js   # Email parsing
│   │   │   └── quarantine.service.js       # Quarantine logic
│   │   ├── workers/
│   │   │   └── gmail.worker.js     # Background email monitoring
│   │   └── models/                # Module-specific models (if needed)
│   └── core/                      # Core services (shared)
│       └── services/
│           ├── threat/
│           │   └── threatEngine.service.js  # Main threat analyzer
│           ├── sentinel/           # 8 threat detection services (moved here)
│           │   ├── googleWebRisk.service.js
│           │   ├── urlEntropy.service.js
│           │   ├── domainReputation.service.js
│           │   ├── nlpPhishing.service.js
│           │   ├── emailAuth.service.js
│           │   ├── sslValidation.service.js
│           │   ├── apkPermission.service.js
│           │   └── virusTotal.service.js
│           ├── audit/
│           │   └── auditLogger.service.js
│           ├── crypto/
│           │   ├── hash.service.js
│           │   ├── jwtSigner.service.js
│           │   └── keyManager.service.js
│           └── visual/             # Canvas-related services
│               └── ...
├── utils/                         # Shared utilities
│   ├── constants.js
│   ├── crypto.util.js
│   ├── domainSimilarity.util.js
│   └── entropy.util.js
└── tests/                         # Test suite
    ├── integration.test.js
    ├── sentinel.test.js
    └── ...

frontend/
├── src/
│   ├── main.jsx
│   ├── App.jsx                    # Main app with routing
│   ├── components/
│   │   ├── AccountTypeDetection.jsx        # Route based on JWT
│   │   ├── ModularRouter.jsx               # Module-specific routing
│   │   ├── ModuleErrorBoundary.jsx         # Fault isolation
│   │   ├── layouts/
│   │   │   ├── EnterpriseLayout.jsx       # Enterprise UI shell
│   │   │   └── PersonalLayout.jsx        # Personal UI shell
│   │   └── ...
│   ├── pages/
│   │   ├── Login.jsx              # Shared login page
│   │   ├── enterprise/
│   │   │   ├── Dashboard.jsx     # Canvas grid display
│   │   │   ├── Canvas.jsx        # Canvas operations
│   │   │   └── Audit.jsx         # Audit logs view
│   │   ├── personal/
│   │   │   ├── Dashboard.jsx     # Email list & stats
│   │   │   ├── Gmail.jsx         # Gmail settings
│   │   │   ├── ThreatAnalysis.jsx # URL/email scanning
│   │   │   └── Quarantine.jsx    # Quarantine management
│   │   └── ...
│   ├── services/
│   │   ├── api.service.js         # API client
│   │   ├── auth.service.js        # Auth logic (shared)
│   │   ├── enterprise/
│   │   │   ├── canvas.service.js
│   │   │   ├── audit.service.js
│   │   │   └── jwt.service.js
│   │   └── personal/
│   │       ├── gmail.service.js
│   │       ├── threat.service.js
│   │       └── quarantine.service.js
│   ├── store/                     # Zustand or Redux state
│   │   ├── auth.store.js          # Shared auth state
│   │   ├── enterprise.store.js    # Enterprise state
│   │   └── personal.store.js      # Personal state
│   └── styles/                    # Tailwind CSS
└── public/
```

## Request Flow Examples

### Enterprise: Canvas Authentication

1. User: POST /api/enterprise/auth/login (email/password)
2. Backend: Enterprise auth middleware validates accountType
3. User: POST /api/enterprise/canvas/generate → gets gridId
4. User: POST /api/enterprise/canvas/verify (selections) → verified
5. User: POST /api/enterprise/jwt/issue-token → JWT token issued
6. Token stored, used for all subsequent requests

### Personal: Threat Scanning

1. User: POST /api/personal/auth/login
2. User: POST /api/personal/threat/scan-url (url) → analysis
3. Response: { threatLevel, threatScore, sources }
4. For high-threat emails: POST /api/personal/quarantine/recover
5. Background worker continuously monitors Gmail for threats

## Key Design Patterns

### 1. Fault Isolation (Promise.allSettled)

```javascript
// If any Sentinel service fails, others continue
const results = await Promise.allSettled([
  googleWebRisk.check(url),
  virusTotal.scan(url),
  // ... more services
]);

// Process successful results, track failures
const analysis = results.filter(r => r.status === 'fulfilled');
```

### 2. Module Separation

```javascript
// app.js - Route isolation prevents cross-module access
app.use('/api/enterprise', enterpriseRoutes);
app.use('/api/personal', personalRoutes);

// Each route has its own auth middleware
// Enterprise cannot access personal endpoints and vice versa
```

### 3. Context-Aware Services

```javascript
// Threat engine receives module context
await threatEngine.analyzeUrl(url, {
  module: 'enterprise',  // or 'personal'
  userId: req.user.id,
  source: 'email-scan'
});

// Service logs and behaves differently based on module
```

### 4. Database Schema Logical Separation

**Problem**: Single schema mixing Enterprise and Personal tables

**Solution**: Logical separation with clear naming

```sql
-- Shared tables
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  module VARCHAR(20),  -- 'enterprise' or 'personal'
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(50),
  severity VARCHAR(20),
  created_at TIMESTAMP
);

-- Enterprise tables
CREATE TABLE enterprise_clients (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  accountType = 'enterprise'
);

CREATE TABLE enterprise_sessions (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES enterprise_clients(id),
  canvas_verified BOOLEAN
);

-- Personal tables
CREATE TABLE personal_users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  accountType = 'personal'
);

CREATE TABLE personal_users_gmail (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES personal_users(id),
  gmail_email VARCHAR,
  token_encrypted VARCHAR
);

CREATE TABLE quarantine_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES personal_users(id),
  message_id VARCHAR,
  threat_level VARCHAR(20),
  created_at TIMESTAMP
);
```

### 5. Error Handling per Module

**Problem**: Errors in one module affect user experience in other

**Solution**: Module-specific error boundaries (frontend) and try-catch blocks (backend)

```javascript
// Frontend: ModuleErrorBoundary.jsx
class ModuleErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error(`[${this.props.moduleName} Error]`, error);
    
    // Only show error in current module
    this.setState({ hasError: true });
    // Don't redirect globally - let user retry
  }
}

// Backend: Each controller has try-catch
exports.scanEmail = async (req, res, next) => {
  try {
    // ... logic
  } catch (error) {
    logger.error('Error scanning email', { error: error.message });
    res.status(500).json({
      error: 'Email scan failed',
      code: 'SCAN_ERROR',
      context: req.user.module  // Include module context
    });
  }
};
```

## Development Guidelines

### Adding Enterprise Feature

1. Create: `backend/modules/enterprise/routes/feature.routes.js`
2. Create: `backend/modules/enterprise/controllers/feature.controller.js`
3. Add to `app.js`: `app.use('/api/enterprise/feature', featureRoutes);`
4. Create: `frontend/src/pages/enterprise/Feature.jsx`
5. Test with `accountType === 'enterprise'`

### Adding Personal Feature

1. Create: `backend/modules/personal/routes/feature.routes.js`
2. Create: `backend/modules/personal/controllers/feature.controller.js`
3. Add to `app.js`: `app.use('/api/personal/feature', featureRoutes);`
4. Create: `frontend/src/pages/personal/Feature.jsx`
5. Test with `accountType === 'personal'`

## Troubleshooting

### Module Auth Error

**Problem**: User can't access enterprise endpoints
**Solution**: Check token has `accountType === 'enterprise'` and route starts with `/api/enterprise/`

### Threat Analysis Fails

**Problem**: Service crashes when one Sentinel check fails
**Solution**: Verify threatEngine uses `Promise.allSettled()` not `Promise.all()`

### Gmail Worker Not Running

**Problem**: Background email monitoring not starting
**Solution**: Verify `gmailWorker.start()` called in `server.js`

### Quarantine Not Working

**Problem**: Quarantined emails don't appear
**Solution**: Check Redis keys with `redis-cli KEYS "quarantine:*"`

## Security & Threat Model

### Phase 1: Sentinel (Pre-Login Detection)

8 parallel threat detection mechanisms running via `Promise.allSettled()`:

1. **Google Web Risk** - Real-time Safe Browsing database
2. **Domain Reputation** - Registration age and DNS validation
3. **URL Entropy** - Homograph attacks and typosquatting
4. **NLP Phishing** - Urgency keywords and social engineering
5. **Email Authentication** - DKIM, SPF, DMARC verification
6. **SSL Validation** - Certificate chain verification
7. **APK Permission** - RAT signature detection
8. **VirusTotal** - 90+ antivirus engine hashes

**Graceful Degradation**: If any service fails, others continue. Failed services logged but don't block analysis.

### Phase 3: Canvas (Visual Authentication)

HTML5 Canvas-based grid system (not DOM):
- **Polymorphic grid**: Changes each session
- **Honeytrap detection**: Clicking wrong tiles logs bot attempts
- **Anti-screenshot**: Image data disabled via Canvas API restrictions
- **Anti-injection**: Malware cannot detect or hijack DOM elements

### Phase 4: JWT (Session Binding)

- **Algorithm**: RS256 (asymmetric, 2048-bit RSA)
- **TTL**: 60 seconds (short-lived)
- **Session Binding**: Token scoped to canvas_session_id
- **Risk Embedding**: Threat score in claims
- **No Tracking**: Privacy-by-design (no device fingerprinting)

### Phase 5: Audit & Compliance

Comprehensive logging:
- Every authentication attempt
- All threat detections with full results
- Session lifecycle events
- Admin actions and configuration changes
- Error events and service failures

## References

- **API Documentation**: See [API-REFERENCE.md](API-REFERENCE.md)
- **Integration Guide**: See [integration-guide.md](integration-guide.md)
- **Deployment**: See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)
- **System Diagrams**: See [blueprint.md](../blueprint.md)
