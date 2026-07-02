const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { db } = require('./db');

// Import modular routes
const authRoutes = require('./routes/authRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const featureRoutes = require('./routes/featureRoutes');
const productRoutes = require('./routes/productRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const aiRoutes = require('./routes/aiRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const systemRoutes = require('./routes/systemRoutes');
const conversationRoutes = require('./routes/conversationRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 5000;

app.use(cors());

// Proxy requests to chatbot servers BEFORE body parsing to avoid stream consumption issues
const { createProxyMiddleware } = require('http-proxy-middleware');
app.use('/api/chatbot1', createProxyMiddleware({ 
  target: 'http://127.0.0.1:3001', 
  changeOrigin: true,
  pathRewrite: { '^/api/chatbot1': '/api' }
}));
app.use('/api/chatbot2', createProxyMiddleware({ 
  target: 'http://127.0.0.1:3002', 
  changeOrigin: true,
  pathRewrite: { '^/api/chatbot2': '/api' }
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded static files
const fs = require('fs');
const authenticateToken = require('./middleware/authMiddleware');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api', systemRoutes);

// In-memory notifications database (avoids touching SQL)
let notifications = [
  {
    id: '1',
    title: 'Chào mừng bạn đến với TechCycle!',
    message: 'Nền tảng mua sắm thiết bị cũ và đặt lịch sửa chữa chuyên nghiệp.',
    sender: 'System',
    createdAt: new Date().toISOString()
  }
];
app.set('notifications', notifications);

// In-memory complaints database
let complaints = [];

// API to handle complaints
app.post('/api/complaints', authenticateToken, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ message: 'Nội dung khiếu nại không được để trống' });
  
  const newComplaint = {
    id: Date.now().toString(),
    userId: req.user.id,
    content,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  complaints.push(newComplaint);
  res.status(201).json({ message: 'Đã gửi khiếu nại thành công', complaint: newComplaint });
});

// In-memory promo codes database
let promoCodes = [
  { code: 'CIGHENTER24', discount: 12, expiry: '2026-12-31', status: 'active' },
  { code: 'TECHREVIEW', discount: 10, expiry: '2025-01-01', status: 'expired' }
];

// POST /api/upload-images (Base64 file upload handler)
app.post('/api/upload-images', authenticateToken, async (req, res) => {
  try {
    const { images } = req.body;
    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ message: 'Danh sách hình ảnh không hợp lệ.' });
    }
    if (images.length > 10) {
      return res.status(400).json({ message: 'Tối đa chỉ được tải lên 10 hình ảnh.' });
    }

    const uploadedUrls = [];
    const API_BASE = (req.headers.host) ? `http://${req.headers.host}` : '';
    
    for (let i = 0; i < images.length; i++) {
      const imgData = images[i];
      if (imgData.startsWith('http')) {
        // Keep existing remote URLs as-is
        uploadedUrls.push(imgData);
        continue;
      }
      
      const matches = imgData.match(/^data:image\/([A-Za-z\-+]+);base64,(.+)$/);
      if (!matches) continue;

      const ext = matches[1];
      const data = matches[2];
      const buffer = Buffer.from(data, 'base64');

      const filename = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const filepath = path.join(uploadsDir, filename);

      fs.writeFileSync(filepath, buffer);
      uploadedUrls.push(`${API_BASE}/uploads/${filename}`);
    }

    res.json({ urls: uploadedUrls });
  } catch (err) {
    console.error('Lỗi upload ảnh:', err);
    res.status(500).json({ message: 'Lỗi tải lên hình ảnh.', error: err.message });
  }
});

// GET /api/notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const { userId } = req.query;
    let filtered = notifications;
    if (userId) {
      filtered = notifications.filter(n => !n.targetUserId || String(n.targetUserId) === String(userId));
    } else {
      filtered = notifications.filter(n => !n.targetUserId);
    }
    res.json([...filtered].reverse());
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lấy thông báo.', error: err.message });
  }
});

// POST /api/notifications
app.post('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { title, message, image, targetRole } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: 'Tiêu đề và nội dung là bắt buộc.' });
    }

    const newNotif = {
      id: Date.now().toString(),
      title,
      message,
      image: image || null,
      targetRole: targetRole || 'all',
      sender: req.user.role === 'admin' || req.user.role === 'Admin' ? 'Admin' : 'Seller',
      createdAt: new Date().toISOString()
    };
    
    notifications.push(newNotif);
    
    // Broadcast via socket.io to all users currently connected
    io.emit('newMarketingNotification', newNotif);

    res.status(201).json({ message: 'Tạo thông báo thành công.', notification: newNotif });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi tạo thông báo.', error: err.message });
  }
});

