const crypto = require('crypto');
const { db } = require('../db');

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

// Hàm format ngày giờ theo định dạng YYYYMMDDHHmmss
function formatVnpayDate(date) {
  const pad = (n) => (n < 10 ? '0' + n : n);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());
  return `${year}${month}${day}${hour}${minute}${second}`;
}

exports.createPaymentUrl = async (req, res) => {
  // Logic này sẽ được gọi từ orderController.js, hoặc được expose thành API riêng.
  // Tuy nhiên trong thiết kế, ta sẽ tích hợp thẳng vào createOrder, nên ta xuất 1 hàm helper.
};

exports.generateVnpayUrl = (orderId, amount, ipAddr, orderInfo) => {
  const tmnCode = process.env.VNP_TMNCODE;
  const secretKey = process.env.VNP_HASHSECRET;
  const vnpUrl = process.env.VNP_URL;
  const returnUrl = process.env.VNP_RETURNURL;

  const date = new Date();
  const createDate = formatVnpayDate(date);
  
  // Hết hạn sau 15 phút
  date.setMinutes(date.getMinutes() + 15);
  const expireDate = formatVnpayDate(date);

  let vnp_Params = {};
  vnp_Params['vnp_Version'] = '2.1.0';
  vnp_Params['vnp_Command'] = 'pay';
  vnp_Params['vnp_TmnCode'] = tmnCode;
  vnp_Params['vnp_Locale'] = 'vn';
  vnp_Params['vnp_CurrCode'] = 'VND';
  vnp_Params['vnp_TxnRef'] = orderId;
  vnp_Params['vnp_OrderInfo'] = orderInfo || `Thanh toan don hang ${orderId}`;
  vnp_Params['vnp_OrderType'] = 'other';
  vnp_Params['vnp_Amount'] = amount * 100;
  vnp_Params['vnp_ReturnUrl'] = returnUrl;
  vnp_Params['vnp_IpAddr'] = ipAddr || '127.0.0.1';
  vnp_Params['vnp_CreateDate'] = createDate;
  vnp_Params['vnp_ExpireDate'] = expireDate;

  vnp_Params = sortObject(vnp_Params);

  const querystring = require('querystring');
  const signData = querystring.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest("hex"); 
  vnp_Params['vnp_SecureHash'] = signed;
  
  const vnpUrlFinal = vnpUrl + '?' + querystring.stringify(vnp_Params, { encode: false });
  
  return vnpUrlFinal;
};

// GET /api/payment/vnpay_return
exports.vnpayReturn = async (req, res) => {
  let vnp_Params = req.query;
  const secureHash = vnp_Params['vnp_SecureHash'];

  delete vnp_Params['vnp_SecureHash'];
  delete vnp_Params['vnp_SecureHashType'];

  vnp_Params = sortObject(vnp_Params);

  const secretKey = process.env.VNP_HASHSECRET;
  const querystring = require('qs');
  const signData = querystring.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest("hex");

  const orderId = vnp_Params['vnp_TxnRef'];
  const rspCode = vnp_Params['vnp_ResponseCode'];

  if (secureHash === signed) {
    // Chữ ký hợp lệ
    if (rspCode === '00') {
      // Thanh toán thành công
      try {
        await db.query(
          "UPDATE orders SET status = 'paid' WHERE id = @orderId",
          [{ name: 'orderId', value: orderId }]
        );
        res.status(200).json({ code: rspCode, message: 'Thành công', orderId });
      } catch (err) {
        console.error('Lỗi cập nhật đơn hàng VNPay:', err);
        res.status(500).json({ code: '99', message: 'Lỗi server' });
      }
    } else {
      // Thanh toán thất bại
      try {
        await db.query(
          "UPDATE orders SET status = 'cancelled' WHERE id = @orderId",
          [{ name: 'orderId', value: orderId }]
        );
        res.status(200).json({ code: rspCode, message: 'Thanh toán thất bại', orderId });
      } catch (err) {
        res.status(500).json({ code: '99', message: 'Lỗi server' });
      }
    }
  } else {
    // Chữ ký không hợp lệ
    res.status(400).json({ code: '97', message: 'Chữ ký không hợp lệ' });
  }
};
