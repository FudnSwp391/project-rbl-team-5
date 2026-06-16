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
    const products = await db.find('products');
    const formatted = await Promise.all(products.map(formatProduct));
    res.json(formatted);
  } catch (err) {
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
      'Refrigerator': 2,
      'AirConditioner': 3,
      'Audio': 4,
      'Laptop': 5,
      'Smartwatch': 6
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
        'Refrigerator': 2,
        'AirConditioner': 3,
        'Audio': 4,
        'Laptop': 5,
        'Smartwatch': 6
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
