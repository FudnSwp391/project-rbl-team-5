const crypto = require('crypto');
const { db } = require('../db');

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

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj){
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
exports.createPaymentUrl = async (req, res) => {
  // Logic này sẽ được gọi từ orderController.js, hoặc được expose thành API riêng.
  // Tuy nhiên trong thiết kế, ta sẽ tích hợp thẳng vào createOrder, nên ta xuất 1 hàm helper.
};

exports.generateVnpayUrl = (orderId, amount, ipAddr, orderInfo) => {
  const tmnCode = process.env.VNP_TMNCODE || '2QX84564';
  const secretKey = process.env.VNP_HASHSECRET || '9G8C5M55U4DOH9Z0J27W6O2C7CO7O3CP';
  const vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const returnUrl = process.env.VNP_RETURNURL || 'http://localhost:5173';

  // Validate required variables
  if (!tmnCode || !secretKey || !vnpUrl || !returnUrl) {
    throw new Error('Missing required VNPay configurations');
  }

  // Hàm tạo ngày giờ đúng chuẩn múi giờ Việt Nam (GMT+7)
  const getVietnamTime = (addMinutes = 0) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + addMinutes);
    const options = { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(d);
    let out = {};
    parts.forEach(p => out[p.type] = p.value);
    // Xử lý trường hợp hour12=false trả về 24 thay vì 00
    if (out.hour === '24') out.hour = '00';
    return `${out.year}${out.month}${out.day}${out.hour}${out.minute}${out.second}`;
  };

  const createDate = getVietnamTime();
  const expireDate = getVietnamTime(15);

  // VNPay yêu cầu IP phải là chuỗi không có khoảng trắng, không chứa dấu phẩy
  let safeIpAddr = ipAddr ? ipAddr.toString().split(',')[0].trim() : '127.0.0.1';
  if (safeIpAddr === '::1' || safeIpAddr.includes(':')) {
    safeIpAddr = '127.0.0.1';
  }

  const vnp_Params = {
    'vnp_Amount': Math.floor(amount * 100).toString(),
    'vnp_Command': 'pay',
    'vnp_CreateDate': createDate,
    'vnp_CurrCode': 'VND',
    'vnp_ExpireDate': expireDate,
    'vnp_IpAddr': safeIpAddr,
    'vnp_Locale': 'vn',
    'vnp_OrderInfo': orderInfo || `Thanh toan don hang ${orderId}`,
    'vnp_OrderType': 'other',
    'vnp_ReturnUrl': returnUrl,
    'vnp_TmnCode': tmnCode,
    'vnp_TxnRef': orderId.toString(),
    'vnp_Version': '2.1.0'
  };

  let sortedParams = sortObject(vnp_Params);
  const qs = require('qs');
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

  sortedParams['vnp_SecureHash'] = signed;

  const vnpUrlFinal = vnpUrl + '?' + qs.stringify(sortedParams, { encode: false });
  console.log("VNPAY DEBUG - Generated URL:", vnpUrlFinal);
  return vnpUrlFinal;
};

// GET /api/payment/vnpay_return
exports.vnpayReturn = async (req, res) => {
  const vnp_Params = { ...req.query };
  const secureHash = vnp_Params['vnp_SecureHash'];

  delete vnp_Params['vnp_SecureHash'];
  delete vnp_Params['vnp_SecureHashType'];

  let sortedParams = sortObject(vnp_Params);

  const secretKey = process.env.VNP_HASHSECRET || '9G8C5M55U4DOH9Z0J27W6O2C7CO7O3CP';
  if (!secretKey) {
    return res.status(500).json({ code: '99', message: 'VNP_HASHSECRET not configured' });
  }
  const qs = require('qs');
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

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

        // Cập nhật trạng thái sản phẩm trong đơn sang 'sold_out' (đã bán) để ẩn khỏi chợ đồ cũ ngay lập tức
        await db.query(`
          UPDATE products 
          SET status = 'sold_out' 
          WHERE id IN (SELECT product_id FROM order_items WHERE order_id = @orderId)
        `, [{ name: 'orderId', value: orderId }]);

        // Fetch order items to return for the invoice
        const itemsResult = await db.query(
          'SELECT * FROM order_items WHERE order_id = @orderId',
          [{ name: 'orderId', value: orderId }]
        );
        
        const enrichedItems = await Promise.all(itemsResult.recordset.map(async (item) => {
          const prod = await db.findOne('products', { id: item.product_id });
          return {
            productId: item.product_id,
            name: prod ? (prod.title || prod.name) : 'Sản phẩm',
            price: item.price,
            quantity: item.quantity
          };
        }));

        // Lấy thông tin chi tiết đơn hàng để gửi mail
        try {
          const order = await db.findOne('orders', { id: orderId });
          if (order) {
            const customerProfile = await db.findOne('customer_profiles', { id: order.customer_id });
            let customerEmail = '';
            if (customerProfile) {
              const user = await db.findOne('users', { id: customerProfile.user_id });
              if (user) {
                customerEmail = user.email;
              }
            }

            if (customerEmail) {
              // Parse invoice number
              let invoiceNumber = `INV-${order.id}`;
              if (order.notes) {
                const parts = order.notes.split('|');
                parts.forEach(part => {
                  if (part.startsWith('invoice:')) {
                    invoiceNumber = part.replace('invoice:', '');
                  }
                });
              }

              // Parse shipping info
              let shippingInfo = {};
              if (order.shipping_address) {
                const trimmed = order.shipping_address.trim();
                if (trimmed.startsWith('{')) {
                  try {
                    shippingInfo = JSON.parse(trimmed);
                  } catch (e) {
                    shippingInfo = { address: order.shipping_address, fullName: 'Khách hàng', phone: '' };
                  }
                } else {
                  shippingInfo = { address: order.shipping_address, fullName: 'Khách hàng', phone: '' };
                }
              }

              const { sendOrderConfirmationEmail } = require('../emailService');
              await sendOrderConfirmationEmail(customerEmail, {
                invoiceNumber,
                createdAt: order.created_at,
                totalAmount: order.total_amount,
                shippingInfo,
                items: enrichedItems
              });
            }
          }
        } catch (emailErr) {
          console.error('Lỗi gửi email xác nhận VNPay:', emailErr);
        }

        res.status(200).json({ 
          code: rspCode, 
          message: 'Thành công', 
          orderId,
          orderItems: enrichedItems
        });
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
        // HOÀN LẠI SẢN PHẨM: Cập nhật lại trạng thái sản phẩm trong đơn hàng thành active vì đơn hàng đã bị hủy
        await db.query(`
          UPDATE products 
          SET status = 'active' 
          WHERE id IN (SELECT product_id FROM order_items WHERE order_id = @orderId)
        `, [{ name: 'orderId', value: orderId }]);

        res.status(200).json({ code: rspCode, message: 'Thanh toán thất bại', orderId });
      } catch (err) {
        console.error('Lỗi khi hủy đơn hàng:', err);
        res.status(500).json({ code: '99', message: 'Lỗi server' });
      }
    }
  } else {
    // Chữ ký không hợp lệ
    res.status(400).json({ code: '97', message: 'Chữ ký không hợp lệ' });
  }
};
