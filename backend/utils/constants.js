module.exports = {
  THREAT_LEVELS: {
    SAFE: 'safe',
    WARNING: 'warning',
    CRITICAL: 'critical'
  },
  
  API_ENDPOINTS: {
    GOOGLE_SAFE_BROWSING: 'https://safebrowsing.googleapis.com/v4',
    VIRUSTOTAL: 'https://www.virustotal.com/api/v3'
  },

  JWT_EXPIRY: process.env.JWT_EXPIRY || '24h',
  
  RATE_LIMIT: {
    WINDOW_MS: 900000, // 15 minutes
    MAX_REQUESTS: 100
  },

  GRID_SIZE: 4,

  ENCRYPTION_ALGORITHM: 'aes-256-cbc',
  
  DEFAULT_TIMEOUT: 5000 // 5 seconds
};
