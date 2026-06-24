const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Xử lý return từ VNPay
router.get('/vnpay_return', paymentController.vnpayReturn);

// Trả về thông tin cấu hình ngân hàng SePay từ biến môi trường
router.get('/sepay_config', (req, res) => {
  res.json({
    bankBrand: process.env.SEPAY_BANK_BRAND || 'vietcombank',
    accountNo: process.env.SEPAY_ACCOUNT_NO || '1023456789',
    accountName: process.env.SEPAY_ACCOUNT_NAME || 'CONG TY TNHH TECHCYCLE VN'
  });
});

module.exports = router;
