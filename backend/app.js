const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
const requestLogger = require('./middlewares/requestLogger.middleware');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

// ================================
// SECURITY MIDDLEWARE
// ================================
app.use(helmet());
app.use(cors());

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use(globalLimiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// ================================
// HEALTH CHECK & STATUS
// ================================
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ================================
// MODULE ROUTING: ENTERPRISE (B2B)
// ================================

// Enterprise routes - require enterprise account type
const enterpriseAuthRoutes = require('./modules/enterprise/routes/auth.routes');
const enterpriseCanvasRoutes = require('./modules/enterprise/routes/canvas.routes');
const enterpriseJwtRoutes = require('./modules/enterprise/routes/jwt.routes');
const enterpriseAuditRoutes = require('./modules/enterprise/routes/audit.routes');

app.use('/api/enterprise/auth', enterpriseAuthRoutes);
app.use('/api/enterprise/canvas', enterpriseCanvasRoutes);
app.use('/api/enterprise/jwt', enterpriseJwtRoutes);
app.use('/api/enterprise/audit', enterpriseAuditRoutes);

// ================================
// MODULE ROUTING: PERSONAL (B2C)
// ================================

// Personal routes - require personal account type
const personalAuthRoutes = require('./modules/personal/routes/auth.routes');
const personalGmailRoutes = require('./modules/personal/routes/gmail.routes');
const personalThreatRoutes = require('./modules/personal/routes/threat.routes');
const personalQuarantineRoutes = require('./modules/personal/routes/quarantine.routes');

app.use('/api/personal/auth', personalAuthRoutes);
app.use('/api/personal/gmail', personalGmailRoutes);
app.use('/api/personal/threat', personalThreatRoutes);
app.use('/api/personal/quarantine', personalQuarantineRoutes);

// ================================
// SHARED CORE ROUTES (All users)
// ================================

// Health endpoints and shared audit
app.get('/api/status', (req, res) => {
  res.json({
    api: 'DefVault Gateway',
    modules: {
      enterprise: '/api/enterprise/{feature}',
      personal: '/api/personal/{feature}'
    },
    version: '2.0.0-modular',
    timestamp: new Date().toISOString()
  });
});

// ================================
// 404 HANDLER
// ================================
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method,
    code: 'ROUTE_NOT_FOUND'
  });
});

// ================================
// ERROR MIDDLEWARE (Must be last)
// ================================
app.use(errorMiddleware);

module.exports = app;
