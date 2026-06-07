const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/', authenticateToken, bookingController.getBookings);
router.post('/', authenticateToken, bookingController.createBooking);
router.put('/:id', authenticateToken, bookingController.updateBooking);

module.exports = router;
