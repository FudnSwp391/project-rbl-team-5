const db = require('../db');

exports.getOrders = (req, res) => {
  let orders;
  if (req.user.role === 'admin') {
    orders = db.find('orders');
  } else {
    orders = db.find('orders', { customerId: req.user.id });
  }
  res.json(orders);
};

exports.createOrder = (req, res) => {
  const { items, shippingInfo, paymentMethod, totalAmount } = req.body;
  if (!items || items.length === 0 || !shippingInfo || !paymentMethod) {
    return res.status(400).json({ message: 'Thiếu thông tin đơn hàng.' });
  }

  const products = db.find('products');
  for (let item of items) {
    const prod = products.find(p => p.id === item.productId);
    if (!prod || prod.status !== 'available') {
      return res.status(400).json({ message: `Sản phẩm ${item.name || 'này'} đã được bán hoặc không tồn tại.` });
    }
  }

  for (let item of items) {
    db.update('products', item.productId, { status: 'sold' });
  }

  const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newOrder = db.insert('orders', {
    customerId: req.user.id,
    items,
    shippingInfo,
    paymentMethod,
    totalAmount,
    status: 'pending',
    invoiceNumber
  });

  res.status(201).json(newOrder);
};
