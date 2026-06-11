const jwt = require('jsonwebtoken');
// Import object db từ file db.js của bạn
const { db } = require('../db');

const JWT_SECRET = 'techcycle_secret_key_2026';

// Bảng ánh xạ role từ chữ (Client gửi lên) sang ID (Database cần)
const ROLE_MAP = {
  'admin': 1,
  'customer': 2,
  'technician': 3,
  'seller': 4
};

// Bảng ánh xạ ngược lại từ ID (Database trả về) sang chữ (Trả về cho Client)
const REVERSE_ROLE_MAP = {
  1: 'admin',
  2: 'customer',
  3: 'technician',
  4: 'seller'
};

exports.register = async (req, res) => {
  // Thêm full_name vì Database SQL của bạn bắt buộc phải có (NOT NULL)
  const { username, email, password, full_name, phone, role } = req.body;
  if (!username || !email || !password || !phone || !full_name) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin (bao gồm full_name).' });
  }

  try {
    const existingUser = await db.findOne('users', { email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã được đăng ký.' });
    }

    // Chuyển đổi từ chuỗi role sang ID số nguyên tương ứng cho SQL Server
    const targetRoleName = role || 'customer';
    const roleId = ROLE_MAP[targetRoleName] || 2;

    // ĐÃ SỬA: Lưu mật khẩu dạng chuỗi văn bản thuần (Plain Text) trực tiếp vào DB
    const newUser = await db.insert('users', {
      role_id: roleId,
      username,
      email,
      password, // Không dùng bcrypt băm mật khẩu
      full_name,
      phone,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
      status: 'active'
    });

    const token = jwt.sign({ id: newUser.id, role: targetRoleName, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        full_name: newUser.full_name,
        phone: newUser.phone,
        role: targetRoleName,
        avatar: newUser.avatar
      }
    });
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.status(500).json({ message: 'Lỗi đăng ký tài khoản.' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập tài khoản hoặc email và mật khẩu.' });
  }

  try {
    // Tìm kiếm người dùng trong SQL Server dựa trên email hoặc username
    let user;
    if (email.includes('@')) {
      user = await db.findOne('users', { email });
    } else {
      user = await db.findOne('users', { username: email });
    }
    
    if (!user) {
      return res.status(400).json({ message: 'Tài khoản không tồn tại.' });
    }

    // Kiểm tra trạng thái tài khoản
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Tài khoản đã bị vô hiệu hóa.' });
    }

    // ĐÃ SỬA: So sánh trực tiếp chuỗi văn bản thuần (Plain Text)
    // password người dùng nhập ('admin123') so sánh trực tiếp với user.password trong DB ('admin123')
    const isMatch = (password === user.password.trim());
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu không chính xác.' });
    }

    // Convert ngược role_id (số) từ db ra chuỗi chữ để đưa vào JWT và trả về client
    const clientRole = REVERSE_ROLE_MAP[user.role_id] || 'customer';

    const token = jwt.sign({ id: user.id, role: clientRole, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: clientRole,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ message: 'Lỗi xử lý đăng nhập.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await db.findOne('users', { id: req.user.id });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    const clientRole = REVERSE_ROLE_MAP[user.role_id] || 'customer';

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role: clientRole,
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Lỗi getMe:', error);
    res.status(500).json({ message: 'Lỗi lấy dữ liệu người dùng.' });
  }
};