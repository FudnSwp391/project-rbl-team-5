const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Xử lý return từ VNPay
router.get('/vnpay_return', paymentController.vnpayReturn);

module.exports = router;
