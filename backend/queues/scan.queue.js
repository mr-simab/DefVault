const Queue = require('bull');
const redis = require('../config/redis');

const scanQueue = new Queue('url-scan', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

scanQueue.process(async (job) => {
  const { url, userId } = job.data;
  
  // Process URL scanning
  console.log(`Processing scan for ${url} by user ${userId}`);
  
  return { scanned: true, url: url };
});

scanQueue.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

scanQueue.on('failed', (job, err) => {
  console.log(`Job ${job.id} failed:`, err.message);
});

module.exports = scanQueue;
