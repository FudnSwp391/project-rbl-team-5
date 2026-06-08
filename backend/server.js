const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
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
app.use(express.json());

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ai', aiRoutes);

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
  socket.on('sendMessage', (messageData) => {
    const { senderId, receiverId, bookingId, text } = messageData;
    
    // Save to database
    const savedMsg = db.insert('messages', {
      senderId,
      receiverId,
      bookingId,
      text,
      timestamp: new Date().toISOString()
    });

    const sender = db.findOne('users', { id: senderId });
    const enrichedMsg = {
      ...savedMsg,
      senderName: sender ? sender.username : 'Ẩn danh',
      senderAvatar: sender ? sender.avatar : ''
    };

    // Emit to booking room
    io.to(`booking_${bookingId}`).emit('receiveMessage', enrichedMsg);
    
    // Also emit directly to individual user rooms to notify/push notifications
    io.to(receiverId).emit('newMessageNotification', enrichedMsg);
    io.to(senderId).emit('messageSentConfirmation', enrichedMsg);
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
