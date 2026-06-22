const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('../lib/redisClient');

// Fallback to memory store if Redis is not available
let store;
try {
  store = new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: 'rl:',
  });
} catch {
  store = undefined; // will use default memory store
}

const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user ? `user:${req.user.userId}` : `ip:${req.ip}`;
  },
  store,
  handler: (req, res) => {
    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      statusCode: 429,
    });
  },
});

module.exports = rateLimiter;
