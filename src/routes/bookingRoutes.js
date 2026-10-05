const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken, optionalAuth } = require('../middleware/auth');
const { submissionLimiter } = require('../middleware/rateLimiter');

router.post('/', submissionLimiter, optionalAuth, bookingController.createBooking);
router.get('/my-bookings', verifyToken, bookingController.getMyBookings);
router.get('/:identifier', optionalAuth, bookingController.getBookingDetails);
router.post('/:id/cancel', optionalAuth, bookingController.cancelBooking);

module.exports = router;
