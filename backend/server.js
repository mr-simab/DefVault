require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`DefVault API Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Global error handlers to avoid unexpected process crash; log and attempt to continue.
const logger = require('./config/logger');

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { reason: String(reason) });
  // Do not exit; prefer to log and allow process to continue. Monitor and restart if unhealthy.
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { message: err && err.message, stack: err && err.stack });
  // Attempt graceful shutdown if server is still running.
  try {
    server.close(() => {
      logger.info('Server closed after uncaughtException');
    });
  } catch (e) {
    logger.error('Error closing server after uncaughtException', { error: String(e) });
  }
  // Avoid process.exit here to give platform a chance to recover; recommend external supervisor.
});

module.exports = server;
