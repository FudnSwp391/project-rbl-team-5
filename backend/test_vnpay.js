const crypto = require('crypto');

const tmnCode = "CGXZLS0Z";
const secretKey = "XNBCJFAKAZQSGTARRLGCHVZCWCEFWSKC";

let vnp_Params = {
  'vnp_Amount': '100000',
  'vnp_Command': 'pay',
  'vnp_CreateDate': '20260618150000',
  'vnp_CurrCode': 'VND',
  'vnp_ExpireDate': '20260618151500',
  'vnp_IpAddr': '127.0.0.1',
  'vnp_Locale': 'vn',
  'vnp_OrderInfo': 'Thanh toan don hang 123',
  'vnp_OrderType': 'other',
  'vnp_ReturnUrl': 'http://localhost:5173/?vnpay_return=true',
  'vnp_TmnCode': tmnCode,
  'vnp_TxnRef': '123',
  'vnp_Version': '2.1.0'
};

const searchParams = new URLSearchParams(vnp_Params);
searchParams.sort();
const signData = searchParams.toString();
const hmac = crypto.createHmac("sha512", secretKey);
const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex"); 
console.log("signData:", signData);
console.log("signed:", signed);
