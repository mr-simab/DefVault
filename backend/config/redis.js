const redis = require('redis');

const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined
});

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

client.connect().catch(console.error);

module.exports = client;
