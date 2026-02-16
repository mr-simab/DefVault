# DefVault System Architecture Diagrams

Essential Mermaid diagrams for DefVault system architecture and data flows.

---

## 0. Work-Flow

```mermaid
graph TD

%% ================================
%% ENTRY LAYER
%% ================================

A["👤 User Access"] --> B["🌐 DefVault Web Platform<br/>React + Vite"]
B --> C{"🎯 Select Account Type"}

C -->|"Enterprise Admin"| ENT_DASH["🏢 Enterprise Dashboard"]
C -->|"Personal User"| PER_DASH["👤 Personal Dashboard"]

%% ================================
%% ================================
%% 🏢 ENTERPRISE MODULE (B2B)
%% ================================
%% ================================

subgraph ENTERPRISE_MODULE["🏢 Enterprise Module (B2B)"]

ENT_DASH --> E1["🎨 Visual Authentication<br/>Canvas Grid"]
E1 -->|"POST /canvas/generate"| E2["Canvas Service"]
E2 -->|"Store Grid Metadata"| E_CACHE["⚡ Redis Session Store"]
E2 -->|"Return Grid"| ENT_DASH

ENT_DASH -->|"User Selection"| E3["POST /canvas/verify"]
E3 -->|"Validate Selection"| E4["Grid Validator"]
E4 -->|"Check Honey Trap"| E5{"Valid?"}

E5 -->|"Yes"| E6["🔐 Issue JWT"]
E5 -->|"No"| E_BLOCK["❌ Block + Alert"]

E6 -->|"Sign RS256"| E7["JWT Service"]
E7 -->|"Store Session Metadata"| E_CACHE
E7 -->|"Return Token"| ENT_DASH

ENT_DASH -->|"View Logs"| E_LOGS["📊 Enterprise Audit Logs"]

end

%% ================================
%% ================================
%% 👤 PERSONAL MODULE (B2C)
%% ================================
%% ================================

subgraph PERSONAL_MODULE["👤 Personal Module (B2C)"]

PER_DASH -->|"Connect Gmail"| P1["🔐 OAuth 2.0<br/>gmail.modify Scope"]
P1 -->|"Store Tokens Securely"| P_DB["📧 Gmail Tokens<br/>Supabase"]

P_DB -->|"Trigger Worker"| P2["📬 Gmail Monitoring Worker"]

P2 -->|"Fetch New Emails"| P3["Extract Metadata<br/>Sender, Subject, Body"]

P3 -->|"Extract URLs"| P4["🔍 URL Threat Engine"]
P3 -->|"Extract Attachments"| P5["🦠 VirusTotal Scan"]

P4 --> CORE_THREAT
P5 --> CORE_THREAT

CORE_THREAT -->|"Calculate Risk Score"| P6["🎯 Risk Evaluator"]

P6 -->|"Low/Medium"| P7["⚠️ Warn User"]
P6 -->|"High Risk"| P8["🚨 quarantineThreat(messageId)"]

P8 -->|"users.messages.modify"| P9["Move to SPAM"]

P7 --> PER_DASH
P9 --> PER_DASH

PER_DASH -->|"View Threat History"| P_HISTORY["📊 Email Threat History"]

end

%% ================================
%% ================================
%% 🧠 SHARED CORE ENGINE
%% ================================
%% ================================

subgraph CORE_ENGINE["🧠 Shared Core Threat Intelligence Engine"]

CORE_THREAT["Threat Engine<br/>Parallel Checks"]

CORE_THREAT --> C1["Google Safe Browsing"]
CORE_THREAT --> C2["Domain Age + Reputation"]
CORE_THREAT --> C3["Entropy Analysis"]
CORE_THREAT --> C4["ML Phishing Model"]
CORE_THREAT --> C5["SSL Validation"]
CORE_THREAT --> C6["VirusTotal API"]

end

%% ================================
%% DATA LAYER
%% ================================

subgraph DATA_LAYER["🗄 Supabase (PostgreSQL)"]

DB_USERS["Users Table"]
DB_ENTERPRISE["Enterprise Clients"]
DB_AUTH_LOGS["Enterprise Auth Logs"]
DB_EMAIL_THREATS["Personal Email Threats"]
DB_AUDIT["Global Audit Logs"]

end

%% ================================
%% CONNECTIONS
%% ================================

ENT_DASH --> DB_AUTH_LOGS
PER_DASH --> DB_EMAIL_THREATS
CORE_THREAT --> DB_AUDIT
```

