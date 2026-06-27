const { db } = require('../db');

// GET /api/messages/:conversationId
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const result = await db.query(
      `SELECT 
         m.id,
         m.sender_id   AS senderId,
         m.receiver_id AS receiverId,
         m.conversation_id  AS conversationId,
         m.text_content AS text,
         m.timestamp   AS createdAt,
         u.username    AS senderName,
         u.avatar      AS senderAvatar
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = @conversationId
       ORDER BY m.timestamp ASC`,
      [{ name: 'conversationId', value: Number(conversationId) }]
    );

    res.json(result.recordset || []);
  } catch (err) {
    console.error('Lỗi lấy tin nhắn:', err);
    res.status(500).json({ message: 'Lỗi lấy tin nhắn.', error: err.message });
  }
};
