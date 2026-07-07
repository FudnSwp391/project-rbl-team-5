const { db } = require('../db');

// GET /api/conversations/pending - Cho Seller lấy danh sách đang chờ
exports.getPendingConversations = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, u.username as customerName, u.avatar as customerAvatar, p.title as productName
      FROM conversations c
      JOIN users u ON c.customer_id = u.id
      LEFT JOIN products p ON c.product_id = p.id
      WHERE c.status = 'pending'
      ORDER BY c.created_at DESC
    `);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Lỗi lấy danh sách chờ tư vấn:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// GET /api/conversations/my - Lấy danh sách chat của user hiện tại (Customer hoặc Seller)
exports.getMyConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role.toLowerCase();

    let query = '';
    let params = [{ name: 'userId', value: userId }];

    if (role === 'customer') {
      query = `
        SELECT c.*, u.username as sellerName, u.avatar as sellerAvatar, p.title as productName
        FROM conversations c
        LEFT JOIN users u ON c.seller_id = u.id
        LEFT JOIN products p ON c.product_id = p.id
        WHERE c.customer_id = @userId
        ORDER BY c.updated_at DESC
      `;
    } else {
      // Seller/Admin
      query = `
        SELECT c.*, u.username as customerName, u.avatar as customerAvatar, p.title as productName
        FROM conversations c
        JOIN users u ON c.customer_id = u.id
        LEFT JOIN products p ON c.product_id = p.id
        WHERE c.seller_id = @userId
        ORDER BY c.updated_at DESC
      `;
    }

    const result = await db.query(query, params);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Lỗi lấy danh sách chat:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// POST /api/conversations - Customer tạo yêu cầu tư vấn
exports.createConversation = async (req, res) => {
  try {
    const { productId } = req.body;
    const customerId = req.user.id;

    // Kiểm tra xem đã có yêu cầu pending nào cho sản phẩm này của user này chưa
    let existingQuery = `SELECT * FROM conversations WHERE customer_id = @customerId AND status = 'pending'`;
    let params = [{ name: 'customerId', value: customerId }];
    
    if (productId) {
      existingQuery += ` AND product_id = @productId`;
      params.push({ name: 'productId', value: productId });
    } else {
      existingQuery += ` AND product_id IS NULL`;
    }

    const existing = await db.query(existingQuery, params);
    if (existing.recordset && existing.recordset.length > 0) {
      return res.status(400).json({ message: 'Bạn đã có một yêu cầu tư vấn đang chờ xử lý.', conversation: existing.recordset[0] });
    }

    const newConv = await db.insert('conversations', {
      customer_id: customerId,
      product_id: productId || null,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Lấy thông tin customer để gửi kèm cho seller hiển thị ngay
    const customerInfo = await db.findOne('users', { id: customerId });
    const enrichedConv = {
      ...newConv,
      customerName: customerInfo?.username || 'Khách hàng',
      customerAvatar: customerInfo?.avatar || '',
      status: 'pending'
    };

    // Emit socket event để Seller nhận được yêu cầu mới ngay lập tức
    const io = req.app.get('io');
    if (io) {
      io.emit('newConsultationRequest', enrichedConv);
    }

    res.status(201).json({ message: 'Đã tạo yêu cầu tư vấn', conversation: enrichedConv });
  } catch (err) {
    console.error('Lỗi tạo yêu cầu tư vấn:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// PUT /api/conversations/:id/accept - Seller nhận tư vấn
exports.acceptConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.user.id;

    const conv = await db.findOne('conversations', { id: Number(id) });
    if (!conv) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu tư vấn' });
    }

    if (conv.status !== 'pending' || conv.seller_id) {
      return res.status(400).json({ message: 'Yêu cầu này đã được người khác nhận hoặc không còn khả dụng.' });
    }

    await db.update('conversations', 'id', id, {
      seller_id: sellerId,
      status: 'active',
      updated_at: new Date().toISOString()
    });

    const sellerInfo = await db.findOne('users', { id: sellerId });
    const io = req.app.get('io');
    if (io) {
      // Gửi event để CustomerDashboard cập nhật ngay
      io.emit('consultationAccepted', {
        conversationId: Number(id),
        sellerId: sellerId,
        sellerName: sellerInfo?.username || 'Nhân viên tư vấn',
        sellerAvatar: sellerInfo?.avatar || '',
        status: 'active',
        customerId: conv.customer_id
      });
    }

    res.json({ message: 'Đã nhận tư vấn thành công' });
  } catch (err) {
    console.error('Lỗi nhận tư vấn:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// DELETE /api/conversations/:id
exports.deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM conversations WHERE id = @id`, [{ name: 'id', value: Number(id) }]);
    res.json({ message: 'Xóa yêu cầu tư vấn thành công' });
  } catch (err) {
    console.error('Lỗi xóa yêu cầu tư vấn:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// POST /api/conversations/internal - Admin tạo/lấy phòng chat nội bộ với nhân viên
exports.getOrCreateInternalConversation = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const adminId = req.user.id;

    if (!targetUserId) {
      return res.status(400).json({ message: 'Thiếu ID người nhận' });
    }

    // Kiểm tra xem đã có cuộc trò chuyện nội bộ giữa 2 người chưa
    // Không phân biệt ai là người tạo trước
    let existingQuery = `
      SELECT c.*, 
             u.username as targetName, 
             u.avatar as targetAvatar 
      FROM conversations c
      JOIN users u ON u.id = CASE WHEN c.customer_id = @adminId THEN c.seller_id ELSE c.customer_id END
      WHERE c.status = 'internal' 
        AND (
          (c.customer_id = @adminId AND c.seller_id = @targetUserId)
          OR 
          (c.customer_id = @targetUserId AND c.seller_id = @adminId)
        )
    `;
    let params = [
      { name: 'adminId', value: adminId },
      { name: 'targetUserId', value: targetUserId }
    ];

    const existing = await db.query(existingQuery, params);
    
    if (existing.recordset && existing.recordset.length > 0) {
      // Đã có phòng chat nội bộ, trả về luôn
      return res.status(200).json({ conversation: existing.recordset[0] });
    }

    // Chưa có, tạo mới
    const newConv = await db.insert('conversations', {
      customer_id: adminId,
      seller_id: targetUserId,
      product_id: null,
      status: 'internal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Lấy thông tin người nhận để frontend hiển thị đúng
    const targetUser = await db.findOne('users', { id: targetUserId });
    
    const enrichedConv = {
      ...newConv,
      targetName: targetUser?.username || 'Unknown',
      targetAvatar: targetUser?.avatar || ''
    };

    res.status(201).json({ message: 'Đã tạo phòng chat nội bộ', conversation: enrichedConv });
  } catch (err) {
    console.error('Lỗi tạo phòng chat nội bộ:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};
