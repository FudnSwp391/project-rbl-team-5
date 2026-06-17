const { db } = require('../db');

// GET /api/messages/:bookingId
exports.getMessages = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const messages = await db.find('Messages', { booking_id: bookingId });

    // Enrich với thông tin người gửi
    const enrichedMessages = await Promise.all(messages.map(async (m) => {
      const sender = m.sender_id ? await db.findOne('users', { id: m.sender_id }) : null;
      return {
        ...m,
        senderId: m.sender_id,
        receiverId: m.receiver_id,
        bookingId: m.booking_id,
        text: m.text_content,
        senderName: sender ? sender.username : 'Ẩn danh',
        senderAvatar: sender ? sender.avatar : ''
      };
    }));

    res.json(enrichedMessages);
  } catch (err) {
    console.error('Lỗi lấy tin nhắn:', err);
    res.status(500).json({ message: 'Lỗi lấy tin nhắn.', error: err.message });
  }
};
