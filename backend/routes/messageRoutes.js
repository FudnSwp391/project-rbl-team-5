const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/:conversationId', authenticateToken, messageController.getMessages);

module.exports = router;
