const { db } = require('../db');

// GET /api/users/technicians
exports.getTechnicians = async (req, res) => {
  try {
    // 3 is usually technician role_id
    const techs = await db.find('users', { role_id: 3 });
    res.json(techs.map(t => ({
      id: t.id,
      username: t.username,
      email: t.email,
      phone: t.phone,
      avatar: t.avatar
    })));
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lấy danh sách kỹ thuật viên.', error: err.message });
  }
};

// GET /api/users - Admin xem tất cả user
exports.getUsersList = async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Không có quyền truy cập.' });
  }
  try {
    const users = await db.find('users');
    const REVERSE_ROLE_MAP = { 1: 'admin', 2: 'customer', 3: 'technician', 4: 'seller' };
    res.json(users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      phone: u.phone,
      role: REVERSE_ROLE_MAP[u.role_id] || 'customer',
      createdAt: u.created_at
    })));
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lấy danh sách người dùng.', error: err.message });
  }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Không có quyền thực hiện.' });
  }
  const userId = req.params.id;
  if (String(userId) === String(req.user.id)) {
    return res.status(400).json({ message: 'Bạn không thể tự xóa tài khoản của chính mình.' });
  }
  try {
    await db.query('DELETE FROM users WHERE id = @id', [{ name: 'id', value: userId }]);
    res.json({ message: 'Xóa người dùng thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xóa người dùng.', error: err.message });
  }
};

// GET /api/users/stats - Admin thống kê
exports.getStats = async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Không có quyền truy cập.' });
  }

  try {
    const orders   = await db.find('orders');
    const bookings = await db.find('repair_bookings');
    const products = await db.find('products');
    const users    = await db.find('users');

    const totalRevenue =
      orders
        .filter(o => o.status === 'Completed' || o.status === 'completed' || o.status === 'Shipping')
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) +
      bookings
        .filter(b => b.status === 'Completed' || b.status === 'completed')
        .reduce((sum, b) => sum + (Number(b.cost) || 0), 0);

    const completedBookings = bookings.filter(b =>
      b.status === 'Completed' || b.status === 'completed'
    ).length;

    const pendingBookings = bookings.filter(b =>
      ['Pending', 'pending', 'Assigned', 'assigned', 'Inspecting', 'inspecting', 'Repairing', 'repairing'].includes(b.status)
    ).length;

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
        { month: 'T5', marketplace: Math.round(totalRevenue * 0.7), repair: Math.round(totalRevenue * 0.3) }
      ]
    });
  } catch (err) {
    console.error('Lỗi lấy thống kê:', err);
    res.status(500).json({ message: 'Lỗi lấy thống kê.', error: err.message });
  }
};
