const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const orderController = require('../controllers/orderController');

// Xử lý return từ VNPay
router.get('/vnpay_return', paymentController.vnpayReturn);

// Trả về thông tin cấu hình ngân hàng SePay từ biến môi trường
router.get('/sepay_config', (req, res) => {
  res.json({
    bankBrand: process.env.SEPAY_BANK_BRAND || 'TPBank',
    accountNo: process.env.SEPAY_ACCOUNT_NO || '0325225503',
    accountName: process.env.SEPAY_ACCOUNT_NAME || 'CONG TY TNHH TECHCYCLE VN'
  });
});

// Xử lý webhook từ SePay (Hỗ trợ cả gạch dưới và gạch ngang)
router.post('/sepay_webhook', orderController.sepayWebhook);
router.post('/sepay-webhook', orderController.sepayWebhook);

module.exports = router;
