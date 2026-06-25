const { db } = require('../db');
const paymentController = require('./paymentController');

// GET /api/orders - Lấy danh sách đơn hàng
exports.getOrders = async (req, res) => {
  try {
    let orders;
    if (req.user.role === 'Admin' || req.user.role === 'admin' || req.user.role === 'seller') {
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
      let paymentMethod = 'at_store';
      let invoiceNumber = `INV-${ord.id}`;
      let appointmentDate = null;
      let appointmentTime = null;
      
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

      // Parse appointment info from shipping_address field
      let appointmentInfo = {};
      if (ord.shipping_address) {
        const trimmed = ord.shipping_address.trim();
        if (trimmed.startsWith('{')) {
          try {
            appointmentInfo = JSON.parse(trimmed);
          } catch (e) {
            appointmentInfo = { address: ord.shipping_address };
          }
        } else {
          appointmentInfo = { address: ord.shipping_address };
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
        appointmentInfo,
        // Backward compat
        shippingInfo: appointmentInfo
      };
    }));

    res.json(enrichedOrders);
  } catch (err) {
    console.error('Lỗi lấy danh sách đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi lấy danh sách đơn hàng.', error: err.message });
  }
};

// POST /api/orders - Tạo đơn hàng mới (Đặt lịch tới xem máy)
exports.createOrder = async (req, res) => {
  const { items, appointmentInfo, shippingInfo, paymentMethod, totalAmount } = req.body;
  
  // Support both old (shippingInfo) and new (appointmentInfo) format
  const info = appointmentInfo || shippingInfo;

  if (!items || items.length === 0 || !info || !paymentMethod) {
    return res.status(400).json({ message: 'Thiếu thông tin đặt hàng.' });
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
        return res.status(400).json({ message: `Sản phẩm "${prod.title || item.name}" đã được đặt trước hoặc đã bán.` });
      }
    }

    // 2. Lấy hoặc tạo customer_profile cho user
    let customerProfile = await db.findOne('customer_profiles', { user_id: req.user.id });
    if (!customerProfile) {
      customerProfile = await db.insert('customer_profiles', {
        user_id: req.user.id,
        address: 'Chưa cập nhật',
        total_spent: 0
      });
    }

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    // 3. Chèn đơn hàng vào bảng orders
    const orderStatus = paymentMethod === 'bank_transfer' ? 'waiting_payment' : 'pending';
    const newOrder = await db.insert('orders', {
      customer_id: customerProfile.id,
      total_amount: totalAmount,
      shipping_address: typeof info === 'object' ? JSON.stringify(info) : info,
      status: orderStatus,
      notes: `payment:${paymentMethod}|invoice:${invoiceNumber}`,
      created_at: now,
      updated_at: now
    });

    // 4. Cập nhật sản phẩm sang 'reserved' (giữ chỗ) và chèn vào order_items
    for (let item of items) {
      const productId = item.product_id || item.productId || item.id;
      if (productId) {
        await db.update('products', 'id', productId, { status: 'reserved' });
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

    // 6. Xử lý VNPay
    let vnpayUrl = null;
    if (paymentMethod === 'vnpay') {
      const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const orderInfo = `Thanh toan don hang ${newOrder.id}`;
      vnpayUrl = paymentController.generateVnpayUrl(newOrder.id, totalAmount, ipAddr, orderInfo);

      // Timeout 15 phút cho VNPay
      setTimeout(async () => {
        try {
          const order = await db.findOne('orders', { id: newOrder.id });
          if (order && order.status === 'pending') {
            await db.update('orders', 'id', newOrder.id, { status: 'cancelled' });
            await db.query(`
              UPDATE products 
              SET status = 'active' 
              WHERE id IN (SELECT product_id FROM order_items WHERE order_id = @orderId)
            `, [{ name: 'orderId', value: newOrder.id }]);
            console.log(`Tự động hủy đơn ${newOrder.id} do hết thời gian thanh toán VNPay.`);
          }
        } catch (e) {
          console.error(`Lỗi tự hủy đơn ${newOrder.id}:`, e);
        }
      }, 15 * 60 * 1000);
    }

    // 6b. Timeout 10 phút cho Bank Transfer (waiting_payment)
    if (paymentMethod === 'bank_transfer') {
      setTimeout(async () => {
        try {
          const order = await db.findOne('orders', { id: newOrder.id });
          if (order && order.status === 'waiting_payment') {
            await db.update('orders', 'id', newOrder.id, { status: 'cancelled' });
            await db.query(`
              UPDATE products 
              SET status = 'active' 
              WHERE id IN (SELECT product_id FROM order_items WHERE order_id = @orderId)
            `, [{ name: 'orderId', value: newOrder.id }]);
            console.log(`Tự động hủy đơn ${newOrder.id} do hết thời gian xác nhận thanh toán (10 phút).`);
            
            // Send notification
            const notificationsList = req.app.get('notifications');
            if (notificationsList) {
              notificationsList.push({
                id: String(Date.now() + Math.random()),
                title: '⏰ Hết hạn xác nhận thanh toán',
                message: `Đơn hàng #${newOrder.id} đã bị hủy do quá thời gian xác nhận thanh toán.`,
                sender: 'System',
                createdAt: new Date().toISOString()
              });
            }
          }
        } catch (e) {
          console.error(`Lỗi tự hủy đơn ${newOrder.id}:`, e);
        }
      }, 10 * 60 * 1000); // 10 minutes
    }

    // 7. Tự động hủy nếu khách không tới sau giờ hẹn + 2 giờ
    if (info.appointmentDate && info.appointmentTime) {
      let hour = 8;
      let minute = 0;
      if (info.appointmentTime.includes('-')) {
        const firstPart = info.appointmentTime.split('-')[0].trim();
        const parts = firstPart.split(':');
        hour = Number(parts[0]) || 8;
        minute = Number(parts[1]) || 0;
      } else {
        const parts = info.appointmentTime.split(':');
        hour = Number(parts[0]) || 8;
        minute = Number(parts[1]) || 0;
      }
      const appointmentDateTime = new Date(`${info.appointmentDate}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
      const cancelTime = new Date(appointmentDateTime.getTime() + 2 * 60 * 60 * 1000); // +2 giờ
      const timeUntilCancel = cancelTime.getTime() - Date.now();
      
      if (timeUntilCancel > 0) {
        setTimeout(async () => {
          try {
            const order = await db.findOne('orders', { id: newOrder.id });
            if (order && (order.status === 'pending' || order.status === 'confirmed')) {
              await db.update('orders', 'id', newOrder.id, { status: 'cancelled', updated_at: new Date().toISOString() });
              await db.query(`
                UPDATE products 
                SET status = 'active' 
                WHERE id IN (SELECT product_id FROM order_items WHERE order_id = @orderId)
              `, [{ name: 'orderId', value: newOrder.id }]);
              console.log(`Tự động hủy đơn ${newOrder.id} - khách không tới sau giờ hẹn.`);
            }
          } catch (e) {
            console.error(`Lỗi tự hủy đơn ${newOrder.id}:`, e);
          }
        }, timeUntilCancel);
      }
    }

    // 8. Gửi thông báo cho Seller qua Socket.IO và đẩy vào danh sách chuông
    const customer = await db.findOne('users', { id: req.user.id });
    if (req.app.get('io')) {
      req.app.get('io').emit('newOrderForSeller', {
        orderId: newOrder.id,
        invoiceNumber,
        customerName: customer ? (customer.full_name || customer.username) : 'Khách hàng',
        customerPhone: customer ? customer.phone : '',
        totalAmount,
        appointmentDate: info.appointmentDate || null,
        appointmentTime: info.appointmentTime || null,
        createdAt: now,
        message: `Đơn hàng mới #${invoiceNumber} từ ${customer ? customer.full_name || customer.username : 'Khách hàng'}`
      });
    }

    const notificationsList = req.app.get('notifications');
    if (notificationsList) {
      notificationsList.push({
        id: String(Date.now() + Math.random()),
        title: '🛒 Lịch hẹn xem máy mới',
        message: `Khách hàng ${customer ? customer.full_name || customer.username : 'Khách hàng'} đã đặt lịch hẹn xem máy #${invoiceNumber} vào lúc ${info.appointmentTime || ''} ngày ${info.appointmentDate || ''}.`,
        sender: 'System',
        createdAt: now
      });
    }

    // Trả về kết quả
    res.status(201).json({
      id: newOrder.id,
      message: 'Đặt lịch xem máy thành công!',
      invoiceNumber,
      createdAt: now,
      appointmentInfo: info,
      shippingInfo: info, // backward compat
      items,
      paymentMethod,
      totalAmount,
      redirectUrl: vnpayUrl
    });
  } catch (err) {
    console.error('Lỗi tạo đơn hàng:', err);
    res.status(500).json({ message: 'Lỗi tạo đơn hàng.', error: err.message });
  }
};

