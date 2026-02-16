/**
 * Database Schema Definitions
 * For Supabase PostgreSQL
 * 
 * Run these SQL statements to set up the modular architecture
 */

const schemaDefinitions = `
-- ================================
-- SHARED TABLES (Core Engine)
-- ================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module VARCHAR(50) NOT NULL, -- 'enterprise' or 'personal'
  user_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  action VARCHAR(255),
  resource VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  threat_level VARCHAR(20),
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_module_user (module, user_id),
  INDEX idx_created_at (created_at)
);

-- ================================
-- ENTERPRISE TABLES (B2B)
-- ================================

CREATE TABLE IF NOT EXISTS enterprise_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(50), -- starter, pro, enterprise
  admin_email VARCHAR(255) UNIQUE NOT NULL,
  api_key VARCHAR(255) UNIQUE NOT NULL,
  deployment_type VARCHAR(50), -- cloud, on-premise
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enterprise_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES enterprise_clients(id),
  session_id VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  threat_score DECIMAL(5,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES enterprise_clients(id),
  INDEX idx_client_session (client_id, session_id)
);

CREATE TABLE IF NOT EXISTS enterprise_auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  attempt_type VARCHAR(50), -- 'canvas_generation', 'canvas_verify', 'jwt_issue'
  success BOOLEAN,
  threat_level VARCHAR(20),
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES enterprise_clients(id),
  INDEX idx_client_auth (client_id, created_at)
);

-- ================================
-- PERSONAL TABLES (B2C)
-- ================================

CREATE TABLE IF NOT EXISTS personal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

CREATE TABLE IF NOT EXISTS gmail_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES personal_users(id),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type VARCHAR(50),
  scope TEXT,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES personal_users(id),
  INDEX idx_user_gmail (user_id)
);

CREATE TABLE IF NOT EXISTS email_threats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES personal_users(id),
  message_id VARCHAR(255) NOT NULL,
  sender VARCHAR(255),
  subject TEXT,
  url TEXT,
  threat_level VARCHAR(20),
  threats JSONB,
  is_quarantined BOOLEAN DEFAULT false,
  status VARCHAR(50), -- 'warned', 'quarantined', 'resolved'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES personal_users(id),
  INDEX idx_user_threat (user_id, created_at),
  INDEX idx_message_id (message_id)
);

CREATE TABLE IF NOT EXISTS quarantine_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES personal_users(id),
  message_id VARCHAR(255) NOT NULL,
  threat_id UUID NOT NULL REFERENCES email_threats(id),
  action VARCHAR(50), -- 'quarantined', 'recovered'
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES personal_users(id),
  FOREIGN KEY (threat_id) REFERENCES email_threats(id),
  INDEX idx_user_quarantine (user_id, created_at)
);

-- ================================
-- Indexes for Performance
-- ================================

CREATE INDEX idx_audit_module_time ON audit_logs(module, created_at DESC);
CREATE INDEX idx_threatlevel_company ON email_threats(threat_level, user_id);
`;

module.exports = { schemaDefinitions };
