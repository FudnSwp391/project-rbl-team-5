const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/technicians', authenticateToken, userController.getTechnicians);
router.get('/technicians/busy', authenticateToken, userController.getBusyTimes);
router.post('/technicians/busy', authenticateToken, userController.addBusyTime);
router.delete('/technicians/busy/:id', authenticateToken, userController.deleteBusyTime);
router.get('/list', authenticateToken, userController.getUsersList);
router.put('/:id/role', authenticateToken, userController.updateUserRole);
router.delete('/:id', authenticateToken, userController.deleteUser);
router.get('/stats', authenticateToken, userController.getStats);


module.exports = router;
