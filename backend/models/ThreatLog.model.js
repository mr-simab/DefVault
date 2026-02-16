class ThreatLog {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.url = data.url;
    this.threatLevel = data.threatLevel;
    this.threats = data.threats;
    this.scanDetails = data.scanDetails;
    this.createdAt = data.createdAt;
  }

  static getTableSchema() {
    return `
      CREATE TABLE IF NOT EXISTS threat_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        url VARCHAR(2048) NOT NULL,
        threat_level VARCHAR(50) NOT NULL,
        threats JSONB,
        scan_details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `;
  }
}

module.exports = ThreatLog;