// PUT /api/orders/:id/status - Cập nhật trạng thái đơn hàng
exports.updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;
    
    const order = await db.findOne('orders', { id: orderId });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    
    if (req.user.role === 'customer' || req.user.role === 'Customer') {
      let customerProfile = await db.findOne('customer_profiles', { user_id: req.user.id });
      if (!customerProfile || order.customer_id !== customerProfile.id) {
        return res.status(403).json({ message: 'Không có quyền cập nhật đơn hàng này' });
      }
      // Customer chỉ được hủy đơn pending
      if (status === 'canceled' && order.status !== 'pending') {
        return res.status(400).json({ message: 'Chỉ có thể hủy đơn hàng đang chờ duyệt' });
      }
    }

    // Nếu hủy đơn → trả sản phẩm về active
    if (status === 'canceled' || status === 'cancelled') {
      await db.query(`
        UPDATE products 
        SET status = 'active' 
        WHERE id IN (SELECT product_id FROM order_items WHERE order_id = @orderId)
      `, [{ name: 'orderId', value: orderId }]);
    }
    
    await db.update('orders', 'id', orderId, { status, updated_at: new Date().toISOString() });
    res.json({ message: 'Cập nhật trạng thái thành công', status });
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái đơn hàng:', error);
    res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái đơn hàng' });
  }
};

