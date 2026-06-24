const { db } = require('../db');

// GET /api/messages/:bookingId
exports.getMessages = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const result = await db.query(
      `SELECT 
         m.id,
         m.sender_id   AS senderId,
         m.receiver_id AS receiverId,
         m.booking_id  AS bookingId,
         m.text_content AS text,
         m.timestamp   AS createdAt,
         u.username    AS senderName,
         u.avatar      AS senderAvatar
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.booking_id = @bookingId
       ORDER BY m.timestamp ASC`,
      [{ name: 'bookingId', value: Number(bookingId) }]
    );

    res.json(result.recordset || []);
  } catch (err) {
    console.error('Lỗi lấy tin nhắn:', err);
    res.status(500).json({ message: 'Lỗi lấy tin nhắn.', error: err.message });
  }
};
