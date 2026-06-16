const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = authenticateToken.authorizeRoles;

router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.post('/', authenticateToken, authorizeRoles('admin', 'seller'), productController.createProduct);
router.put('/:id', authenticateToken, authorizeRoles('admin', 'seller'), productController.updateProduct);
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'seller'), productController.deleteProduct);

module.exports = router;
