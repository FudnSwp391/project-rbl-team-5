const prisma = require('../prismaClient');

// GET /api/messages/:bookingId
exports.getMessages = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const messages = await prisma.messages.findMany({
      where: { booking_id: Number(bookingId) },
      orderBy: { timestamp: 'asc' }
    });

    // Enrich với thông tin người gửi
    const enrichedMessages = await Promise.all(messages.map(async (m) => {
      const sender = m.sender_id
        ? await prisma.users.findUnique({ where: { id: m.sender_id } })
        : null;
      return {
        ...m,
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
