class AuditLog {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.sessionId = data.sessionId;
    this.action = data.action;
    this.resource = data.resource;
    this.details = data.details;
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.status = data.status;
    this.createdAt = data.createdAt;
  }

  static getTableSchema() {
    return `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        session_id UUID,
        action VARCHAR(100) NOT NULL,
        resource VARCHAR(255),
        details JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        status VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(session_id) REFERENCES sessions(id)
      );
    `;
  }
}

module.exports = AuditLog;
