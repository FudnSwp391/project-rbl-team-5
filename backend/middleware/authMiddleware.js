const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'techcycle_secret_key_2026';

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

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Người dùng chưa xác thực.' });
    }
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';
    const hasRole = roles.map(r => r.toLowerCase()).includes(userRole);
    if (!hasRole) {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này.' });
    }
    next();
  };
};

authenticateToken.authenticateToken = authenticateToken;
authenticateToken.authorizeRoles = authorizeRoles;

module.exports = authenticateToken;
