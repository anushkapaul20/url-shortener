const pool = require('../../lib/db');
const redis = require('../../lib/redisClient');
const { isValidUrl } = require('../../utils/validators');
const { generateShortCode } = require('../../utils/shortCode');
const { getShard } = require('../../utils/shardRouter');
const { isReservedKeyword } = require('../../utils/reservedKeywords');
const { createError } = require('../../middleware/errorHandler');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const MAX_RETRIES = 5;

/**
 * POST /api/urls — Create a shortened URL
 */
async function createUrl(req, res, next) {
  try {
    const { longUrl, customAlias, expiresAt } = req.body;
    const userId = req.user.userId;

    // Validate long URL
    if (!longUrl || !isValidUrl(longUrl)) {
      return next(createError(400, 'INVALID_URL', 'A valid http/https URL is required'));
    }

    let shortCode;

    if (customAlias) {
      // Validate alias
      if (isReservedKeyword(customAlias)) {
        return next(createError(400, 'RESERVED_KEYWORD', `"${customAlias}" is a reserved keyword and cannot be used as an alias`));
      }
      // Check uniqueness
      const existing = await pool.query('SELECT id FROM urls WHERE short_code = $1 OR custom_alias = $1', [customAlias]);
      if (existing.rows.length > 0) {
        return next(createError(409, 'ALIAS_ALREADY_EXISTS', 'This custom alias is already taken'));
      }
      shortCode = customAlias;
    } else {
      // Auto-generate with collision prevention
      let attempts = 0;
      while (attempts < MAX_RETRIES) {
        const candidate = generateShortCode();
        const exists = await pool.query('SELECT id FROM urls WHERE short_code = $1', [candidate]);
        if (exists.rows.length === 0) {
          shortCode = candidate;
          break;
        }
        attempts++;
      }
      if (!shortCode) {
        return next(createError(500, 'CODE_GENERATION_FAILED', 'Failed to generate a unique short code. Please try again.'));
      }
    }

    const shardKey = getShard(shortCode);

    const result = await pool.query(
      `INSERT INTO urls (short_code, long_url, custom_alias, user_id, shard_key, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [shortCode, longUrl, customAlias || null, userId, shardKey, expiresAt || null]
    );

    const url = result.rows[0];

    res.status(201).json({
      id: url.id,
      shortCode: url.short_code,
      shortUrl: `${BASE_URL}/${url.short_code}`,
      longUrl: url.long_url,
      customAlias: url.custom_alias,
      clickCount: url.click_count,
      createdAt: url.created_at,
      expiresAt: url.expires_at,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/urls — List all URLs for the authenticated user
 */
async function listUrls(req, res, next) {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      'SELECT * FROM urls WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const urls = result.rows.map((url) => ({
      id: url.id,
      shortCode: url.short_code,
      shortUrl: `${BASE_URL}/${url.short_code}`,
      longUrl: url.long_url,
      customAlias: url.custom_alias,
      clickCount: url.click_count,
      shardKey: url.shard_key,
      createdAt: url.created_at,
      expiresAt: url.expires_at,
    }));

    res.json(urls);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/urls/:id — Get a single URL
 */
async function getUrl(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM urls WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return next(createError(404, 'NOT_FOUND', 'URL not found'));
    }

    const url = result.rows[0];
    res.json({
      id: url.id,
      shortCode: url.short_code,
      shortUrl: `${BASE_URL}/${url.short_code}`,
      longUrl: url.long_url,
      customAlias: url.custom_alias,
      clickCount: url.click_count,
      shardKey: url.shard_key,
      createdAt: url.created_at,
      expiresAt: url.expires_at,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/urls/:id — Update a URL's destination
 */
async function updateUrl(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { longUrl } = req.body;

    if (!longUrl || !isValidUrl(longUrl)) {
      return next(createError(400, 'INVALID_URL', 'A valid http/https URL is required'));
    }

    const result = await pool.query(
      'SELECT * FROM urls WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return next(createError(404, 'NOT_FOUND', 'URL not found'));
    }

    const url = result.rows[0];

    await pool.query('UPDATE urls SET long_url = $1 WHERE id = $2', [longUrl, id]);

    // Invalidate cache
    await redis.del(`url:${url.short_code}`);

    res.json({
      id: url.id,
      shortCode: url.short_code,
      shortUrl: `${BASE_URL}/${url.short_code}`,
      longUrl,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/urls/:id — Delete a URL
 */
async function deleteUrl(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM urls WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return next(createError(404, 'NOT_FOUND', 'URL not found'));
    }

    const url = result.rows[0];

    await pool.query('DELETE FROM urls WHERE id = $1', [id]);

    // Invalidate cache
    await redis.del(`url:${url.short_code}`);

    res.json({ message: 'URL deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createUrl, listUrls, getUrl, updateUrl, deleteUrl };