// GET /api/promocodes
app.get('/api/promocodes', authenticateToken, async (req, res) => {
  res.json(promoCodes);
});

// POST /api/promocodes
app.post('/api/promocodes', authenticateToken, async (req, res) => {
  try {
    const { code, discount, expiry, status } = req.body;
    if (!code || !discount) return res.status(400).json({ message: 'Missing code or discount' });
    const newPromo = { code, discount: Number(discount), expiry, status: status || 'active' };
    promoCodes.unshift(newPromo);
    res.status(201).json(newPromo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/promocodes/:code
app.delete('/api/promocodes/:code', authenticateToken, async (req, res) => {
  const codeToDelete = req.params.code;
  promoCodes = promoCodes.filter(p => p.code !== codeToDelete);
  res.json({ message: 'Deleted' });
});

// POST /api/promocodes/validate
app.post('/api/promocodes/validate', authenticateToken, async (req, res) => {
  const { code } = req.body;
  const promo = promoCodes.find(p => p.code.toLowerCase() === code.toLowerCase());
  if (!promo) {
    return res.status(404).json({ message: 'Mã khuyến mãi không tồn tại' });
  }
  if (promo.status !== 'active') {
    return res.status(400).json({ message: 'Mã khuyến mãi đã hết hạn' });
  }
  if (promo.expiry) {
    const expiryDate = new Date(promo.expiry);
    if (expiryDate < new Date()) {
      return res.status(400).json({ message: 'Mã khuyến mãi đã hết hạn sử dụng' });
    }
  }
  res.json({ discount: promo.discount, code: promo.code });
});

// In-memory claims registry
let couponClaims = [];

// GET /api/promocodes/my-claimed - Get current active claimed coupon
app.get('/api/promocodes/my-claimed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date().toISOString();
    
    // Find active claim
    const activeClaim = couponClaims.find(
      c => String(c.userId) === String(userId) && c.expiresAt > now
    );
    
    if (activeClaim) {
      const promo = promoCodes.find(p => p.code.toLowerCase() === activeClaim.code.toLowerCase());
      return res.json({
        code: activeClaim.code,
        discount: promo ? promo.discount : 10,
        expiresAt: activeClaim.expiresAt,
        claimedAt: activeClaim.claimedAt
      });
    }
    res.json(null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/promocodes/claim-random - Claim a random active promocode
app.post('/api/promocodes/claim-random', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const nowISO = now.toISOString();

    // check if claimed today in local date
    const todayStr = now.toLocaleDateString('vi-VN');
    const alreadyClaimedToday = couponClaims.some(c => {
      if (String(c.userId) !== String(userId)) return false;
      const claimDate = new Date(c.claimedAt).toLocaleDateString('vi-VN');
      return claimDate === todayStr;
    });

    if (alreadyClaimedToday) {
      return res.status(400).json({ message: 'Bạn đã nhận mã giảm giá cho hôm nay rồi. Vui lòng quay lại vào ngày mai!' });
    }

    // Filter active promos that are not yet expired
    const activePromos = promoCodes.filter(p => {
      if (p.status !== 'active') return false;
      if (p.expiry) {
        const expiryDate = new Date(p.expiry);
        if (expiryDate < now) return false;
      }
      return true;
    });

    if (activePromos.length === 0) {
      return res.status(400).json({ message: 'Hiện tại hệ thống không có mã giảm giá nào đang hoạt động. Vui lòng quay lại sau!' });
    }

    // Fisher-Yates shuffle the active list to eliminate any order bias, then pick a random index
    const shuffledPromos = [...activePromos];
    for (let i = shuffledPromos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffledPromos[i];
      shuffledPromos[i] = shuffledPromos[j];
      shuffledPromos[j] = temp;
    }

    const randomIndex = Math.floor(Math.random() * shuffledPromos.length);
    const selectedPromo = shuffledPromos[randomIndex];

    // Expiry in 24 hours or the promo's own expiry, whichever is sooner
    let expiresAtTime = Date.now() + 24 * 60 * 60 * 1000;
    if (selectedPromo.expiry) {
      const promoExpiryTime = new Date(selectedPromo.expiry).getTime();
      if (promoExpiryTime < expiresAtTime) {
        expiresAtTime = promoExpiryTime;
      }
    }
    const expiresAt = new Date(expiresAtTime).toISOString();

    const newClaim = {
      userId,
      code: selectedPromo.code,
      claimedAt: nowISO,
      expiresAt
    };

    couponClaims.push(newClaim);

    res.status(201).json({
      code: selectedPromo.code,
      discount: selectedPromo.discount,
      expiresAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SOCKET.IO CHAT HANDLING ---
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Register user socket in their personal room
  socket.on('registerUser', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} registered socket to room`);
  });

  // Join a conversation specific room
  socket.on('joinConversationRoom', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`Socket joined conversation room: conversation_${conversationId}`);
  });

  // Leave a conversation room
  socket.on('leaveConversationRoom', (roomName) => {
    socket.leave(roomName);
  });

  // Typing indicators
  socket.on('typing', ({ conversationId, userId, username }) => {
    socket.to(`conversation_${conversationId}`).emit('userTyping', { conversationId, userId, username });
  });

  socket.on('stopTyping', ({ conversationId, userId, username }) => {
    socket.to(`conversation_${conversationId}`).emit('userStopTyping', { conversationId, userId, username });
  });

  // Send messaging event
  socket.on('sendMessage', async (messageData) => {
    const { senderId, receiverId, conversationId, text, senderName, senderAvatar } = messageData;
    const now = new Date();

    // 1. Prepare message to emit immediately
    const enrichedMsg = {
      id: `temp_${Date.now()}`,
      senderId: senderId,
      receiverId: receiverId,
      conversationId: conversationId,
      text: text,
      createdAt: now.toISOString(),
      timestamp: now.toISOString(),
      senderName: senderName || 'Thành viên',
      senderAvatar: senderAvatar || ''
    };

    // 2. Emit to conversation room immediately (both sides)
    io.to(`conversation_${conversationId}`).emit('receiveMessage', enrichedMsg);

    // 3. Notify receiver for unread badge immediately
    if (receiverId) {
      io.to(String(receiverId)).emit('newMessageNotification', enrichedMsg);
      
      // 4. Send bell notification immediately
      const isImage = text && text.startsWith('[IMG]');
      const notifMessage = isImage
        ? `${enrichedMsg.senderName} đã gửi một hình ảnh trong cuộc trò chuyện.`
        : `${enrichedMsg.senderName}: ${text.length > 80 ? text.substring(0, 80) + '...' : text}`;

      const chatNotif = {
        id: String(Date.now() + Math.random()),
        title: `💬 Tin nhắn mới từ ${enrichedMsg.senderName}`,
        message: notifMessage,
        sender: enrichedMsg.senderName,
        createdAt: now.toISOString(),
        conversationId: conversationId,
        type: 'chat',
        targetUserId: receiverId
      };
      notifications.push(chatNotif);
      io.to(String(receiverId)).emit('newBellNotification', chatNotif);
    }

    // 5. Save to database asynchronously in the background
    try {
      db.query(
        `INSERT INTO messages (sender_id, receiver_id, conversation_id, text_content, timestamp)
         VALUES (@senderId, @receiverId, @conversationId, @text, GETUTCDATE());
         SELECT SCOPE_IDENTITY() AS newId;`,
        [
          { name: 'senderId', value: Number(senderId) },
          { name: 'receiverId', value: receiverId ? Number(receiverId) : null },
          { name: 'conversationId', value: Number(conversationId) },
          { name: 'text', value: text }
        ]
      ).then(async (saveResult) => {
        const newId = saveResult.recordset[0]?.newId || null;
        console.log(`[MSG] Async Saved message id=${newId} conversation=${conversationId} from=${senderId} to=${receiverId}`);
        
        let dbSenderName = senderName;
        let dbSenderAvatar = senderAvatar;

        if (!senderName) {
          const sender = await db.findOne('users', { id: Number(senderId) });
          if (sender) {
            dbSenderName = sender.username || sender.full_name || 'Thành viên';
            dbSenderAvatar = sender.avatar || '';
          }
        }

        const finalMsg = {
          ...enrichedMsg,
          id: newId,
          senderName: dbSenderName || 'Thành viên',
          senderAvatar: dbSenderAvatar || ''
        };
        io.to(`conversation_${conversationId}`).emit('receiveMessage', finalMsg);
      }).catch(err => {
        console.error('[MSG ERROR] Lỗi lưu DB async:', err.message);
      });
    } catch (err) {
      console.error('[MSG ERROR] Lỗi chuẩn bị query lưu tin nhắn:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// --- SERVE STATIC FRONTEND BUILD IN PRODUCTION ---
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('*', (req, res) => {
  if (!req.url.startsWith('/api')) {
    const indexPath = path.join(__dirname, '../frontend/dist/index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend build not found. Please use the Vite dev server (http://localhost:5173) during development.');
    }
  }
});

// --- START BACKGROUND JOBS ---
const { startOrderTimeoutCheck } = require('./controllers/orderController');
startOrderTimeoutCheck();

// --- START SERVER ---
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
