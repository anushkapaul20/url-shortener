require('dotenv').config();
const app = require('./app');
const redis = require('./lib/redisClient');
const pool = require('./lib/db');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Test DB connection
    await pool.query('SELECT 1');
    console.log('PostgreSQL connected');
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
    process.exit(1);
  }

  // Connect Redis — non-fatal if it fails (app still works without cache)
  try {
    await redis.connect();
    console.log('Redis connected');
  } catch (err) {
    console.warn('Redis connection warning:', err.message);
    console.warn('App will run without caching');
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
