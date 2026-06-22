require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const rateLimiter = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./modules/auth/authRoutes');
const urlRoutes = require('./modules/urls/urlRoutes');
const analyticsRoutes = require('./modules/analytics/analyticsRoutes');
const redirectRoutes = require('./modules/redirect/redirectRoutes');

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting (global)
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/urls', urlRoutes);
app.use('/api/analytics', analyticsRoutes);

// Redirect route (must be last to avoid conflicts with /api/*)
app.use('/', redirectRoutes);

// Global error handler
app.use(errorHandler);

module.exports = app;
