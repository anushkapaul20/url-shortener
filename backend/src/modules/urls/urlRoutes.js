const express = require('express');
const authMiddleware = require('../../middleware/authMiddleware');
const { createUrl, listUrls, getUrl, updateUrl, deleteUrl } = require('./urlController');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createUrl);
router.get('/', listUrls);
router.get('/:id', getUrl);
router.put('/:id', updateUrl);
router.delete('/:id', deleteUrl);

module.exports = router;
