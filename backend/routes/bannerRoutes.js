const express = require('express');
const router = express.Router();
const { db } = require('../db');
const authenticateToken = require('../middleware/authMiddleware');

// GET /api/banners - Lấy danh sách banner
router.get('/', async (req, res) => {
  try {
    // Tạo bảng nếu chưa tồn tại
    await db.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'home_banners')
      BEGIN
        CREATE TABLE home_banners (
          id INT IDENTITY(1,1) PRIMARY KEY,
          badge NVARCHAR(255),
          title NVARCHAR(255),
          title_highlight NVARCHAR(255),
          subtitle NVARCHAR(MAX),
          image_url NVARCHAR(MAX),
          action_link NVARCHAR(255),
          display_order INT DEFAULT 0
        )
      END
    `);
    const banners = await db.query("SELECT * FROM home_banners ORDER BY display_order ASC");
    res.json(banners.recordset.map(b => ({
      id: b.id,
      badge: b.badge,
      title: b.title,
      titleHighlight: b.title_highlight,
      subtitle: b.subtitle,
      image: b.image_url,
      actionLink: b.action_link,
      displayOrder: b.display_order
    })));
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lấy danh sách banner.', error: err.message });
  }
});

// POST /api/banners - Thay thế toàn bộ danh sách banner (Yêu cầu Admin)
router.post('/', authenticateToken, async (req, res) => {
  if (req.user.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ message: 'Chỉ Admin mới có quyền cập nhật banner.' });
  }

  const { banners } = req.body;
  if (!Array.isArray(banners)) {
    return res.status(400).json({ message: 'Dữ liệu banners không hợp lệ. Phải là một mảng.' });
  }

  try {
    // Tạo bảng nếu chưa tồn tại
    await db.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'home_banners')
      BEGIN
        CREATE TABLE home_banners (
          id INT IDENTITY(1,1) PRIMARY KEY,
          badge NVARCHAR(255),
          title NVARCHAR(255),
          title_highlight NVARCHAR(255),
          subtitle NVARCHAR(MAX),
          image_url NVARCHAR(MAX),
          action_link NVARCHAR(255),
          display_order INT DEFAULT 0
        )
      END
    `);

    // Xóa hết banner cũ
    await db.query("DELETE FROM home_banners");

    // Thêm các banner mới
    for (let i = 0; i < banners.length; i++) {
      const b = banners[i];
      await db.query(`
        INSERT INTO home_banners (badge, title, title_highlight, subtitle, image_url, action_link, display_order)
        VALUES (@badge, @title, @titleHighlight, @subtitle, @image, @actionLink, @displayOrder)
      `, [
        { name: 'badge', value: b.badge || '' },
        { name: 'title', value: b.title || '' },
        { name: 'titleHighlight', value: b.titleHighlight || '' },
        { name: 'subtitle', value: b.subtitle || '' },
        { name: 'image', value: b.image || '' },
        { name: 'actionLink', value: b.actionLink || '' },
        { name: 'displayOrder', value: i + 1 }
      ]);
    }

    res.json({ message: 'Cập nhật danh sách banner thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi cập nhật banner.', error: err.message });
  }
});

module.exports = router;
