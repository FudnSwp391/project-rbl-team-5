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
  if (req.user.role !== 'Admin' && req.user.role !== 'admin' && req.user.role !== 'seller') {
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
    // Check if target user is admin
    const targetUser = await db.findOne('users', { id: userId });
    if (targetUser && targetUser.role_id === 1) {
      return res.status(403).json({ message: 'Cannot delete admin accounts.' });
    }
    await db.query('DELETE FROM users WHERE id = @id', [{ name: 'id', value: userId }]);
    res.json({ message: 'Xóa người dùng thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xóa người dùng.', error: err.message });
  }
};

// GET /api/users/stats - Admin thống kê
exports.getStats = async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'admin' && req.user.role !== 'seller') {
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

// GET /api/users/technicians/busy
exports.getBusyTimes = async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin' || req.user.role === 'Admin') {
      result = await db.query(`
        SELECT tbt.id, tbt.busy_date AS busyDate, tbt.busy_time AS busyTime, tbt.reason, tp.user_id AS technicianUserId, u.username AS technicianName
        FROM dbo.technician_busy_times tbt
        INNER JOIN dbo.technician_profiles tp ON tbt.technician_id = tp.id
        INNER JOIN dbo.users u ON tp.user_id = u.id
        ORDER BY tbt.busy_date DESC, tbt.busy_time ASC
      `);
    } else if (req.user.role === 'technician') {
      result = await db.query(`
        SELECT tbt.id, tbt.busy_date AS busyDate, tbt.busy_time AS busyTime, tbt.reason, tp.user_id AS technicianUserId, u.username AS technicianName
        FROM dbo.technician_busy_times tbt
        INNER JOIN dbo.technician_profiles tp ON tbt.technician_id = tp.id
        INNER JOIN dbo.users u ON tp.user_id = u.id
        WHERE tp.user_id = @userId
        ORDER BY tbt.busy_date DESC, tbt.busy_time ASC
      `, [{ name: 'userId', value: req.user.id }]);
    } else {
      return res.status(403).json({ message: 'Không có quyền truy cập.' });
    }
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lấy lịch bận.', error: err.message });
  }
};

// POST /api/users/technicians/busy
exports.addBusyTime = async (req, res) => {
  try {
    const { busyDate, busyTime, reason } = req.body;
    let targetUserId = req.user.id; // Mặc định là tài khoản hiện tại
    
    // Nếu Admin đang thêm lịch bận, họ có thể chỉ định mã người dùng của kỹ thuật viên
    if ((req.user.role === 'admin' || req.user.role === 'Admin') && req.body.technicianUserId) {
      targetUserId = req.body.technicianUserId;
    }
    
    const techProfile = await db.findOne('technician_profiles', { user_id: targetUserId });
    if (!techProfile) {
      return res.status(404).json({ message: 'Không tìm thấy hồ sơ kỹ thuật viên cho người dùng này.' });
    }
    
    const busyRecord = await db.insert('technician_busy_times', {
      technician_id: techProfile.id,
      busy_date: busyDate,
      busy_time: busyTime,
      reason: reason || ''
    });
    
    res.status(201).json({ message: 'Thêm lịch bận thành công.', data: busyRecord });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi thêm lịch bận.', error: err.message });
  }
};

// DELETE /api/users/technicians/busy/:id
exports.deleteBusyTime = async (req, res) => {
  try {
    const busyId = req.params.id;
    
    // Nếu là kỹ thuật viên, đảm bảo họ chỉ được xóa lịch bận của chính mình
    if (req.user.role === 'technician') {
      const techProfile = await db.findOne('technician_profiles', { user_id: req.user.id });
      if (!techProfile) {
        return res.status(404).json({ message: 'Không tìm thấy hồ sơ kỹ thuật viên.' });
      }
      
      const busyTimeRecord = await db.findOne('technician_busy_times', { id: busyId });
      if (!busyTimeRecord) {
        return res.status(404).json({ message: 'Không tìm thấy bản ghi lịch bận.' });
      }
      
      if (busyTimeRecord.technician_id !== techProfile.id) {
        return res.status(403).json({ message: 'Bạn không có quyền xóa lịch bận của kỹ thuật viên khác.' });
      }
    }
    
    await db.query('DELETE FROM dbo.technician_busy_times WHERE id = @id', [{ name: 'id', value: busyId }]);
    res.json({ message: 'Xóa lịch bận thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xóa lịch bận.', error: err.message });
  }
};

// PUT /api/users/:id/role
exports.updateUserRole = async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can change user roles.' });
  }
  const userId = req.params.id;
  const { role } = req.body;
  const ROLE_MAP = { admin: 1, customer: 2, technician: 3, seller: 4 };
  if (!role || !ROLE_MAP[role]) {
    return res.status(400).json({ message: 'Invalid role. Must be: customer, technician, or seller.' });
  }
  try {
    const targetUser = await db.findOne('users', { id: userId });
    if (!targetUser) return res.status(404).json({ message: 'User not found.' });
    if (targetUser.role_id === 1) {
      return res.status(403).json({ message: 'Cannot change role of admin accounts.' });
    }
    await db.query('UPDATE users SET role_id = @roleId WHERE id = @id', [
      { name: 'roleId', value: ROLE_MAP[role] },
      { name: 'id', value: userId }
    ]);
    res.json({ message: `User role updated to ${role} successfully.` });
  } catch (err) {
    res.status(500).json({ message: 'Error updating user role.', error: err.message });
  }
};
