const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const { getAnalytics } = require('./analyticsController');

const router = express.Router();

router.use(authMiddleware);
router.get('/:id', getAnalytics);

module.exports = router;
