const db = require('../db');

exports.getTechnicians = (req, res) => {
  const techs = db.find('users', { role: 'technician' });
  res.json(techs.map(t => ({ id: t.id, username: t.username, email: t.email, phone: t.phone, avatar: t.avatar })));
};

exports.getUsersList = (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Không có quyền truy cập.' });
  }
  const users = db.find('users');
  res.json(users.map(u => ({ id: u.id, username: u.username, email: u.email, phone: u.phone, role: u.role, createdAt: u.createdAt })));
};

exports.deleteUser = (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Không có quyền thực hiện.' });
  }
  const userId = req.params.id;
  if (userId === req.user.id) {
    return res.status(400).json({ message: 'Bạn không thể tự xóa tài khoản của chính mình.' });
  }
  db.delete('users', userId);
  res.json({ message: 'Xóa người dùng thành công.' });
};

exports.getStats = (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Không có quyền truy cập.' });
  }

  const orders = db.find('orders');
  const bookings = db.find('bookings');
  const products = db.find('products');
  const users = db.find('users');

  const totalRevenue = orders
    .filter(o => o.status === 'completed' || o.status === 'shipping')
    .reduce((sum, o) => sum + o.totalAmount, 0) + 
    bookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + (b.cost || 0), 0);

  const completedBookings = bookings.filter(b => b.status === 'completed').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending' || b.status === 'assigned' || b.status === 'inspecting' || b.status === 'repairing').length;

  res.json({
    totalUsers: users.length,
    totalProducts: products.length,
    totalBookings: bookings.length,
    totalRevenue,
    completedBookings,
    pendingBookings,
    revenueChartData: [
      { month: 'T1', marketplace: 12000000, repair: 3000000 },
      { month: 'T2', marketplace: 15000000, repair: 4500000 },
      { month: 'T3', marketplace: 18000000, repair: 5000000 },
      { month: 'T4', marketplace: 22000000, repair: 7500000 },
      { month: 'T5', marketplace: totalRevenue * 0.7, repair: totalRevenue * 0.3 }
    ]
  });
};
