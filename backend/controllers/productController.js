const db = require('../db');

exports.getProducts = (req, res) => {
  const products = db.find('products');
  res.json(products);
};

exports.getProductById = (req, res) => {
  const product = db.findOne('products', { id: req.params.id });
  if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  res.json(product);
};

exports.createProduct = (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Không có quyền thực hiện hành động này.' });
  }
  const { name, description, price, image, category, condition } = req.body;
  const newProduct = db.insert('products', {
    name,
    description,
    price: Number(price),
    image: image || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600',
    category,
    condition,
    sellerId: req.user.id,
    status: 'available'
  });
  res.status(201).json(newProduct);
};

exports.updateProduct = (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Không có quyền thực hiện.' });
  }
  const updated = db.update('products', req.params.id, req.body);
  if (!updated) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
  res.json(updated);
};

exports.deleteProduct = (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Không có quyền thực hiện.' });
  }
  db.delete('products', req.params.id);
  res.json({ message: 'Xóa sản phẩm thành công.' });
};
