const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../lib/db');
const { isValidEmail } = require('../../utils/validators');
const { createError } = require('../../middleware/errorHandler');

const SALT_ROUNDS = 12;

/**
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // Validate fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return next(createError(400, 'VALIDATION_ERROR', 'Name is required'));
    }
    if (!email || !isValidEmail(email)) {
      return next(createError(400, 'VALIDATION_ERROR', 'A valid email address is required'));
    }
    if (!password || password.length < 6) {
      return next(createError(400, 'VALIDATION_ERROR', 'Password must be at least 6 characters'));
    }

    // Check duplicate email
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return next(createError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists'));
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [name.trim(), email.toLowerCase(), password_hash]
    );

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.rows[0].id,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(createError(400, 'VALIDATION_ERROR', 'Email and password are required'));
    }

    // Find user
    const result = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return next(createError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'));
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return next(createError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'));
    }

    // Sign JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({ token });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
