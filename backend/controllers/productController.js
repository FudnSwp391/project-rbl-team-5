const { db, sql } = require('../db');

const formatProduct = async (prod) => {
  // Fetch primary image from product_images table if it exists
  const imgResult = await db.findOne('product_images', { product_id: prod.id });
  
  // Find category name
  const cat = await db.findOne('product_categories', { id: prod.category_id });
  const categoryName = cat ? cat.category_name : 'Gia dụng';

  return {
    id: prod.id,
    name: prod.title || prod.name || '',
    price: Number(prod.listed_price || prod.price || 0),
    image: imgResult ? imgResult.image_url : (prod.image || '/images/products/default.jpg'),
    status: (prod.status === 'active') ? 'available' : 'sold',
    category: categoryName,
    condition: prod.ai_condition || prod.condition || 'good',
    description: prod.user_description || prod.description || ''
  };
};

// GET /api/products
exports.getProducts = async (req, res) => {
  try {
    const { search, category, condition, priceRange, sortBy } = req.query;
    
    let query = `
      SELECT p.*, pi.image_url, c.category_name 
      FROM products p
      LEFT JOIN (
        SELECT product_id, image_url, ROW_NUMBER() OVER(PARTITION BY product_id ORDER BY is_primary DESC, id ASC) as rn
        FROM product_images
      ) pi ON p.id = pi.product_id AND pi.rn = 1
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE p.status = 'active'
    `;
    const params = [];
    
    // 1. Search Filter
    if (search) {
      query += ` AND (p.title LIKE @search OR p.user_description LIKE @search OR c.category_name LIKE @search)`;
      params.push({ name: 'search', value: `%${search}%` });
    }
    
    // 2. Category Filter
    if (category && category !== 'All') {
      if (!isNaN(category)) {
        query += ` AND p.category_id = @category`;
        params.push({ name: 'category', value: parseInt(category) });
      } else {
        query += ` AND c.category_name = @category`;
        params.push({ name: 'category', value: category });
      }
    }
    
    // 3. Condition Filter
    if (condition) {
      const conds = condition.split(',').map(c => c.trim().toLowerCase());
      if (conds.length > 0) {
        const condClauses = [];
        conds.forEach(c => {
          if (c === 'excellent') {
            condClauses.push(`LOWER(p.ai_condition) LIKE '%excellent%' OR LOWER(p.ai_condition) LIKE '%99%' OR LOWER(p.ai_condition) LIKE '%mới%'`);
          } else if (c === 'good') {
            condClauses.push(`LOWER(p.ai_condition) LIKE '%good%' OR LOWER(p.ai_condition) LIKE '%90%' OR LOWER(p.ai_condition) LIKE '%rất tốt%'`);
          } else if (c === 'fair') {
            condClauses.push(`LOWER(p.ai_condition) LIKE '%fair%' OR LOWER(p.ai_condition) LIKE '%80%' OR LOWER(p.ai_condition) LIKE '%khá tốt%'`);
          }
        });
        if (condClauses.length > 0) {
          query += ` AND (${condClauses.join(' OR ')})`;
        }
      }
    }
    
    // 4. Price Range Filter
    if (priceRange && priceRange !== 'All') {
      if (priceRange === 'under-5') {
        query += ` AND p.listed_price < 5000000`;
      } else if (priceRange === '5-10') {
        query += ` AND p.listed_price >= 5000000 AND p.listed_price <= 10000000`;
      } else if (priceRange === 'over-10') {
        query += ` AND p.listed_price > 10000000`;
      }
    }
    
    // 5. Sorting
    if (sortBy === 'price-asc') {
      query += ` ORDER BY p.listed_price ASC`;
    } else if (sortBy === 'price-desc') {
      query += ` ORDER BY p.listed_price DESC`;
    } else if (sortBy === 'newest') {
      query += ` ORDER BY p.created_at DESC`;
    } else {
      query += ` ORDER BY p.id DESC`;
    }
    
    const result = await db.query(query, params);
    
    const formatted = result.recordset.map(prod => ({
      id: prod.id,
      name: prod.title || prod.name || '',
      price: Number(prod.listed_price || prod.price || 0),
      image: prod.image_url || '/images/products/default.jpg',
      status: 'available',
      category: prod.category_name || 'Gia dụng',
      condition: prod.ai_condition || prod.condition || 'good',
      description: prod.user_description || prod.description || ''
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error('Lỗi lấy danh sách sản phẩm:', err);
    res.status(500).json({ message: 'Lỗi lấy danh sách sản phẩm.', error: err.message });
  }
};

// GET /api/products/:id
exports.getProductById = async (req, res) => {
  try {
    const product = await db.findOne('products', { id: req.params.id });
    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    const formatted = await formatProduct(product);
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lấy chi tiết sản phẩm.', error: err.message });
  }
};

// POST /api/products
exports.createProduct = async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'admin' && req.user.role !== 'seller') {
    return res.status(403).json({ message: 'Không có quyền thực hiện hành động này.' });
  }
  
  const { name, product_name, description, user_description, price, listed_price, category, category_id, condition, image, image_url } = req.body;
  
  try {
    const finalTitle = name || product_name || 'Thiết bị mới';
    const finalDesc = description || user_description || '';
    const finalPrice = Number(price || listed_price || 0);
    
    const categoryMap = {
      'WashingMachine': 1,
      'Refrigerator':   2,
      'AirConditioner': 3,
      'Audio':          4,
      'Laptop':         5,
      'Smartwatch':     6,
      'Smartphone':     7,
      'Tablet':         8,
      'GamingConsole':  9,
      'Camera':         10,
      'TV':             11,
      'Monitor':        12,
      'PC':             13,
      'Printer':        14,
      'Router':         15,
      'Accessory':      16,
    };
    const finalCatId = categoryMap[category] || Number(category_id) || 1;
    
    let sellerProfile = await db.findOne('seller_profiles', { user_id: req.user.id });
    if (!sellerProfile) {
      sellerProfile = await db.insert('seller_profiles', {
        user_id: req.user.id,
        shop_name: 'TechCycle Shop',
        balance: 0,
        total_products_sold: 0
      });
    }
    
    const newProd = await db.insert('products', {
      seller_id: sellerProfile.id,
      category_id: finalCatId,
      title: finalTitle,
      user_description: finalDesc,
      listed_price: finalPrice,
      stock: 1,
      status: 'active',
      ai_condition: condition || 'excellent',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    const finalImage = image || image_url || '/images/products/default.jpg';
    await db.insert('product_images', {
      product_id: newProd.id,
      image_url: finalImage,
      is_primary: 1,
      created_at: new Date().toISOString()
    });
    
    res.status(201).json({ message: 'Thêm sản phẩm thành công.', product: newProd });
  } catch (err) {
    console.error('Lỗi thêm sản phẩm:', err);
    res.status(500).json({ message: 'Lỗi thêm sản phẩm.', error: err.message });
  }
};

// PUT /api/products/:id
exports.updateProduct = async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'admin' && req.user.role !== 'seller') {
    return res.status(403).json({ message: 'Không có quyền thực hiện.' });
  }
  
  try {
    const { name, description, price, category, condition, image, status } = req.body;
    const updates = {};
    
    if (name !== undefined) updates.title = name;
    if (description !== undefined) updates.user_description = description;
    if (price !== undefined) updates.listed_price = Number(price);
    if (condition !== undefined) updates.ai_condition = condition;
    
    if (status !== undefined) {
      updates.status = (status === 'available') ? 'active' : 'sold_out';
    }
    
    if (category !== undefined) {
      const categoryMap = {
        'WashingMachine': 1,
        'Refrigerator':   2,
        'AirConditioner': 3,
        'Audio':          4,
        'Laptop':         5,
        'Smartwatch':     6,
        'Smartphone':     7,
        'Tablet':         8,
        'GamingConsole':  9,
        'Camera':         10,
        'TV':             11,
        'Monitor':        12,
        'PC':             13,
        'Printer':        14,
        'Router':         15,
        'Accessory':      16,
      };
      if (categoryMap[category]) {
        updates.category_id = categoryMap[category];
      }
    }
    
    updates.updated_at = new Date().toISOString();
    
    await db.update('products', 'id', req.params.id, updates);
    
    if (image !== undefined) {
      const img = await db.findOne('product_images', { product_id: req.params.id });
      if (img) {
        await db.update('product_images', 'id', img.id, { image_url: image });
      } else {
        await db.insert('product_images', {
          product_id: req.params.id,
          image_url: image,
          is_primary: 1,
          created_at: new Date().toISOString()
        });
      }
    }
    
    res.json({ message: 'Cập nhật sản phẩm thành công.' });
  } catch (err) {
    console.error('Lỗi cập nhật sản phẩm:', err);
    res.status(500).json({ message: 'Lỗi cập nhật sản phẩm.', error: err.message });
  }
};

// DELETE /api/products/:id
exports.deleteProduct = async (req, res) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'admin' && req.user.role !== 'seller') {
    return res.status(403).json({ message: 'Không có quyền thực hiện.' });
  }
  
  try {
    await db.query('DELETE FROM products WHERE id = @id', [{ name: 'id', value: req.params.id }]);
    res.json({ message: 'Xóa sản phẩm thành công.' });
  } catch (err) {
    console.error('Lỗi xóa sản phẩm:', err);
    res.status(500).json({ message: 'Lỗi xóa sản phẩm.', error: err.message });
  }
};