---
---
## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend"
        WEBAPP["🌐 React + Vite<br/>Web Application"]
    end

    subgraph "API Gateway"
        EXPRESS["🚪 Express.js<br/>Routes & Middleware"]
    end

    subgraph "Security Services"
        SENTINEL["🛡️ Sentinel Services<br/>8 Parallel Checks"]
        CANVAS["🎨 Canvas Service<br/>Visual Auth Grid"]
        JWT["🔐 JWT Service<br/>Token Binding"]
        AUDIT["📋 Audit Logger<br/>Event Tracking"]
    end

    subgraph "Data Layer"
        REDIS["⚡ Redis<br/>Session Cache"]
        POSTGRES["🐘 PostgreSQL<br/>Persistent Data"]
    end

    subgraph "External Services"
        GOOGLE_SB["🔍 Google Safe Browsing"]
        VIRUSTOTAL["🦠 VirusTotal"]
        EMAIL_AUTH["📧 Email Authentication"]
    end

    WEBAPP --> EXPRESS
    EXPRESS --> CORE["Core Threat Engine\n(Shared Services)"]
    EXPRESS --> MODULES
    MODULES --> ENTERPRISE["🏢 Enterprise Module\n/api/enterprise/*"]
    MODULES --> PERSONAL["👤 Personal Module\n/api/personal/*"]
    CORE --> SENTINEL
    CORE --> CANVAS
    CORE --> JWT
    CORE --> AUDIT
    
    SENTINEL --> REDIS
    SENTINEL --> POSTGRES
    SENTINEL --> GOOGLE_SB
    SENTINEL --> VIRUSTOTAL
    SENTINEL --> EMAIL_AUTH
    
    CANVAS --> REDIS
    JWT --> REDIS
    JWT --> POSTGRES
    AUDIT --> POSTGRES
    
    %% Diagram styles removed for clean rendering
```

---

## 2. Complete Authentication Flow (5-Phase)

```mermaid
graph TD
    START["👤 User Attempts Login"]
    
    subgraph "Phase 1: Sentinel"
        P1["🛡️ Threat Detection<br/>- Google Web Risk<br/>- Domain Reputation<br/>- URL Entropy<br/>- NLP Phishing<br/>- Email Auth<br/>- SSL Validation<br/>- APK Permission<br/>- VirusTotal<br/><br/>All checks in parallel"]
        P1_DECISION{Threat Found?}
    end
    
    subgraph "Phase 2: Gateway"
        P2["🚪 Session Creation<br/>- Generate Session ID<br/>- Track IP/Risk<br/>- Anomaly Detection"]
    end
    
    subgraph "Phase 3: Canvas"
        P3["🎨 Visual Auth<br/>- Generate Grid<br/>- Embed Honey Traps<br/>- User Selects Tile<br/>- Verify Selection"]
        P3_DECISION{Selection Valid?}
    end
    
    subgraph "Phase 4: JWT"
        P4["🔐 Token Issuance<br/>- Create Access Token<br/>- Session-scoped Binding<br/>- 60-second TTL<br/>- Risk Score Embedded"]
    end
    
    subgraph "Phase 5: Audit"
        P5["📋 Compliance Logging<br/>- Log All Events<br/>- Maintain Audit Trail<br/>- Chain Verification"]
    end
    
    BLOCK1["❌ Block Access"]
    BLOCK2["❌ Block Access"]
    SUCCESS["✅ Authentication Complete"]
    
    START --> P1
    P1 --> P1_DECISION
    P1_DECISION -->|Threat| BLOCK1
    P1_DECISION -->|Safe| P2
    P2 --> P3
    P3 --> P3_DECISION
    P3_DECISION -->|Invalid| BLOCK2
    P3_DECISION -->|Valid| P4
    P4 --> P5
    P5 --> SUCCESS
    
    %% Diagram styles removed for clean rendering
