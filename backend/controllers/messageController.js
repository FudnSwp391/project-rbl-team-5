const db = require('../db');

exports.getMessages = (req, res) => {
  const { bookingId } = req.params;
  const messages = db.find('messages', { bookingId });
  
  const users = db.find('users');
  const enrichedMessages = messages.map(m => {
    const sender = users.find(u => u.id === m.senderId);
    return {
      ...m,
      senderName: sender ? sender.username : 'Ẩn danh',
      senderAvatar: sender ? sender.avatar : ''
    };
  });

  res.json(enrichedMessages);
};
