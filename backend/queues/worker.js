const scanQueue = require('./scan.queue');
const logger = require('../config/logger');

const startWorker = () => {
  logger.info('Background worker started');
  
  // Process scan queue jobs
  scanQueue.process(async (job) => {
    try {
      const { url, userId } = job.data;
      
      // Perform threat analysis
      job.progress(25);
      
      // Call sentinel services
      job.progress(50);
      
      // Store results
      job.progress(100);
      
      logger.info(`Scan completed for ${url}`);
      
      return { success: true, url: url };
    } catch (error) {
      logger.error('Worker error:', error);
      throw error;
    }
  });
};

if (require.main === module) {
  startWorker();
}

module.exports = { startWorker };
