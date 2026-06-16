const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../prismaClient');
const { sendOtpEmail } = require('../emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'techcycle_secret_key_2026';

const ROLE_MAP = {
  'admin': 1,
  'customer': 2,
  'technician': 3,
  'seller': 4
};

const REVERSE_ROLE_MAP = {
  1: 'admin',
  2: 'customer',
  3: 'technician',
  4: 'seller'
};

// In-memory OTP storage
const otpStore = new Map();

exports.register = async (req, res) => {
  const { username, email, password, full_name, phone, role } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc (Username, Email, Mật khẩu).' });
  }

  try {
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã được đăng ký.' });
    }

    let finalUsername = username;
    const existingUsername = await prisma.users.findUnique({ where: { username: finalUsername } });
    if (existingUsername) {
      finalUsername = `${username}_${String(Date.now()).slice(-4)}`;
    }

    let finalPhone = phone || '0900000000';
    const existingPhone = await prisma.users.findUnique({ where: { phone: finalPhone } });
    if (finalPhone === '0900000000' || existingPhone) {
      finalPhone = '09' + String(Date.now()).slice(-8);
    }

    const finalFullName = full_name || username;
    const targetRoleName = role || 'customer';
    const roleId = ROLE_MAP[targetRoleName] || 2;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.users.create({
      data: {
        role_id: roleId,
        username: finalUsername,
        email,
        password: hashedPassword,
        full_name: finalFullName,
        phone: finalPhone,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${finalUsername}`,
        status: 'active'
      }
    });

    const token = jwt.sign(
      { id: newUser.id, role: targetRoleName, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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
    let user;
    if (email.includes('@')) {
      user = await prisma.users.findUnique({ where: { email } });
    } else {
      user = await prisma.users.findUnique({ where: { username: email } });
    }

    if (!user) {
      return res.status(400).json({ message: 'Tài khoản không tồn tại.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Tài khoản đã bị vô hiệu hóa.' });
    }

    let isMatch = false;
    const dbPassword = user.password.trim();
    if (dbPassword.startsWith('$2a$') || dbPassword.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, dbPassword);
    } else {
      isMatch = (password === dbPassword);
    }

    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu không chính xác.' });
    }

    const clientRole = REVERSE_ROLE_MAP[user.role_id] || 'customer';
    const token = jwt.sign(
      { id: user.id, role: clientRole, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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
    const user = await prisma.users.findUnique({ where: { id: req.user.id } });
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

exports.logout = async (req, res) => {
  res.json({ message: 'Đăng xuất thành công.' });
};

// Gửi OTP về email để đặt lại mật khẩu
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Vui lòng cung cấp email.' });
  }

  try {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Email không tồn tại trong hệ thống.' });
    }

    // Tạo OTP 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 phút

    otpStore.set(email, { otp, expiresAt });

    // Log ra console để dev có thể dùng khi chưa có email config
    console.log(`\n==================================================`);
    console.log(`[PASSWORD RECOVERY] OTP cho ${email}: ${otp}`);
    console.log(`==================================================\n`);

    // Gửi OTP về email thật
    try {
      await sendOtpEmail(email, otp);
      res.json({
        message: `Mã OTP đã được gửi tới email ${email}. Vui lòng kiểm tra hộp thư (và thư mục Spam).`,
        email
      });
    } catch (emailError) {
      // Nếu gửi email thất bại (chưa cấu hình), vẫn trả về thành công kèm thông báo
      console.error('[EMAIL ERROR]', emailError.message);
      res.json({
        message: `Mã OTP đã tạo nhưng chưa gửi được email (chưa cấu hình SMTP). Mã OTP hiển thị trong console server.`,
        email,
        // Chỉ trả về OTP khi email gửi thất bại (để dev test được)
        otp_dev: process.env.NODE_ENV !== 'production' ? otp : undefined
      });
    }
  } catch (error) {
    console.error('Lỗi yêu cầu khôi phục mật khẩu:', error);
    res.status(500).json({ message: 'Lỗi xử lý yêu cầu khôi phục mật khẩu.' });
  }
};

// Đặt lại mật khẩu mới dùng OTP
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ email, mã xác nhận (OTP) và mật khẩu mới.' });
  }

  try {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Email không tồn tại.' });
    }

    const record = otpStore.get(email);
    if (!record || record.otp !== otp || Date.now() > record.expiresAt) {
      return res.status(400).json({ message: 'Mã xác nhận không đúng hoặc đã hết hạn.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.users.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    otpStore.delete(email);

    res.json({ message: 'Khôi phục mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.' });
  } catch (error) {
    console.error('Lỗi đặt lại mật khẩu:', error);
    res.status(500).json({ message: 'Lỗi xử lý đặt lại mật khẩu.' });
  }
};