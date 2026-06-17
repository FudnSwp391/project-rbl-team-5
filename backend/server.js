const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./db');

// Import modular routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const aiRoutes = require('./routes/aiRoutes');

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
app.use('/api/products', productRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ai', aiRoutes);

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

  // Send messaging event
  socket.on('sendMessage', async (messageData) => {
    const { senderId, receiverId, bookingId, text } = messageData;
    
    try {
      // Save to database (await vì đây là hàm async)
      const savedMsg = await db.insert('messages', {
        sender_id: senderId,
        receiver_id: receiverId,
        booking_id: bookingId,
        text_content: text,
        timestamp: new Date().toISOString()
      });

      // Map back to camelCase properties before sending via socket
      const enrichedMsgBase = {
        id: savedMsg.id,
        senderId: savedMsg.sender_id || senderId,
        receiverId: savedMsg.receiver_id || receiverId,
        bookingId: savedMsg.booking_id || bookingId,
        text: savedMsg.text_content || text,
        timestamp: savedMsg.timestamp || new Date().toISOString()
      };

      const sender = await db.findOne('users', { id: senderId });
      const enrichedMsg = {
        ...enrichedMsgBase,
        senderName: sender ? sender.username : 'Ẩn danh',
        senderAvatar: sender ? sender.avatar : ''
      };

      // Emit to booking room
      io.to(`booking_${bookingId}`).emit('receiveMessage', enrichedMsg);
      
      // Also emit directly to individual user rooms to notify/push notifications
      io.to(receiverId).emit('newMessageNotification', enrichedMsg);
      io.to(senderId).emit('messageSentConfirmation', enrichedMsg);
    } catch (err) {
      console.error('Lỗi xử lý tin nhắn socket:', err);
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

// --- START SERVER ---
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
