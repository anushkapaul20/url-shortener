const pool = require('../../lib/db');
const redis = require('../../lib/redisClient');
const analyticsQueue = require('../../queues/analyticsQueue');
const { createError } = require('../../middleware/errorHandler');

const CACHE_TTL = 86400; // 24 hours

/**
 * GET /:shortCode — Resolve and redirect
 */
async function resolveShortCode(req, res, next) {
  try {
    const { shortCode } = req.params;

    // 1. Check Redis cache
    const cached = await redis.get(`url:${shortCode}`);
    let longUrl = cached;
    let urlId = null;

    if (!cached) {
      // 2. Query PostgreSQL
      const result = await pool.query(
        'SELECT id, long_url, expires_at FROM urls WHERE short_code = $1',
        [shortCode]
      );

      if (result.rows.length === 0) {
        return next(createError(404, 'SHORT_CODE_NOT_FOUND', 'Short URL not found'));
      }

      const url = result.rows[0];

      // Check expiry
      if (url.expires_at && new Date(url.expires_at) < new Date()) {
        return next(createError(404, 'SHORT_CODE_NOT_FOUND', 'This short URL has expired'));
      }

      longUrl = url.long_url;
      urlId = url.id;

      // 3. Store in Redis with TTL
      await redis.set(`url:${shortCode}`, longUrl, 'EX', CACHE_TTL);
    } else {
      // Get urlId for analytics even on cache hit
      const result = await pool.query('SELECT id FROM urls WHERE short_code = $1', [shortCode]);
      if (result.rows.length > 0) {
        urlId = result.rows[0].id;
      }
    }

    // 4. Enqueue analytics job (fire-and-forget)
    if (urlId) {
      analyticsQueue.add('track-click', {
        urlId,
        shortCode,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || '',
        referrer: req.headers['referer'] || req.headers['referrer'] || '',
        timestamp: new Date().toISOString(),
      }).catch((err) => console.error('Failed to enqueue analytics job:', err));
    }

    // 5. Redirect (302 so browsers don't cache, preserving analytics)
    res.redirect(302, longUrl);
  } catch (err) {
    next(err);
  }
}

module.exports = { resolveShortCode };
