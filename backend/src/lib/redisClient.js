const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Upstash requires TLS — detect by checking if URL uses rediss:// or upstash.io
const isTLS = redisUrl.startsWith('rediss://') || redisUrl.includes('upstash.io');

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  tls: isTLS ? { rejectUnauthorized: false } : undefined,
});

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err));

module.exports = redis;
