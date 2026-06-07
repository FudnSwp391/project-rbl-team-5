const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/', authenticateToken, orderController.getOrders);
router.post('/', authenticateToken, orderController.createOrder);

module.exports = router;