```

---

## 3. Error Handling & Resilience

```mermaid
graph TD
    REQUEST["📤 API Request"]
    
    subgraph "Service Execution"
        EXEC["🔧 Execute Service<br/>Run Checks"]
        SUCCESS{Success?}
        RESPONSE["✅ Success<br/>Return Result"]
    end
    
    subgraph "Error Handling"
        ERROR["❌ Error Occurred<br/>Service Timeout<br/>DB Connection<br/>External API Fail"]
        GRACEFUL["🛡️ Graceful Degradation<br/>Continue with<br/>Failed Checks<br/>Log Failure"]
        FALLBACK["💾 Use Cache<br/>Return Safe Default"]
    end
    
    subgraph "Logging"
        LOG_SUCCESS["📝 Log Success"]
        LOG_WARN["⚠️ Log Warning<br/>Partial Failure"]
        LOG_ERROR["❌ Log Error<br/>Full Failure"]
    end
    
    REQUEST --> EXEC
    EXEC --> SUCCESS
    SUCCESS -->|Yes| RESPONSE
    SUCCESS -->|No| ERROR
    ERROR --> GRACEFUL
    GRACEFUL --> FALLBACK
    
    RESPONSE --> LOG_SUCCESS
    GRACEFUL --> LOG_WARN
    FALLBACK --> LOG_ERROR
    
    LOG_SUCCESS --> CLIENT_RESPONSE["📤 Return 200"]
    LOG_WARN --> CLIENT_RESPONSE
    LOG_ERROR --> CLIENT_RESPONSE
    
    %% Diagram styles removed for clean rendering
```

---

## 4. Component Interaction

```mermaid
graph TB
    CLIENT["🌐 Frontend Client"]
    
    subgraph "API Routes"
        AUTH["POST /auth/login<br/>POST /auth/logout"]
        SCANNER["POST /scanner/analyze-url<br/>POST /scanner/analyze-file"]
        CANVAS["POST /canvas/generate<br/>POST /canvas/verify"]
        JWT["POST /jwt/issue-token<br/>POST /jwt/verify-token"]
        AUDIT["GET /audit/logs<br/>POST /audit/log"]
    end
    
    subgraph "Core Services"
        SENTINEL_SVC["🛡️ Sentinel<br/>8 Detection Services"]
        CANVAS_SVC["🎨 Canvas<br/>Grid + Honey Traps"]
        JWT_SVC["🔐 JWT<br/>Token Management"]
        AUDIT_SVC["📋 Audit<br/>Event Logging"]
    end
    
    subgraph "Storage"
        CACHE["⚡ Redis<br/>Session Cache"]
        DB["🐘 PostgreSQL<br/>User Data"]
    end
    
    CLIENT --> AUTH
    CLIENT --> SCANNER
    CLIENT --> CANVAS
    CLIENT --> JWT
    CLIENT --> AUDIT
    
    AUTH --> JWT_SVC
    SCANNER --> SENTINEL_SVC
    CANVAS --> CANVAS_SVC
    JWT --> JWT_SVC
    AUDIT --> AUDIT_SVC
    
    SENTINEL_SVC --> CACHE
    SENTINEL_SVC --> DB
    CANVAS_SVC --> CACHE
    JWT_SVC --> CACHE
    JWT_SVC --> DB
    AUDIT_SVC --> DB
    
    %% Diagram styles removed for clean rendering
```

---

## 5. Threat Score Calculation

```mermaid
graph TB
    INPUT["🔍 Incoming Request"]
    
    subgraph "URL Analysis"
        URL["📡 Check Reputation<br/>Domain Age<br/>Safe Browsing<br/>Entropy"]
        URL_SCORE["Score: 0-25"]
    end
    
    subgraph "Session Analysis"
        SESSION["🔐 Session Context<br/>IP Check<br/>Device History<br/>Location"]
        SESSION_SCORE["Score: 0-25"]
    end
    
    subgraph "Behavior Analysis"
        BEHAVIOR["👤 User Behavior<br/>Click Patterns<br/>Honey Traps<br/>Timing"]
        BEHAVIOR_SCORE["Score: 0-25"]
    end
    
    subgraph "Content Analysis"
        CONTENT["📝 NLP Analysis<br/>Phishing Language<br/>Urgency Patterns"]
        CONTENT_SCORE["Score: 0-25"]
    end
    
    CALC["⚖️ Calculate Total<br/>Sum All Scores"]
    
    subgraph "Decision"
        LOW["✅ 0-30: LOW<br/>Proceed"]
        MEDIUM["⚠️ 31-60: MEDIUM<br/>Step Up"]
        HIGH["❌ 61-100: HIGH<br/>Block"]
    end
    
    INPUT --> URL
    INPUT --> SESSION
    INPUT --> BEHAVIOR
    INPUT --> CONTENT
    
    URL --> URL_SCORE
    SESSION --> SESSION_SCORE
    BEHAVIOR --> BEHAVIOR_SCORE
    CONTENT --> CONTENT_SCORE
    
    URL_SCORE --> CALC
    SESSION_SCORE --> CALC
    BEHAVIOR_SCORE --> CALC
    CONTENT_SCORE --> CALC
    
    CALC --> LOW
    CALC --> MEDIUM
    CALC --> HIGH
    
    %% Diagram styles removed for clean rendering
