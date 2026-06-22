const { Queue } = require('bullmq');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isTLS = redisUrl.startsWith('rediss://') || redisUrl.includes('upstash.io');

// BullMQ needs a separate connection config (not the ioredis instance)
const connection = {
  url: redisUrl,
  tls: isTLS ? { rejectUnauthorized: false } : undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

const analyticsQueue = new Queue('analytics', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

module.exports = analyticsQueue;
