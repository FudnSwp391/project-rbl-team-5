const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Route cho AI Chatbot
router.post('/chat', aiController.chatWithAI);

module.exports = router;
