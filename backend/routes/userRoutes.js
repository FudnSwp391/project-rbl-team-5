const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/technicians', authenticateToken, userController.getTechnicians);
router.get('/list', authenticateToken, userController.getUsersList);
router.delete('/:id', authenticateToken, userController.deleteUser);
router.get('/stats', authenticateToken, userController.getStats);

module.exports = router;
