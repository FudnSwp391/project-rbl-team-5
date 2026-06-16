const prisma = require('../prismaClient');

// Hàm helper: lấy hoặc tạo customer_profile
const getOrCreateCustomerProfile = async (userId) => {
  let profile = await prisma.customer_profiles.findUnique({ where: { user_id: userId } });
  if (!profile) {
    profile = await prisma.customer_profiles.create({
      data: { user_id: userId, address: 'Chưa cập nhật', total_spent: 0 }
    });
  }
  return profile;
};

// GET /api/bookings
exports.getBookings = async (req, res) => {
  try {
    let bookings = [];

    if (req.user.role === 'admin' || req.user.role === 'seller') {
      // Admin: lấy tất cả repair_bookings kèm repair_requests
      bookings = await prisma.repair_bookings.findMany({
        include: {
          repair_requests: true
        },
        orderBy: { created_at: 'desc' }
      });
    } else if (req.user.role === 'technician') {
      const techProfile = await prisma.technician_profiles.findUnique({ where: { user_id: req.user.id } });
      const techProfileId = techProfile ? techProfile.id : null;

      bookings = await prisma.repair_bookings.findMany({
        where: { technician_id: techProfileId },
        include: { repair_requests: true },
        orderBy: { created_at: 'desc' }
      });
    } else {
      // Customer
      const customerProfile = await getOrCreateCustomerProfile(req.user.id);
      bookings = await prisma.repair_bookings.findMany({
        where: {
          repair_requests: { customer_id: customerProfile.id }
        },
        include: { repair_requests: true },
        orderBy: { created_at: 'desc' }
      });
    }

    // Enrich với thông tin user
    const enrichedBookings = await Promise.all(bookings.map(async (b) => {
      const customerProfileId = b.repair_requests ? b.repair_requests.customer_id : null;

      const customerProfile = customerProfileId
        ? await prisma.customer_profiles.findUnique({ where: { id: customerProfileId } })
        : null;
      const customer = customerProfile
        ? await prisma.users.findUnique({ where: { id: customerProfile.user_id } })
        : null;

      const techProfile = b.technician_id
        ? await prisma.technician_profiles.findUnique({ where: { id: b.technician_id } })
        : null;
      const technician = techProfile
        ? await prisma.users.findUnique({ where: { id: techProfile.user_id } })
        : null;

      return {
        ...b,
        id: b.id,
        customerId: customer ? customer.id : null,
        technicianId: technician ? technician.id : null,
        device_type: 'Thiết bị điện tử',
        issue_description: b.repair_requests ? b.repair_requests.user_description : '',
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
    const customerProfile = await getOrCreateCustomerProfile(req.user.id);

    // Tạo repair_request và repair_booking trong transaction
    const result = await prisma.$transaction(async (tx) => {
      const newRequest = await tx.repair_requests.create({
        data: {
          customer_id: customerProfile.id,
          category_id: 1,
          user_description: `[${deviceType || 'Thiết bị'}] ${issueDescription}`,
          ai_raw_response: '',
          ai_damage_level: '',
          ai_conclusion: '',
          ai_recommendation: '',
          status: 'pending'
        }
      });

      const newBooking = await tx.repair_bookings.create({
        data: {
          repair_request_id: newRequest.id,
          technician_id: null,
          appointment_date: new Date(preferredDate),
          quoted_price: 0,
          address: customerProfile.address || '',
          notes: preferredTime ? `Khung giờ: ${preferredTime}` : '',
          status: 'pending'
        }
      });

      return newBooking;
    });

    res.status(201).json({ message: 'Đặt lịch thành công!', booking: result });
  } catch (err) {
    console.error('Lỗi đặt lịch:', err);
    res.status(500).json({ message: 'Lỗi đặt lịch.', error: err.message });
  }
};

// PUT /api/bookings/:id
exports.updateBooking = async (req, res) => {
  try {
    const booking = await prisma.repair_bookings.findUnique({
      where: { id: Number(req.params.id) }
    });
    if (!booking) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn.' });

    const { status, technicianId, cost, notes } = req.body;
    const data = {};

    if (status) data.status = status;

    if (technicianId !== undefined) {
      if (technicianId === null) {
        data.technician_id = null;
      } else {
        const techProfile = await prisma.technician_profiles.findUnique({
          where: { user_id: Number(technicianId) }
        });
        data.technician_id = techProfile ? techProfile.id : null;
      }
    }

    if (cost !== undefined) data.quoted_price = Number(cost);
    if (notes !== undefined) data.notes = notes;

    await prisma.repair_bookings.update({
      where: { id: Number(req.params.id) },
      data
    });

    res.json({ message: 'Cập nhật lịch hẹn thành công.' });
  } catch (err) {
    console.error('Lỗi cập nhật lịch hẹn:', err);
    res.status(500).json({ message: 'Lỗi cập nhật lịch hẹn.', error: err.message });
  }
};
