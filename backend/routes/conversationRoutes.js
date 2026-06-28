const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/pending', authenticateToken, conversationController.getPendingConversations);
router.get('/my', authenticateToken, conversationController.getMyConversations);
router.post('/', authenticateToken, conversationController.createConversation);
router.post('/internal', authenticateToken, conversationController.getOrCreateInternalConversation);
router.put('/:id/accept', authenticateToken, conversationController.acceptConversation);

module.exports = router;
