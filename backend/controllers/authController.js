const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// Import object db từ file db.js của bạn
const { db } = require('../db');
const { sendOtpEmail } = require('../emailService');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

const JWT_SECRET = process.env.JWT_SECRET || 'techcycle_secret_key_2026';

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

// In-memory OTP storage
const otpStore = new Map();

exports.register = async (req, res) => {
  const { username, email, password, full_name, phone, role } = req.body;
  const finalFullName = full_name || username;

  if (!username || !email || !password || !finalFullName) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
  }

  // Validate số điện thoại bắt buộc
  if (!phone || !phone.trim()) {
    return res.status(400).json({ message: 'Vui lòng nhập số điện thoại.' });
  }

  // Kiểm tra định dạng SĐT Việt Nam (10-11 chữ số, bắt đầu bằng 0)
  const phoneRegex = /^0\d{9,10}$/;
  if (!phoneRegex.test(phone.trim())) {
    return res.status(400).json({ message: 'Số điện thoại không hợp lệ. Vui lòng nhập 10-11 chữ số bắt đầu bằng 0.' });
  }

  try {
    const existingUser = await db.findOne('users', { email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã được đăng ký.' });
    }

    // Kiểm tra trùng SĐT
    const existingPhone = await db.findOne('users', { phone: phone.trim() });
    if (existingPhone) {
      return res.status(400).json({ message: 'Số điện thoại này đã được sử dụng.' });
    }

    // Chuyển đổi từ chuỗi role sang ID số nguyên tương ứng cho SQL Server
    const targetRoleName = role || 'customer';
    const roleId = ROLE_MAP[targetRoleName] || 2;

    // Băm mật khẩu sử dụng bcryptjs
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.insert('users', {
      role_id: roleId,
      username,
      email,
      password: hashedPassword,
      full_name: finalFullName,
      phone: phone.trim(),
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

    // So sánh mật khẩu bằng bcrypt hoặc plain text (để tương thích ngược với seed data plain text)
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
        description: user.description || '',
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
      description: user.description || '',
      role: clientRole,
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Lỗi getMe:', error);
    res.status(500).json({ message: 'Lỗi lấy dữ liệu người dùng.' });
  }
};

exports.updateProfile = async (req, res) => {
  const { username, email, description, phone } = req.body;
  
  if (!username || !email) {
    return res.status(400).json({ message: 'Tên đăng nhập và email là bắt buộc.' });
  }

  try {
    // Check if email is already taken by another user
    const existingUser = await db.findOne('users', { email });
    if (existingUser && String(existingUser.id) !== String(req.user.id)) {
      return res.status(400).json({ message: 'Email đã được sử dụng bởi tài khoản khác.' });
    }

    // Check if username is already taken by another user
    const existingUsername = await db.findOne('users', { username });
    if (existingUsername && String(existingUsername.id) !== String(req.user.id)) {
      return res.status(400).json({ message: 'Tên đăng nhập đã được sử dụng bởi tài khoản khác.' });
    }

    await db.query(
      `UPDATE users 
       SET username = @username, email = @email, description = @description, phone = @phone 
       WHERE id = @id`,
      [
        { name: 'username', value: username },
        { name: 'email', value: email },
        { name: 'description', value: description || null },
        { name: 'phone', value: phone || null },
        { name: 'id', value: req.user.id }
      ]
    );

    // Fetch updated user
    const updatedUser = await db.findOne('users', { id: req.user.id });
    const clientRole = REVERSE_ROLE_MAP[updatedUser.role_id] || 'customer';

    res.json({
      message: 'Cập nhật thông tin cá nhân thành công.',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        phone: updatedUser.phone,
        description: updatedUser.description || '',
        role: clientRole,
        avatar: updatedUser.avatar
      }
    });
  } catch (error) {
    console.error('Lỗi cập nhật profile:', error);
    res.status(500).json({ message: 'Lỗi xử lý cập nhật thông tin cá nhân.' });
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
    const user = await db.findOne('users', { email });
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
    const user = await db.findOne('users', { email });
    if (!user) {
      return res.status(404).json({ message: 'Email không tồn tại.' });
    }

    const record = otpStore.get(email);
    if (!record || record.otp !== otp || Date.now() > record.expiresAt) {
      return res.status(400).json({ message: 'Mã xác nhận không đúng hoặc đã hết hạn.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query('UPDATE users SET password = @password WHERE id = @id', [
      { name: 'password', value: hashedPassword },
      { name: 'id', value: user.id }
    ]);

    otpStore.delete(email);

    res.json({ message: 'Khôi phục mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.' });
  } catch (error) {
    console.error('Lỗi đặt lại mật khẩu:', error);
    res.status(500).json({ message: 'Lỗi xử lý đặt lại mật khẩu.' });
  }
};

// ===== GOOGLE OAUTH =====

// Bước 1: Tạo URL redirect đến trang đăng nhập Google
exports.googleLogin = (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  const url = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'select_account'
  });

  res.redirect(url);
};

// Bước 2: Google callback - nhận code, đổi lấy tokens, lấy thông tin user
exports.googleCallback = async (req, res) => {
  const { code } = req.query;
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5174';

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/#/auth?error=google_no_code`);
  }

  try {
    // Đổi authorization code lấy tokens
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // Lấy thông tin profile từ Google
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.redirect(`${FRONTEND_URL}/#/auth?error=google_no_email`);
    }

    // Tìm user theo email
    let user = await db.findOne('users', { email });

    if (user) {
      // User đã tồn tại - kiểm tra trạng thái
      if (user.status !== 'active') {
        return res.redirect(`${FRONTEND_URL}/#/auth?error=account_disabled`);
      }
    } else {
      // Tạo tài khoản mới từ Google
      // Đảm bảo username không trùng lặp
      let baseUsername = name || email.split('@')[0];
      let finalUsername = baseUsername;
      let attempt = 0;
      while (await db.findOne('users', { username: finalUsername })) {
        attempt++;
        finalUsername = `${baseUsername}_${attempt}`;
      }

      const avatar = picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${finalUsername}`;
      // Tạo random password hash (user không thể dùng password này để đăng nhập thông thường)
      const randomPassword = await bcrypt.hash(`google_oauth_${Date.now()}_${Math.random()}`, 10);
      // Tạo phone dummy unique vì cột phone NOT NULL UNIQUE trong DB
      const dummyPhone = `google_${Date.now()}`.substring(0, 15);

      user = await db.insert('users', {
        role_id: 2, // customer
        username: finalUsername,
        email: email,
        password: randomPassword,
        full_name: name || finalUsername,
        phone: dummyPhone,
        avatar: avatar,
        status: 'active'
      });
    }

    // Tạo JWT token
    const clientRole = REVERSE_ROLE_MAP[user.role_id] || 'customer';
    const token = jwt.sign(
      { id: user.id, role: clientRole, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect về frontend kèm token
    res.redirect(`${FRONTEND_URL}/#/auth?google_token=${token}`);

  } catch (error) {
    console.error('Lỗi Google OAuth callback:', error);
    res.redirect(`${FRONTEND_URL}/#/auth?error=google_auth_failed`);
  }
};