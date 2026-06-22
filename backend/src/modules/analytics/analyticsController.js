const pool = require('../../lib/db');
const { createError } = require('../../middleware/errorHandler');

/**
 * GET /api/analytics/:id — Get analytics for a URL owned by the authenticated user
 */
async function getAnalytics(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Verify ownership
    const urlResult = await pool.query(
      'SELECT id, short_code, long_url, click_count FROM urls WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (urlResult.rows.length === 0) {
      return next(createError(404, 'NOT_FOUND', 'URL not found'));
    }

    const url = urlResult.rows[0];

    // Total clicks
    const totalResult = await pool.query(
      'SELECT COUNT(*) AS total FROM analytics WHERE url_id = $1',
      [id]
    );
    const totalClicks = parseInt(totalResult.rows[0].total, 10);

    // Unique visitors (distinct IPs)
    const uniqueResult = await pool.query(
      'SELECT COUNT(DISTINCT ip_address) AS unique_visitors FROM analytics WHERE url_id = $1',
      [id]
    );
    const uniqueVisitors = parseInt(uniqueResult.rows[0].unique_visitors, 10);

    // Daily click trends (last 30 days)
    const dailyResult = await pool.query(
      `SELECT DATE(timestamp) AS date, COUNT(*) AS clicks
       FROM analytics
       WHERE url_id = $1 AND timestamp >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(timestamp)
       ORDER BY date ASC`,
      [id]
    );
    const dailyTrends = dailyResult.rows.map((row) => ({
      date: row.date,
      clicks: parseInt(row.clicks, 10),
    }));

    // Top referrers (top 5)
    const referrerResult = await pool.query(
      `SELECT referrer, COUNT(*) AS count
       FROM analytics
       WHERE url_id = $1 AND referrer != ''
       GROUP BY referrer
       ORDER BY count DESC
       LIMIT 5`,
      [id]
    );
    const topReferrers = referrerResult.rows.map((row) => ({
      referrer: row.referrer,
      count: parseInt(row.count, 10),
    }));

    // Device breakdown
    const deviceResult = await pool.query(
      `SELECT device, COUNT(*) AS count
       FROM analytics
       WHERE url_id = $1
       GROUP BY device`,
      [id]
    );
    const deviceBreakdown = {};
    deviceResult.rows.forEach((row) => {
      deviceBreakdown[row.device] = parseInt(row.count, 10);
    });

    res.json({
      urlId: url.id,
      shortCode: url.short_code,
      longUrl: url.long_url,
      totalClicks,
      uniqueVisitors,
      dailyTrends,
      topReferrers,
      deviceBreakdown,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAnalytics };
