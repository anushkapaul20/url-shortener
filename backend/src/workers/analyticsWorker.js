require('dotenv').config();
const { Worker } = require('bullmq');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');
const pool = require('../lib/db');
const redis = require('../lib/redisClient');

async function processAnalyticsJob(job) {
  const { urlId, ip, userAgent, referrer, timestamp } = job.data;

  // Parse User-Agent
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const browser = result.browser.name || 'Unknown';
  const os = result.os.name || 'Unknown';

  // Determine device type
  let device = 'Desktop';
  if (result.device.type === 'mobile') device = 'Mobile';
  else if (result.device.type === 'tablet') device = 'Tablet';

  // Resolve country from IP (optional)
  let country = null;
  try {
    const geo = geoip.lookup(ip);
    if (geo) country = geo.country;
  } catch {
    // geo lookup is optional, ignore errors
  }

  // Insert analytics record
  await pool.query(
    `INSERT INTO analytics (url_id, timestamp, ip_address, browser, device, os, referrer, country)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [urlId, timestamp, ip, browser, device, os, referrer || '', country]
  );

  // Update click count
  await pool.query(
    'UPDATE urls SET click_count = click_count + 1 WHERE id = $1',
    [urlId]
  );
}

async function startWorker() {
  await redis.connect();

  const worker = new Worker('analytics', processAnalyticsJob, {
    connection: redis,
    concurrency: 5,
  });

  worker.on('completed', (job) => {
    console.log(`Analytics job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Analytics job ${job?.id} failed:`, err.message);
  });

  console.log('Analytics worker started');
}

startWorker().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
