require('dotenv').config();
const app = require('./app');
const redis = require('./lib/redisClient');
const pool = require('./lib/db');
const { execSync } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 5000;

async function start() {
  // Run migrations on startup
  try {
    console.log('Running database migrations...');
    execSync(`node ${path.join(__dirname, '../db/migrate.js')}`, {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('Migrations complete');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }

  // Test DB connection
  try {
    await pool.query('SELECT 1');
    console.log('PostgreSQL connected');
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
    process.exit(1);
  }

  // Connect Redis — non-fatal if it fails
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
