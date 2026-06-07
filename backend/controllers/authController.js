const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = 'techcycle_secret_key_2026';

exports.register = async (req, res) => {
  const { username, email, password, phone, role } = req.body;
  if (!username || !email || !password || !phone) {
    return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
  }

  const existingUser = db.findOne('users', { email });
  if (existingUser) {
    return res.status(400).json({ message: 'Email đã được đăng ký.' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = db.insert('users', {
      username,
      email,
      password: hashedPassword,
      phone,
      role: role || 'customer',
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`
    });

    const token = jwt.sign({ id: newUser.id, role: newUser.role, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email, phone: newUser.phone, role: newUser.role, avatar: newUser.avatar }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi đăng ký tài khoản.' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu.' });
  }

  const user = db.findOne('users', { email });
  if (!user) {
    return res.status(400).json({ message: 'Tài khoản không tồn tại.' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Mật khẩu không chính xác.' });
  }

  const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, phone: user.phone, role: user.role, avatar: user.avatar }
  });
};

exports.getMe = (req, res) => {
  const user = db.findOne('users', { id: req.user.id });
  if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
  res.json({ id: user.id, username: user.username, email: user.email, phone: user.phone, role: user.role, avatar: user.avatar });
};
