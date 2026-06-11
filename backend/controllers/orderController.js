const { db } = require('../db');

// GET /api/orders - Lấy danh sách đơn hàng
exports.getOrders = async (req, res) => {
  try {
    let orders;
    if (req.user.role === 'Admin' || req.user.role === 'admin') {
      orders = await db.find('orders');
    } else {
      let customerProfile = await db.findOne('customer_profiles', { user_id: req.user.id });
      if (!customerProfile) {
        customerProfile = await db.insert('customer_profiles', {
          user_id: req.user.id,
          address: 'Chưa cập nhật',
          total_spent: 0
        });
      }
      orders = await db.find('orders', { customer_id: customerProfile.id });
    }

    const enrichedOrders = await Promise.all(orders.map(async (ord) => {
      let paymentMethod = 'cod';
      let invoiceNumber = `INV-${ord.id}`;
      if (ord.notes) {
        const parts = ord.notes.split('|');
        parts.forEach(part => {
          if (part.startsWith('payment:')) {
            paymentMethod = part.replace('payment:', '');
          } else if (part.startsWith('invoice:')) {
            invoiceNumber = part.replace('invoice:', '');
          }
        });
      }

      const itemsResult = await db.query(
        'SELECT * FROM order_items WHERE order_id = @orderId',
        [{ name: 'orderId', value: ord.id }]
      );
      
      const enrichedItems = await Promise.all(itemsResult.recordset.map(async (item) => {
        const prod = await db.findOne('products', { id: item.product_id });
        return {
          productId: item.product_id,
          name: prod ? (prod.title || prod.name) : 'Thiết bị cũ',
          price: item.price,
          quantity: item.quantity
        };
      }));

      let shippingInfo = {};
      if (ord.shipping_address) {
        const trimmed = ord.shipping_address.trim();
        if (trimmed.startsWith('{')) {
          try {
            shippingInfo = JSON.parse(trimmed);
          } catch (e) {
            shippingInfo = { address: ord.shipping_address };
          }
        } else {
          shippingInfo = { address: ord.shipping_address };
        }
      }

      return {
        id: ord.id,
        invoiceNumber,
        createdAt: ord.created_at,
        totalAmount: ord.total_amount,
        paymentMethod,
        status: ord.status,
        items: enrichedItems,
        shippingInfo
      };
    }));

    res.json(enrichedOrders);
  } catch (err) {
    console.error('Lỗi lấy danh sách đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi lấy danh sách đơn hàng.', error: err.message });
  }
};

// POST /api/orders - Tạo đơn hàng mới
exports.createOrder = async (req, res) => {
  const { items, shippingInfo, paymentMethod, totalAmount } = req.body;

  if (!items || items.length === 0 || !shippingInfo || !paymentMethod) {
    return res.status(400).json({ message: 'Thiếu thông tin đơn hàng.' });
  }

  try {
    // 1. Kiểm tra từng sản phẩm còn hàng không
    for (let item of items) {
      const productId = item.product_id || item.productId || item.id;
      const prod = await db.findOne('products', { id: productId });
      if (!prod) {
        return res.status(400).json({ message: `Sản phẩm "${item.name || 'này'}" không tồn tại.` });
      }
      if (prod.status && prod.status.toLowerCase() !== 'active') {
        return res.status(400).json({ message: `Sản phẩm "${prod.title || item.name}" đã được bán.` });
      }
    }

    // 2. Lấy hoặc tạo customer_profile cho user
    let customerProfile = await db.findOne('customer_profiles', { user_id: req.user.id });
    if (!customerProfile) {
      customerProfile = await db.insert('customer_profiles', {
        user_id: req.user.id,
        address: shippingInfo.address || 'Chưa cập nhật',
        total_spent: 0
      });
    }

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    // 3. Chèn đơn hàng vào bảng orders
    const newOrder = await db.insert('orders', {
      customer_id: customerProfile.id,
      total_amount: totalAmount,
      shipping_address: typeof shippingInfo === 'object' ? JSON.stringify(shippingInfo) : shippingInfo,
      status: 'pending',
      notes: `payment:${paymentMethod}|invoice:${invoiceNumber}`,
      created_at: now,
      updated_at: now
    });

    // 4. Cập nhật sản phẩm sang 'sold_out' và chèn vào order_items
    for (let item of items) {
      const productId = item.product_id || item.productId || item.id;
      if (productId) {
        await db.update('products', 'id', productId, { status: 'sold_out' });
        await db.insert('order_items', {
          order_id: newOrder.id,
          product_id: productId,
          price: item.price,
          quantity: 1
        });
      }
    }

    // 5. Cập nhật chi tiêu tích lũy cho customer
    const currentSpent = Number(customerProfile.total_spent || 0);
    await db.update('customer_profiles', 'id', customerProfile.id, {
      total_spent: currentSpent + totalAmount
    });

    // Trả về đúng cấu trúc mà Checkout.jsx mong đợi
    res.status(201).json({
      message: 'Đặt hàng thành công!',
      invoiceNumber,
      createdAt: now,
      shippingInfo,
      items,
      paymentMethod,
      totalAmount
    });
  } catch (err) {
    console.error('Lỗi tạo đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi tạo đơn hàng.', error: err.message });
  }
};
