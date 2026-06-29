const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');

// Áp dụng mã giảm giá
router.post('/apply', couponController.applyCoupon);

module.exports = router;
