const express = require('express');
const router = express.Router();
const { db } = require('../db');
const authenticateToken = require('../middleware/authMiddleware');

// GET /api/features - Lấy nội dung section "Vì sao TechCycle"
router.get('/', async (req, res) => {
  try {
    // Tạo bảng nếu chưa tồn tại
    await db.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'home_features')
      BEGIN
        CREATE TABLE home_features (
          id INT IDENTITY(1,1) PRIMARY KEY,
          section_subtitle NVARCHAR(200),
          section_title NVARCHAR(500),
          section_desc NVARCHAR(MAX),
          section_image VARCHAR(MAX) NULL,
          feature_icon NVARCHAR(50),
          feature_title NVARCHAR(200),
          feature_desc NVARCHAR(MAX),
          display_order INT DEFAULT 0
        )
      END
    `);
    const result = await db.query("SELECT * FROM home_features ORDER BY display_order ASC");
    if (result.recordset.length === 0) {
      return res.json([]);
    }
    res.json(result.recordset.map(f => ({
      id: f.id,
      sectionSubtitle: f.section_subtitle,
      sectionTitle: f.section_title,
      sectionDesc: f.section_desc,
      sectionImage: f.section_image,
      featureIcon: f.feature_icon,
      featureTitle: f.feature_title,
      featureDesc: f.feature_desc,
      displayOrder: f.display_order
    })));
  } catch (err) {
    // Table might not exist yet, return empty
    res.json([]);
  }
});

// POST /api/features - Cập nhật toàn bộ nội dung features (Admin only)
router.post('/', authenticateToken, async (req, res) => {
  if (req.user.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ message: 'Chỉ Admin mới có quyền cập nhật nội dung.' });
  }

  const { features } = req.body;
  if (!Array.isArray(features)) {
    return res.status(400).json({ message: 'Dữ liệu features không hợp lệ.' });
  }

  try {
    // Tạo bảng nếu chưa tồn tại
    await db.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'home_features')
      BEGIN
        CREATE TABLE home_features (
          id INT IDENTITY(1,1) PRIMARY KEY,
          section_subtitle NVARCHAR(200),
          section_title NVARCHAR(500),
          section_desc NVARCHAR(MAX),
          section_image VARCHAR(MAX) NULL,
          feature_icon NVARCHAR(50),
          feature_title NVARCHAR(200),
          feature_desc NVARCHAR(MAX),
          display_order INT DEFAULT 0
        )
      END
    `);

    // Xóa hết dữ liệu cũ
    await db.query("DELETE FROM home_features");

    // Thêm dữ liệu mới
    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      await db.query(`
        INSERT INTO home_features (section_subtitle, section_title, section_desc, section_image, feature_icon, feature_title, feature_desc, display_order)
        VALUES (@sectionSubtitle, @sectionTitle, @sectionDesc, @sectionImage, @featureIcon, @featureTitle, @featureDesc, @displayOrder)
      `, [
        { name: 'sectionSubtitle', value: f.sectionSubtitle || '' },
        { name: 'sectionTitle', value: f.sectionTitle || '' },
        { name: 'sectionDesc', value: f.sectionDesc || '' },
        { name: 'sectionImage', value: f.sectionImage || '' },
        { name: 'featureIcon', value: f.featureIcon || 'cpu' },
        { name: 'featureTitle', value: f.featureTitle || '' },
        { name: 'featureDesc', value: f.featureDesc || '' },
        { name: 'displayOrder', value: i + 1 }
      ]);
    }

    res.json({ message: 'Cập nhật nội dung section thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi cập nhật features.', error: err.message });
  }
});

module.exports = router;
