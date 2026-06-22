const express = require('express');
const { resolveShortCode } = require('./redirectController');

const router = express.Router();

// Must be specific enough to not match /api/* routes
router.get('/:shortCode([A-Za-z0-9]{1,50})', resolveShortCode);

module.exports = router;
