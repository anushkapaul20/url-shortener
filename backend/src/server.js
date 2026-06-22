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

    // Connect Redis
    await redis.connect();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
