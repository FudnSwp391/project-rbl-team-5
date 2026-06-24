const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
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
    res.json([...notifications].reverse());
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
  res.json({ discount: promo.discount, code: promo.code });
});

// --- SOCKET.IO CHAT HANDLING ---
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Register user socket in their personal room
  socket.on('registerUser', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} registered socket to room`);
  });

  // Join a booking specific room
  socket.on('joinBookingRoom', (bookingId) => {
    socket.join(`booking_${bookingId}`);
    console.log(`Socket joined booking room: booking_${bookingId}`);
  });

  // Leave a booking room
  socket.on('leaveBookingRoom', (roomName) => {
    socket.leave(roomName);
  });

  // Typing indicators
  socket.on('typing', ({ bookingId, userId, username }) => {
    socket.to(`booking_${bookingId}`).emit('userTyping', { bookingId, userId, username });
  });

  socket.on('stopTyping', ({ bookingId, userId, username }) => {
    socket.to(`booking_${bookingId}`).emit('userStopTyping', { bookingId, userId, username });
  });

  // Send messaging event
  socket.on('sendMessage', async (messageData) => {
    const { senderId, receiverId, bookingId, text } = messageData;
    const now = new Date();

    // Chuẩn bị message object để emit ngay (trước khi save DB)
    const tempMsg = {
      id: null,
      senderId: senderId,
      receiverId: receiverId,
      bookingId: bookingId,
      text: text,
      createdAt: now.toISOString(),
      timestamp: now.toISOString(),
      senderName: 'Loading...'
    };

    try {
      // Lấy thông tin sender để enrich message
      const sender = await db.findOne('users', { id: Number(senderId) });
      const enrichedMsg = {
        ...tempMsg,
        senderName: sender ? (sender.username || sender.full_name || 'Thành viên') : 'Thành viên',
        senderAvatar: sender ? (sender.avatar || '') : ''
      };

      // Save vào DB bằng raw SQL query để tránh vấn đề với db.insert
      const saveResult = await db.query(
        `INSERT INTO messages (sender_id, receiver_id, booking_id, text_content, timestamp)
         VALUES (@senderId, @receiverId, @bookingId, @text, GETDATE());
         SELECT SCOPE_IDENTITY() AS newId;`,
        [
          { name: 'senderId', value: Number(senderId) },
          { name: 'receiverId', value: Number(receiverId) },
          { name: 'bookingId', value: Number(bookingId) },
          { name: 'text', value: text }
        ]
      );

      const newId = saveResult.recordset[0]?.newId || null;
      enrichedMsg.id = newId;

      console.log(`[MSG] Saved message id=${newId} booking=${bookingId} from=${senderId} to=${receiverId}`);

      // Emit to booking room (cả 2 phía)
      io.to(`booking_${bookingId}`).emit('receiveMessage', enrichedMsg);

      // Notify người nhận (cho badge thông báo)
      io.to(String(receiverId)).emit('newMessageNotification', enrichedMsg);

    } catch (err) {
      console.error('[MSG ERROR] Lỗi xử lý tin nhắn socket:', err.message);
      // Vẫn emit để real-time không bị mất, dù DB fail
      io.to(`booking_${bookingId}`).emit('receiveMessage', tempMsg);
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
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
});

// --- START BACKGROUND JOBS ---
const { startOrderTimeoutCheck } = require('./controllers/orderController');
startOrderTimeoutCheck();

// --- START SERVER ---
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
