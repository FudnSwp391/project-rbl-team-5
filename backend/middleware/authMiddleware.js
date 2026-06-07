const jwt = require('jsonwebtoken');
const JWT_SECRET = 'techcycle_secret_key_2026';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Token không tồn tại.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token không hợp lệ.' });
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
