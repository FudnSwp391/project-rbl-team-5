const db = require('../db');

exports.getBookings = (req, res) => {
  let bookings;
  if (req.user.role === 'admin') {
    bookings = db.find('bookings');
  } else if (req.user.role === 'technician') {
    bookings = db.find('bookings', { technicianId: req.user.id });
  } else {
    bookings = db.find('bookings', { customerId: req.user.id });
  }
  
  const users = db.find('users');
  const enrichedBookings = bookings.map(b => {
    const customer = users.find(u => u.id === b.customerId);
    const technician = users.find(u => u.id === b.technicianId);
    return {
      ...b,
      customerName: customer ? customer.username : 'Ẩn danh',
      customerPhone: customer ? customer.phone : '',
      technicianName: technician ? technician.username : 'Chưa phân công'
    };
  });

  res.json(enrichedBookings);
};

exports.createBooking = (req, res) => {
  const { deviceType, issueDescription, preferredDate, preferredTime } = req.body;
  if (!deviceType || !issueDescription || !preferredDate || !preferredTime) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin đặt lịch.' });
  }
  const newBooking = db.insert('bookings', {
    customerId: req.user.id,
    technicianId: null,
    deviceType,
    issueDescription,
    preferredDate,
    preferredTime,
    status: 'pending',
    cost: 0,
    notes: ''
  });
  res.status(201).json(newBooking);
};

exports.updateBooking = (req, res) => {
  const booking = db.findOne('bookings', { id: req.params.id });
  if (!booking) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn.' });

  if (req.user.role === 'customer' && booking.customerId !== req.user.id) {
    return res.status(403).json({ message: 'Không có quyền thay đổi.' });
  }

  const { status, technicianId, cost, notes } = req.body;
  const updates = {};
  if (status) updates.status = status;
  if (technicianId !== undefined) updates.technicianId = technicianId;
  if (cost !== undefined) updates.cost = Number(cost);
  if (notes !== undefined) updates.notes = notes;

  const updated = db.update('bookings', req.params.id, updates);
  res.json(updated);
};
