const prisma = require('../prismaClient');

const REVERSE_ROLE_MAP = { 1: 'admin', 2: 'customer', 3: 'technician', 4: 'seller' };

// GET /api/users/technicians
exports.getTechnicians = async (req, res) => {
  try {
    const techs = await prisma.users.findMany({ where: { role_id: 3 } });
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
  if (!['admin', 'Admin', 'seller'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Không có quyền truy cập.' });
  }
  try {
    const users = await prisma.users.findMany({ orderBy: { created_at: 'desc' } });
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
  if (!['admin', 'Admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Không có quyền thực hiện.' });
  }
  const userId = Number(req.params.id);
  if (userId === req.user.id) {
    return res.status(400).json({ message: 'Bạn không thể tự xóa tài khoản của chính mình.' });
  }
  try {
    await prisma.users.delete({ where: { id: userId } });
    res.json({ message: 'Xóa người dùng thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xóa người dùng.', error: err.message });
  }
};

// GET /api/users/stats - Admin thống kê
exports.getStats = async (req, res) => {
  if (!['admin', 'Admin', 'seller'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Không có quyền truy cập.' });
  }

  try {
    const [totalUsers, totalProducts, totalBookings, orders, bookings] = await Promise.all([
      prisma.users.count(),
      prisma.products.count(),
      prisma.repair_bookings.count(),
      prisma.orders.findMany(),
      prisma.repair_bookings.findMany()
    ]);

    const totalRevenue =
      orders
        .filter(o => ['Completed', 'completed', 'Shipping'].includes(o.status))
        .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) +
      bookings
        .filter(b => ['Completed', 'completed'].includes(b.status))
        .reduce((sum, b) => sum + (Number(b.quoted_price) || 0), 0);

    const completedBookings = bookings.filter(b =>
      ['Completed', 'completed'].includes(b.status)
    ).length;

    const pendingBookings = bookings.filter(b =>
      ['Pending', 'pending', 'Assigned', 'assigned', 'Inspecting', 'inspecting', 'Repairing', 'repairing'].includes(b.status)
    ).length;

    res.json({
      totalUsers,
      totalProducts,
      totalBookings,
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

// PUT /api/users/:id/status
exports.updateUserStatus = async (req, res) => {
  const userId = Number(req.params.id);
  const { status } = req.body;

  if (!status || !['active', 'suspended', 'inactive'].includes(status.toLowerCase())) {
    return res.status(400).json({ message: 'Trạng thái không hợp lệ. Phải là active, suspended hoặc inactive.' });
  }

  try {
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    await prisma.users.update({
      where: { id: userId },
      data: { status: status.toLowerCase() }
    });

    res.json({ message: `Cập nhật trạng thái người dùng sang '${status.toLowerCase()}' thành công.` });
  } catch (err) {
    console.error('Lỗi cập nhật trạng thái người dùng:', err);
    res.status(500).json({ message: 'Lỗi cập nhật trạng thái người dùng.', error: err.message });
  }
};
