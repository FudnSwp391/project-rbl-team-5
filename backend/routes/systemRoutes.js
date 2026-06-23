const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

// GET system configuration
router.get('/system-info', systemController.getSystemInfo);

module.exports = router;
