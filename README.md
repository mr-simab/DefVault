# DefVault - Active Defense Against Phishing & RAT Attacks
DefVault detects and stops phishing, malware, and RAT attacks before credentials are exposed, protecting both enterprise infrastructure and individual users while preserving usability.

---

## 🌐 Modular Product Architecture (Platform)

As of the latest refactor (Feb 2026) DefVault runs two operationally-separated product modules on a shared core:

- 🏢 **DefVault Enterprise (B2B)** — Visual authentication (Canvas), short-lived session-bound JWTs, audit logging and enterprise administration.
- 👤 **DefVault Personal (B2C)** — Consumer email protection with Gmail OAuth, continuous email scanning, and automated quarantine.

These modules are implemented under `backend/modules/enterprise` and `backend/modules/personal` and are isolated at the routing and middleware levels. A shared Core Threat Engine (under `backend/modules/core/services/threat`) performs the Sentinel checks used by both modules.

Key guarantees:
- Module isolation: `enterprise` and `personal` routes, middlewares, and data boundaries prevent cross-module failures.
- Shared threat intelligence: a single threat engine provides consistent detections without leaking module data.
- Clear database separation: logical naming conventions (enterprise_*, personal_*, audit_logs) to support retention and compliance.

Read the modular development guide: [docs/MODULAR-ARCHITECTURE.md](docs/MODULAR-ARCHITECTURE.md)

---

## 🚨 Real-World Problem: The Trust Paradox

### The Problem: Why Traditional Authentication Fails

#### Incident #1: **The $2.8M Costa Rica Banking Heist (2024)**
> A financial services company processed a legitimate-looking wire transfer approval that bypassed 2FA. The attacker had:
> - Cloned the banking website perfectly
> - Captured credentials through phishing
> - Used stolen session tokens to hijack authenticated sessions
>
> **Traditional systems verified the password was correct but had no way to detect the phishing origin.**

#### Incident #2: **SWIFT Banking Malware Campaign (2023)**
> Banks in SE Asia lost $155M when malware-infected employee devices approved international transfers. The malware:
> - Injected fake approval screens into legitimate banking sessions
> - Bypassed hardware tokens by mimicking legitimate requests
> - Was undetectable because it operated AFTER authentication
>
> **Password verification is useless once the device is compromised.**

#### Incident #3: **The PMI Group Breach (2024)**
> 2.6M customer records stolen when employees clicked a phishing link. Attackers:
> - Captured credentials in real-time
> - Used them to access backend systems
> - Exfiltrated data before detection
>
> **By the time 2FA kicked in, the attacker already had the password.**

---

## ⚔️ DefVault Solution: The 5-Phase Defense Architecture

### **Phase 1: Sentinel - Pre-Login Threat Interception** 🛡️

**Problem Solved:** Prevents phishing credentials from ever being entered

**How It Works:**
- **Google Web Risk Integration** - Scans URLs against Google's Real-Time Safe Browsing database
- **Domain Reputation Analysis** - Flags domains registered <30 days ago (90% of phishing)
- **URL Entropy Detection** - Identifies homograph attacks (e.g., `amaz0n.com` vs `amazon.com`)
- **NLP Phishing Classification** - Detects urgency words, misspellings, and social engineering patterns
- **Email Authentication Validation** - Verifies DKIM, SPF, DMARC (prevents email spoofing)
- **APK Permission Analysis** - Scans mobile apps for Remote Access Trojan (RAT) signatures
- **VirusTotal Integration** - Checks URL/file hashes against 90+ antivirus engines

**Real-World Impact:**
- Phishing email arrives → DefVault scans sender domain → **BLOCKS if suspicious**
- Employee tries logging in from malware link → **INTERCEPTS before password entered**
- Junior analyst clicks obvious phishing → System detects 13 red flags → **QUARANTINES URL**

**Result:** The Costa Rica heist would be prevented because the cloned banking website would fail Phase 1 checks.

---

### **Phase 2: Authentication Gateway** 

**Problem Solved:** Isolates credential handling from downstream systems

**How It Works:**
- SessionID generation before credential exchange
- One-time URL creation for authentication flow
- Partner bank handshake verification

---

### **Phase 3: Visual Authentication - Canvas Grid** 

**Problem Solved:** Prevents automated attacks and malware screen injection

**Real-World Incident Prevention:**

The SWIFT banking malware in Incident #2 worked by:
1. Detecting when user opened transfer form
2. Injecting fake "approval" screen
3. Capturing click coordinates
4. Sending to attacker's server

**DefVault Phase 3 Defense:**
- 4×4 icon grid rendered via **HTML5 Canvas (not DOM)**
- Grid is **polymorphic** - changes each session
- Contains **honeytrap icons** - clicking them triggers security alerts
- **Anti-screenshot rendering** - image data unavailable to malware

```javascript
// Example: Malware tries to capture grid with getImageData()
const imageData = canvas.getImageData(0, 0, 400, 400);
// Returns: "Security violation - Canvas access disabled"
```