// PUT /api/orders/:id/confirm-visit - Seller xác nhận khách đã tới xem máy
exports.confirmVisit = async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Chỉ seller/admin mới được xác nhận
    if (req.user.role !== 'Admin' && req.user.role !== 'admin' && req.user.role !== 'seller') {
      return res.status(403).json({ message: 'Không có quyền thực hiện.' });
    }

    const order = await db.findOne('orders', { id: orderId });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    // Cập nhật đơn hàng sang completed
    await db.update('orders', 'id', orderId, { 
      status: 'completed',
      updated_at: new Date().toISOString()
    });

    // Cập nhật sản phẩm sang sold_out
    await db.query(`
      UPDATE products 
      SET status = 'sold_out' 
      WHERE id IN (SELECT product_id FROM order_items WHERE order_id = @orderId)
    `, [{ name: 'orderId', value: orderId }]);

    // Thêm thông báo chuông xác nhận khách hàng đã tới xem máy và mua thành công
    const notificationsList = req.app.get('notifications');
    if (notificationsList) {
      const invNum = order.notes ? order.notes.split('|').find(p => p.startsWith('invoice:'))?.replace('invoice:', '') : `INV-${orderId}`;
      notificationsList.push({
        id: String(Date.now() + Math.random()),
        title: '✅ Đã hoàn tất xem máy',
        message: `Xác nhận khách hàng đã đến xem máy và mua thành công sản phẩm thuộc đơn hẹn #${invNum}.`,
        sender: 'System',
        createdAt: new Date().toISOString()
      });
    }

    res.json({ message: 'Đã xác nhận khách hàng tới xem máy. Sản phẩm đã được đánh dấu đã bán.' });
  } catch (error) {
    console.error('Lỗi xác nhận tới xem máy:', error);
    res.status(500).json({ message: 'Lỗi server khi xác nhận.' });
  }
};

