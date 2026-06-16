const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateToken = require('../middleware/authMiddleware');
const authorizeRoles = authenticateToken.authorizeRoles;

router.get('/technicians', authenticateToken, userController.getTechnicians);
router.get('/list', authenticateToken, authorizeRoles('admin', 'seller'), userController.getUsersList);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), userController.deleteUser);
router.get('/stats', authenticateToken, authorizeRoles('admin', 'seller'), userController.getStats);
router.put('/:id/status', authenticateToken, authorizeRoles('admin'), userController.updateUserStatus);

module.exports = router;