**Real-World Impact:**
- Malware can't inject fake verification screen (not in DOM)
- Malware can't read which icon is correct (Canvas API disabled)
- Malware clicks honeytrap → System logs bot attempt → Account frozen

**Result:** The SWIFT attackers would be unable to automate session hijacking.

---

### **Phase 4: Session-Bound JWT Signing** 🔑

**Problem Solved:** Prevents token theft and replay attacks.

**Technology:**
- **RS256 Asymmetric Encryption** - 2048-bit RSA key pair
- **60-Second Access Token TTL** - Forces re-authentication
- **Session-scoped binding** - Tokens are tied to short-lived session state (canvas verification).

**Real-World Example:**

```json
// Traditional JWT - STOLEN TOKEN CAN BE REUSED ANYWHERE
{
  "sub": "user@bank.com",
  "iat": 1708000000,
  "exp": 1708003600,
  "aud": "banking"
}

// DefVault JWT - SESSION-BOUND TOKEN
{
  "sub": "user@bank.com",
  "canvas_session_id": "s3ss10n1234",
  "canvas_hash": "a1b2c3d4e5f6",
  "iat": 1708000000,
  "exp": 1708000060,
  "aud": "banking"
}
```

**Real-World Impact:**
- Attacker steals session token from corporate network
- Tries to use in different country/device
- **Token validation fails** if session state is expired or unbound to current session
- Account lockdown triggered when replay attempts detected

**Result:** Short-lived tokens and session-scoped binding limit replay attacks without collecting device fingerprints.

---

### **Phase 5: Immutable Audit Trail** 

**Problem Solved:** Forensic evidence for compliance and attack reconstruction

**Technology:**
- **SHA-256 Chained Hashing** - Each log entry hashes previous entry
- **Tamper Detection** - Any modification breaks the chain
- **Non-Repudiation** - Cryptographic proof of authorization

```
Event 1: LOGIN_ATTEMPT (hash: abc123)
Event 2: THREAT_DETECTED (hash: hash(event2_data + abc123))
Event 3: VISUAL_AUTH_SUCCESS (hash: hash(event3_data + prev_hash))
...if attacker modifies Event 1, all subsequent hashes break
```

**Real-World Impact:**
- Compliance team can prove exact sequence of events
- Regulators can verify no logs were deleted
- Faster breach investigation and resolution

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────┐
│        User Login Attempt                    │
└────────────────┬────────────────────────────┘
                 │
         ┌───────▼────────┐
         │  Phase 1       │
         │  Sentinel      │──► [Blocks Phishing]
         │  Detection     │
         └───────┬────────┘
                 │ (Threat checks pass)
         ┌───────▼────────┐
         │  Phase 2       │
         │  Gateway       │──► [SessionID Created]
         │                │
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │  Phase 3       │
         │  Canvas        │──► [Honeytrap Detection]
         │  Visual Auth   │
         └───────┬────────┘
                 │ (Selection verified)
         ┌───────▼────────┐
         │  Phase 4       │
         │  JWT Crypto    │──► [Device-Bound Token]
         │  Signing       │
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │  Phase 5       │
         │  Audit Trail   │──► [Immutable Log]
         │  & Bank Verify │
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │  Dashboard     │
         │  Authenticated │
         └────────────────┘
```

---

##  Feature Comparison

| Feature | Traditional Banking | DefVault |
|---------|-------------------|----------|
| Phishing Detection | Manual (user-dependent) | **Automatic (Phase 1)** |
| Detection Timing | After password entered | **Before password entered** |
| Bot Attack Prevention | Rate limiting | **Visual Canvas + Honeytrap** |
| Token Security | 30-min expiry | **60-sec expiry + session binding** |
| Session Hijacking | Possible if token stolen | **Mitigated via short-lived, session-scoped tokens** |
| Audit Trail | Editable logs | **Tamper-proof chained hashes** |
| Malware Resilience | Susceptible | **Canvas rendering immune** |

---

## Quick Start

```bash
git clone https://github.com/mr-simab/DefVault.git
cd DefVault && npm install
docker-compose up -d
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 📚 Documentation

- **[MODULAR Architecture Guide](docs/MODULAR-ARCHITECTURE.md)** - Module development patterns and routing
- **[API Reference](docs/API-REFERENCE.md)** - REST endpoint documentation for Enterprise & Personal modules
- **[Integration Guide](docs/integration-guide.md)** - SDK examples and integration steps
- **[Deployment Guide](docs/DEPLOYMENT-GUIDE.md)** - Complete deployment instructions

---

## 💡 Key Innovation

> **Traditional security asks: "Is this password correct?"**  
> **DefVault asks: "Was this password entered safely?"**

By shifting threat detection to the pre-login phase, DefVault provides breakthrough protection against the attack vectors that compromise millions of users annually.

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file

---

**DefVault: Threat Interception Before Exposure™**  
*Protecting global banking infrastructure against modern cybercriminals*
