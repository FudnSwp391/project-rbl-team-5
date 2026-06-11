const { db } = require('../db');

// GET /api/bookings
exports.getBookings = async (req, res) => {
  try {
    let bookings = [];

    if (req.user.role === 'admin') {
      // Admin thấy tất cả repair_bookings JOIN repair_requests
      const result = await db.query(`
        SELECT rb.*, rr.customer_id, rr.user_description, rr.status AS req_status
        FROM repair_bookings rb
        LEFT JOIN repair_requests rr ON rb.repair_request_id = rr.id
        ORDER BY rb.created_at DESC
      `);
      bookings = result.recordset;
    } else if (req.user.role === 'technician') {
      const technicianProfile = await db.findOne('technician_profiles', { user_id: req.user.id });
      const techProfileId = technicianProfile ? technicianProfile.id : null;

      const result = await db.query(
        `SELECT rb.*, rr.customer_id, rr.user_description
         FROM repair_bookings rb
         LEFT JOIN repair_requests rr ON rb.repair_request_id = rr.id
         WHERE rb.technician_id = @id
         ORDER BY rb.created_at DESC`,
        [{ name: 'id', value: techProfileId }]
      );
      bookings = result.recordset;
    } else {
      // Customer: lấy bookings của chính họ qua repair_requests
      let customerProfile = await db.findOne('customer_profiles', { user_id: req.user.id });
      if (!customerProfile) {
        customerProfile = await db.insert('customer_profiles', {
          user_id: req.user.id,
          address: 'Chưa cập nhật',
          total_spent: 0
        });
      }
      const custProfileId = customerProfile.id;

      const result = await db.query(
        `SELECT rb.*, rr.customer_id, rr.user_description
         FROM repair_bookings rb
         INNER JOIN repair_requests rr ON rb.repair_request_id = rr.id
         WHERE rr.customer_id = @customerId
         ORDER BY rb.created_at DESC`,
        [{ name: 'customerId', value: custProfileId }]
      );
      bookings = result.recordset;
    }

    // Enrich với thông tin user từ profiles
    const enrichedBookings = await Promise.all(bookings.map(async (b) => {
      const customerProfileId = b.customer_id || null;
      
      const customerProfile = customerProfileId ? await db.findOne('customer_profiles', { id: customerProfileId }) : null;
      const customer = customerProfile ? await db.findOne('users', { id: customerProfile.user_id }) : null;

      const technicianProfile = b.technician_id ? await db.findOne('technician_profiles', { id: b.technician_id }) : null;
      const technician = technicianProfile ? await db.findOne('users', { id: technicianProfile.user_id }) : null;

      return {
        ...b,
        id: b.id,
        customerId: customer ? customer.id : null,
        technicianId: technician ? technician.id : null,
        device_type: 'Thiết bị điện tử',
        issue_description: b.user_description || '',
        customerName: customer ? (customer.full_name || customer.username) : 'Ẩn danh',
        customerPhone: customer ? customer.phone : '',
        technicianName: technician ? (technician.full_name || technician.username) : 'Chưa phân công',
        preferred_date: b.appointment_date,
        cost: b.quoted_price
      };
    }));

    res.json(enrichedBookings);
  } catch (err) {
    console.error('Lỗi lấy danh sách lịch hẹn:', err);
    res.status(500).json({ message: 'Lỗi lấy danh sách lịch hẹn.', error: err.message });
  }
};

// POST /api/bookings
exports.createBooking = async (req, res) => {
  const { deviceType, issueDescription, preferredDate, preferredTime } = req.body;
  if (!issueDescription || !preferredDate) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin đặt lịch.' });
  }

  try {
    const now = new Date().toISOString();

    let customerProfile = await db.findOne('customer_profiles', { user_id: req.user.id });
    if (!customerProfile) {
      customerProfile = await db.insert('customer_profiles', {
        user_id: req.user.id,
        address: 'Chưa cập nhật',
        total_spent: 0
      });
    }

    // Tạo repair_request trước
    const newRequest = await db.insert('repair_requests', {
      customer_id: customerProfile.id,
      category_id: 1, // default category
      user_description: `[${deviceType || 'Thiết bị'}] ${issueDescription}`,
      ai_raw_response: '',
      ai_damage_level: '',
      ai_conclusion: '',
      ai_recommendation: '',
      status: 'pending',
      created_at: now,
      updated_at: now
    });

    // Tạo repair_booking liên kết
    const newBooking = await db.insert('repair_bookings', {
      repair_request_id: newRequest.id,
      technician_id: null,
      appointment_date: preferredDate,
      quoted_price: 0,
      address: customerProfile.address || '',
      notes: preferredTime ? `Khung giờ: ${preferredTime}` : '',
      status: 'pending',
      created_at: now,
      updated_at: now
    });

    res.status(201).json({ message: 'Đặt lịch thành công!', booking: newBooking });
  } catch (err) {
    console.error('Lỗi đặt lịch:', err);
    res.status(500).json({ message: 'Lỗi đặt lịch.', error: err.message });
  }
};

// PUT /api/bookings/:id
exports.updateBooking = async (req, res) => {
  try {
    // PK của bảng repair_bookings là 'id'
    const booking = await db.findOne('repair_bookings', { id: req.params.id });
    if (!booking) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn.' });

    const { status, technicianId, cost, notes } = req.body;
    const updates = {};
    if (status) updates.status = status;
    
    if (technicianId !== undefined) {
      if (technicianId === null) {
        updates.technician_id = null;
      } else {
        const techProfile = await db.findOne('technician_profiles', { user_id: technicianId });
        updates.technician_id = techProfile ? techProfile.id : null;
      }
    }
    
    if (cost !== undefined) updates.quoted_price = Number(cost);
    if (notes !== undefined) updates.notes = notes;
    updates.updated_at = new Date().toISOString();

    await db.update('repair_bookings', 'id', req.params.id, updates);
    res.json({ message: 'Cập nhật lịch hẹn thành công.' });
  } catch (err) {
    console.error('Lỗi cập nhật lịch hẹn:', err);
    res.status(500).json({ message: 'Lỗi cập nhật lịch hẹn.', error: err.message });
  }
};