```

---

## 6. Complete DefVault User Flow

```mermaid
graph TD
    %% ===== USER AUTHENTICATION =====
    A["👤 User"] -->|"Visit Platform"| B["🌐 DefVault Frontend<br/>React + Vite"]
    B -->|"Login / Register"| B1["🚪 Backend Auth Route<br/>POST /auth/login"]
    B1 -->|"Verify Credentials"| B2["🔐 Auth Service<br/>JWT Config"]
    B2 -->|"Check Database"| DB_USER["👤 User Profiles<br/>PostgreSQL"]
    DB_USER -->|"Return User Data"| B2
    B2 -->|"Create Session Token"| A2["🔑 Session Created<br/>JWT Token Generated"]
    A2 -->|"Redirect"| B3["📊 DefVault Dashboard"]

    %% ===== DASHBOARD MODULE SELECTION =====
    B3 -->|"User Chooses Feature"| C{"🎯 Select Module"}

    %% ===== PHASE 1: URL & FILE SCANNING =====
    C -->|"Phase 1: URL Scan"| D1["🛡️ Threat Scanner Module<br/>Analyze URL/File"]
    D1 -->|"POST /scanner/analyze-url"| S1["📡 Scanner Route"]
    S1 -->|"Execute In Parallel"| S1a["Phase 1 Sentinel Service<br/>Promise.allSettled"]
    
    S1a -->|"Check 1: Google Web Risk"| EXT1a["🔍 Google Safe Browsing<br/>Real-time DB"]
    S1a -->|"Check 2: Domain Reputation"| EXT1b["🌍 Domain Registry<br/>Registration Age"]
    S1a -->|"Check 3: URL Entropy"| EXT1c["📊 Entropy Analysis<br/>Homograph Detection"]
    S1a -->|"Check 4: NLP Phishing"| EXT1d["🧠 ML Phishing Model<br/>Content Analysis"]
    S1a -->|"Check 5: Email Auth"| EXT1e["📧 DKIM/SPF/DMARC<br/>Email Validation"]
    S1a -->|"Check 6: SSL Validation"| EXT1f["🔒 SSL Certificate<br/>Chain Verification"]
    S1a -->|"Check 7: APK Permission"| EXT1g["📱 APK Manifest<br/>Permission Scanner"]
    S1a -->|"Check 8: VirusTotal"| EXT1h["🦠 VirusTotal<br/>90+ Antivirus Engines"]
    
    EXT1a -->|"Result + Cache"| CACHE_S1["⚡ Redis Cache"]
    EXT1b -->|"Result + Threat Score"| CACHE_S1
    EXT1c -->|"Result"| CACHE_S1
    EXT1d -->|"Result"| CACHE_S1
    EXT1e -->|"Result"| CACHE_S1
    EXT1f -->|"Result"| CACHE_S1
    EXT1g -->|"Result"| CACHE_S1
    EXT1h -->|"Result"| CACHE_S1
    
    CACHE_S1 -->|"Aggregate Results"| S1a
    S1a -->|"Calculate Threat Level<br/>with Graceful Degradation"| S1
    S1 -->|"Log to Audit"| S1_AUDIT["📋 Audit Logger<br/>log event"]
    S1_AUDIT --> DB_AUDIT["📊 Audit Logs<br/>PostgreSQL"]
    S1 -->|"Return Unified Result"| D1
    D1 -->|"Display Threat Assessment<br/>Low/Medium/High/Critical"| B3

    %% ===== PHASE 2 & 3: VISUAL AUTHENTICATION =====
    C -->|"Phase 3: Visual Auth"| D2["🎨 Canvas Module<br/>Generate Grid"]
    D2 -->|"POST /canvas/generate"| S2["🎨 Canvas Route"]
    S2 -->|"Call Canvas Service"| S2a["Canvas Service<br/>Grid Generation"]
    S2a -->|"Create Grid + Honey Traps"| S2b["🍯 Honey Trap Logic<br/>Embed Decoys"]
    S2b -->|"Cache Grid Data"| CACHE_S2["⚡ Redis<br/>Session Storage"]
    CACHE_S2 -->|"Grid Metadata"| S2a
    S2a -->|"Return Grid to Frontend"| D2
    D2 -->|"Render Canvas UI<br/>User Selects Tile"| B3
    B3 -->|"User Completes Selection"| D2B["Canvas Verification"]
    D2B -->|"POST /canvas/verify"| S2C["Canvas Verify Route"]
    S2C -->|"Call Grid Validation"| S2D["Grid Validator<br/>Check Selection"]
    S2D -->|"Verify Against Cache"| CACHE_S2
    CACHE_S2 -->|"Validate Selection"| S2D
    S2D -->|"Check Honey Trap Hit"| S2E{"Valid?"}
    S2E -->|"Yes"| S2F["✅ Proceed"]
    S2E -->|"No/Trap Hit"| S2G["❌ Block + Alert"]
    S2F -->|"Log to Audit"| DB_AUDIT

    %% ===== PHASE 4: JWT TOKEN ISSUANCE =====
    S2F -->|"Request Token"| D3["🔐 JWT Module<br/>Issue Token"]
    D3 -->|"POST /jwt/issue-token"| S3["🔐 JWT Route"]
    S3 -->|"Call JWT Service"| S3a["JWT Service<br/>Token Binding"]
    S3a -->|"Create Payload<br/>Session-scoped"| S3b["🔑 Create Access Token<br/>TTL: 60 seconds"]
    S3b -->|"Create Refresh Token<br/>TTL: 1 hour"| S3c["🔄 Refresh Token"]
    S3c -->|"Sign with Private Key<br/>RS256"| S3d["🔐 Token Signed"]
    S3d -->|"Store Session Binding"| CACHE_S3["⚡ Redis<br/>Token Metadata"]
    CACHE_S3 -->|"Confirmation"| S3
    S3 -->|"Return Access Token"| B3
    B3 -->|"Store Securely<br/>Use for API Calls"| B3_TOKEN["🔑 Session Active"]

    %% ===== PHASE 5: AUDIT & COMPLIANCE LOGGING =====
    B3_TOKEN -->|"Log All Events"| D4["📋 Audit Module<br/>Compliance Tracking"]
    D4 -->|"POST /audit/log"| S4["📋 Audit Route"]
    S4 -->|"Call Audit Service"| S4a["Audit Logger<br/>Event Handler"]
    S4a -->|"Hash Event + Chain"| S4b["🔗 Chain Verification<br/>Immutable Trail"]
    S4b -->|"Store to Database"| DB_AUDIT
    DB_AUDIT -->|"Maintain Audit Trail"| S4a
    S4a -->|"Confirmation"| D4
    D4 -->|"Dashboard: Audit Status"| B3

    %% ===== SUBSEQUENT API CALLS =====
    B3_TOKEN -->|"User Performs Action"| D5["🔍 Perform Security Check"]
    D5 -->|"API Request with JWT"| S5["🚪 Protected Route<br/>Auth Middleware"]
    S5 -->|"Verify Token"| S5a["🔐 Token Validation"]
    S5a -->|"Check Signature + Expiry"| CACHE_S3
    CACHE_S3 -->|"Token Valid?"| S5a
    S5a -->|"Yes"| S5B["✅ Grant Access"]
    S5a -->|"No"| S5C["❌ Require Re-auth"]
    S5B -->|"Process Request"| S1
    S5C -->|"Redirect to Login"| A

    %% ===== DATA PERSISTENCE LAYER =====
    subgraph "DATA_LAYER"
        DB_USER["👤 User Profiles<br/>Email, Password, Settings"]
        DB_AUDIT["📋 Audit Logs<br/>Events, Threats, Actions"]
        DB_THREAT_HISTORY["🛡️ Threat History<br/>Scans, Results, Scores"]
        DB_SESSION["🔐 Session Data<br/>Active Sessions, Tokens"]
    end

    subgraph "CACHE_LAYER"
        REDIS_SESSIONS["⚡ Active Sessions<br/>Grid metadata, Token cache"]
        REDIS_THREAT_CACHE["⚡ Threat Cache<br/>URL/File scan results<br/>1-7 day TTL"]
    end

    DB_USER --> DB_AUDIT
    DB_AUDIT --> DB_THREAT_HISTORY
    DB_THREAT_HISTORY --> DB_SESSION
    
    CACHE_S1 --> REDIS_THREAT_CACHE
    CACHE_S2 --> REDIS_SESSIONS
    CACHE_S3 --> REDIS_SESSIONS

    S1 -.->|"Persistent Logs"| DB_THREAT_HISTORY
    S1_AUDIT -.->|"Compliance Logs"| DB_AUDIT
    
    B3 -->|"Display Statistics<br/>Threat Summary"| G["📊 Dashboard Analytics<br/>Total Scans, Threats Found,<br/>Risk Trends"]
```