// POST /api/orders/:id/confirm-payment - Xác nhận thanh toán chuyển khoản
exports.confirmPayment = async (req, res) => {
  try {
    const orderId = req.params.id;
    
    const order = await db.findOne('orders', { id: orderId });
    if (!order) {
      return res.status(404).json({ message: 'Đơn hàng không tồn tại.' });
    }

    // Check if order is still in waiting_payment status
    if (order.status !== 'waiting_payment') {
      return res.status(400).json({ message: 'Đơn hàng không ở trạng thái chờ xác nhận thanh toán.' });
    }

    // Check if payment is within 10 minutes (600 seconds)
    const createdAt = new Date(order.created_at);
    const now = new Date();
    const minutesElapsed = (now - createdAt) / (1000 * 60);
    
    if (minutesElapsed > 10) {
      return res.status(400).json({ message: 'Hết thời gian xác nhận thanh toán. Vui lòng đặt lại đơn hàng.' });
    }

    // Update order status to confirmed
    await db.update('orders', 'id', orderId, {
      status: 'confirmed',
      updated_at: new Date().toISOString()
    });

    const updatedOrder = await db.findOne('orders', { id: orderId });
    res.json({ message: 'Thanh toán đã được xác nhận.', order: updatedOrder });
  } catch (error) {
    console.error('Lỗi xác nhận thanh toán:', error);
    res.status(500).json({ message: 'Lỗi server khi xác nhận thanh toán.' });
  }
};

// POST /api/orders/:id/cancel - Hủy đơn hàng
exports.cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    
    const order = await db.findOne('orders', { id: orderId });
    if (!order) {
      return res.status(404).json({ message: 'Đơn hàng không tồn tại.' });
    }

    // Cancel the order
    await db.update('orders', 'id', orderId, {
      status: 'cancelled',
      updated_at: new Date().toISOString()
    });

    // Restore products to 'active' status
    await db.query(`
      UPDATE products 
      SET status = 'active' 
      WHERE id IN (SELECT product_id FROM order_items WHERE order_id = @orderId)
    `, [{ name: 'orderId', value: orderId }]);

    res.json({ message: 'Đơn hàng đã được hủy thành công.' });
  } catch (error) {
    console.error('Lỗi hủy đơn hàng:', error);
    res.status(500).json({ message: 'Lỗi server khi hủy đơn hàng.' });
  }
};

