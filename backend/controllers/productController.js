const { db, sql } = require('../db');

exports.getProducts = async (req, res) => {
  try {
    const products = await db.find('Products');
    // Map snake_case to camelCase if needed, or just return as is
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lấy danh sách sản phẩm.', error: err.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await db.findOne('Products', { product_id: req.params.id });
    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi lấy chi tiết sản phẩm.', error: err.message });
  }
};

exports.createProduct = async (req, res) => {
  if (req.user.role !== 'Admin') { // Note: role is now 'Admin' in script
    return res.status(403).json({ message: 'Không có quyền thực hiện hành động này.' });
  }
  
  const { product_name, description, price, old_price, image_url, category_id, brand_id, condition, stock_quantity, warranty_period, technical_specs } = req.body;
  
  try {
    const query = `
      INSERT INTO Products (product_name, description, price, old_price, image_url, category_id, brand_id, condition, stock_quantity, warranty_period, technical_specs, seller_id, status)
      VALUES (@name, @desc, @price, @oldPrice, @image, @catId, @brandId, @cond, @stock, @warranty, @specs, @sellerId, 'Available')
    `;
    
    const params = [
      { name: 'name', type: sql.NVarChar, value: product_name },
      { name: 'desc', type: sql.NVarChar, value: description },
      { name: 'price', type: sql.Decimal, value: price },
      { name: 'oldPrice', type: sql.Decimal, value: old_price || price * 1.2 },
      { name: 'image', type: sql.VarChar, value: image_url || '/images/products/default.jpg' },
      { name: 'catId', type: sql.Int, value: category_id },
      { name: 'brandId', type: sql.Int, value: brand_id },
      { name: 'cond', type: sql.VarChar, value: condition },
      { name: 'stock', type: sql.Int, value: stock_quantity || 1 },
      { name: 'warranty', type: sql.Int, value: warranty_period || 12 },
      { name: 'specs', type: sql.NVarChar, value: technical_specs || '{}' },
      { name: 'sellerId', type: sql.Int, value: req.user.id }
    ];
    
    await db.query(query, params);
    res.status(201).json({ message: 'Thêm sản phẩm thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi thêm sản phẩm.', error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Không có quyền thực hiện.' });
  }
  
  // Simplified update logic for demonstration
  try {
    const keys = Object.keys(req.body);
    const setClause = keys.map((key, i) => `${key} = @param${i}`).join(', ');
    const params = keys.map((key, i) => ({
      name: `param${i}`,
      value: req.body[key]
    }));
    params.push({ name: 'id', value: req.params.id });

    await db.query(`UPDATE Products SET ${setClause} WHERE product_id = @id`, params);
    res.json({ message: 'Cập nhật sản phẩm thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi cập nhật sản phẩm.', error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Không có quyền thực hiện.' });
  }
  
  try {
    await db.query('DELETE FROM Products WHERE product_id = @id', [{ name: 'id', value: req.params.id }]);
    res.json({ message: 'Xóa sản phẩm thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi xóa sản phẩm.', error: err.message });
  }
};
