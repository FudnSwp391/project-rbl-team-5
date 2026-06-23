const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/', authenticateToken, orderController.getOrders);
router.post('/', authenticateToken, orderController.createOrder);
router.put('/:id/status', authenticateToken, orderController.updateOrderStatus);
router.put('/:id/confirm-visit', authenticateToken, orderController.confirmVisit);
router.post('/:id/confirm-payment', authenticateToken, orderController.confirmPayment);
router.post('/:id/cancel', authenticateToken, orderController.cancelOrder);
router.put('/:id/reschedule', authenticateToken, orderController.rescheduleOrder);

module.exports = router;