// PUT /api/orders/:id/reschedule - Chỉnh ngày hẹn
exports.rescheduleOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { appointmentDate, appointmentTime } = req.body;

    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({ message: 'Thiếu ngày hoặc giờ hẹn mới.' });
    }

    const order = await db.findOne('orders', { id: orderId });
    if (!order) {
      return res.status(404).json({ message: 'Đơn hàng không tồn tại.' });
    }

    // Role check: Only customer who owns the order, seller, or admin can modify
    if (req.user.role === 'customer' || req.user.role === 'Customer') {
      let customerProfile = await db.findOne('customer_profiles', { user_id: req.user.id });
      if (!customerProfile || order.customer_id !== customerProfile.id) {
        return res.status(403).json({ message: 'Không có quyền thay đổi lịch hẹn của đơn hàng này.' });
      }
    }

    // Only allow rescheduling pending / waiting / reserved / waiting_payment / confirmed orders
    const allowedStatuses = ['pending', 'waiting_payment', 'reserved', 'confirmed'];
    if (!allowedStatuses.includes(order.status)) {
      return res.status(400).json({ message: 'Không thể chỉnh sửa lịch hẹn cho đơn hàng ở trạng thái này.' });
    }

    let appointmentInfo = {};
    if (order.shipping_address) {
      const trimmed = order.shipping_address.trim();
      if (trimmed.startsWith('{')) {
        try {
          appointmentInfo = JSON.parse(trimmed);
        } catch (e) {
          appointmentInfo = { address: order.shipping_address };
        }
      } else {
        appointmentInfo = { address: order.shipping_address };
      }
    }

    // Update appointment fields
    appointmentInfo.appointmentDate = appointmentDate;
    appointmentInfo.appointmentTime = appointmentTime;

    await db.update('orders', 'id', orderId, {
      shipping_address: JSON.stringify(appointmentInfo),
      updated_at: new Date().toISOString()
    });

    res.json({ message: 'Cập nhật lịch hẹn thành công.', appointmentInfo });
  } catch (error) {
    console.error('Lỗi cập nhật lịch hẹn đơn hàng:', error);
    res.status(500).json({ message: 'Lỗi server khi cập nhật lịch hẹn.' });
  }
};
// POST /api/orders/sepay-webhook - SePay tự động gọi khi nhận được giao dịch chuyển khoản
exports.sepayWebhook = async (req, res) => {
  try {
    // SePay gửi thông tin giao dịch qua body (trên thực tế thuộc tính là 'content' thay vì 'transferContent')
    const { transferAmount, transferContent, content, accountNumber } = req.body;
    
    console.log('[SePay Webhook] Nhận được giao dịch:', JSON.stringify(req.body));

    // Kiểm tra API key từ header để bảo mật
    const authHeader = req.headers['authorization'] || req.headers['apikey'] || '';
    // Lấy token thực tế (bỏ tiền tố 'Apikey ' hoặc 'Bearer ' nếu có)
    const apiKey = authHeader.replace(/^(Apikey|Bearer)\s+/i, '').trim();
    const expectedKey = (process.env.SEPAY_API_KEY || 'huynh_le_kim_huy').trim();
    
    if (expectedKey && apiKey !== expectedKey) {
      console.warn('[SePay Webhook] API key không hợp lệ:', apiKey);
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Tìm mã đơn hàng bằng cách duyệt qua tất cả các giá trị trong body để tìm mẫu TC{orderId} (không phân biệt hoa thường)
    let orderId = null;
    let rawContent = '';
    
    // Tìm trong các trường phổ biến trước
    const commonFields = ['content', 'description', 'transferContent', 'transfer_content'];
    for (const field of commonFields) {
      if (req.body[field]) {
        const val = String(req.body[field]).toUpperCase();
        const match = val.match(/TC(\d+)/);
        if (match) {
          orderId = parseInt(match[1]);
          rawContent = val;
          break;
        }
      }
    }
    
    // Nếu vẫn không tìm thấy, quét toàn bộ req.body dưới dạng string
    if (!orderId) {
      const bodyStr = JSON.stringify(req.body).toUpperCase();
      const match = bodyStr.match(/TC(\d+)/);
      if (match) {
        orderId = parseInt(match[1]);
        rawContent = `JSON_BODY: ${bodyStr}`;
      }
    }

    if (!orderId) {
      console.log('[SePay Webhook] Không tìm thấy mã đơn hàng trong nội dung:', JSON.stringify(req.body));
      return res.json({ success: false, message: 'Không tìm thấy mã đơn hàng trong nội dung chuyển khoản' });
    }

    console.log(`[SePay Webhook] Tìm thấy đơn hàng #${orderId}`);

    // Lấy thông tin đơn hàng
    const order = await db.findOne('orders', { id: orderId });
    if (!order) {
      console.log(`[SePay Webhook] Không tìm thấy đơn hàng #${orderId}`);
      return res.json({ success: false, message: `Không tìm thấy đơn hàng #${orderId}` });
    }

    // Chỉ xử lý đơn đang chờ thanh toán
    if (order.status !== 'waiting_payment' && order.status !== 'pending') {
      console.log(`[SePay Webhook] Đơn #${orderId} không ở trạng thái chờ thanh toán (status: ${order.status})`);
      return res.json({ success: false, message: `Đơn hàng không ở trạng thái chờ thanh toán` });
    }

    // Kiểm tra số tiền (cho phép sai lệch nhỏ)
    const expectedAmount = Number(order.total_amount);
    const receivedAmount = Number(transferAmount);
    if (Math.abs(receivedAmount - expectedAmount) > 1000) {
      console.warn(`[SePay Webhook] Số tiền không khớp: nhận ${receivedAmount}, cần ${expectedAmount}`);
      // Vẫn xác nhận nếu số tiền >= số cần thanh toán
      if (receivedAmount < expectedAmount) {
        return res.json({ success: false, message: `Số tiền chuyển khoản không đủ` });
      }
    }

    // Xác nhận thanh toán - cập nhật trạng thái đơn hàng thành 'processing'
    await db.update('orders', 'id', orderId, {
      status: 'processing',
      updated_at: new Date().toISOString()
    });

    // Cập nhật trạng thái sản phẩm trong đơn sang 'sold_out' (đã bán) để ẩn khỏi chợ đồ cũ ngay lập tức
    await db.query(`
      UPDATE products 
      SET status = 'sold_out' 
      WHERE id IN (SELECT product_id FROM order_items WHERE order_id = @orderId)
    `, [{ name: 'orderId', value: orderId }]);

    console.log(`[SePay Webhook] ✅ Đã xác nhận thanh toán cho đơn #${orderId} và đánh dấu các sản phẩm là sold_out`);

    // Gửi email xác nhận thanh toán thành công tới khách hàng
    try {
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

        // Fetch items
        const itemsResult = await db.query(
          'SELECT * FROM order_items WHERE order_id = @orderId',
          [{ name: 'orderId', value: order.id }]
        );
        const items = await Promise.all(itemsResult.recordset.map(async (item) => {
          const prod = await db.findOne('products', { id: item.product_id });
          return {
            productId: item.product_id,
            name: prod ? (prod.title || prod.name) : 'Thiết bị cũ',
            price: item.price,
            quantity: item.quantity
          };
        }));

        const { sendOrderConfirmationEmail } = require('../emailService');
        await sendOrderConfirmationEmail(customerEmail, {
          invoiceNumber,
          createdAt: order.created_at,
          totalAmount: order.total_amount,
          shippingInfo,
          items
        });
      }
    } catch (emailErr) {
      console.error('[SePay Webhook] Lỗi gửi email xác nhận thanh toán:', emailErr);
    }

    res.json({ success: true, message: `Đã xác nhận thanh toán cho đơn hàng #${orderId}` });

  } catch (err) {
    console.error('[SePay Webhook] Lỗi:', err);
    res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
  }
};

// Background job: Tự động hủy các đơn bank_transfer quá 10 phút chưa thanh toán
exports.startOrderTimeoutCheck = () => {
  setInterval(async () => {
    try {
      const result = await db.query(
        `SELECT id, created_at FROM orders WHERE status = 'waiting_payment'`
      );
      const rows = result.recordset || [];
      for (const order of rows) {
        const createdAt = new Date(order.created_at);
        const minutesElapsed = (Date.now() - createdAt.getTime()) / (1000 * 60);
        if (minutesElapsed > 10) {
          await db.update('orders', 'id', order.id, { 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          });
          await db.query(
            `UPDATE products SET status = 'active' WHERE id IN (SELECT product_id FROM order_items WHERE order_id = @orderId)`,
            [{ name: 'orderId', value: order.id }]
          );
          console.log(`[TimeoutCheck] Tự động hủy đơn #${order.id} do quá 10 phút không thanh toán.`);
        }
      }
    } catch (e) {
      // Ignore errors in background job
    }
  }, 60 * 1000); // Kiểm tra mỗi 1 phút
};
