const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const packageRoutes = require('./packageRoutes');
const hotelRoutes = require('./hotelRoutes');
const flightRoutes = require('./flightRoutes');
const cabRoutes = require('./cabRoutes');
const destinationRoutes = require('./destinationRoutes');
const bookingRoutes = require('./bookingRoutes');
const leadRoutes = require('./leadRoutes');
const quotationRoutes = require('./quotationRoutes');
const settingsRoutes = require('./settingsRoutes');

// API Routes
router.use('/auth', authRoutes);
router.use('/packages', packageRoutes);
router.use('/hotels', hotelRoutes);
router.use('/flights', flightRoutes);
router.use('/cabs', cabRoutes);
router.use('/destinations', destinationRoutes);
router.use('/bookings', bookingRoutes);
router.use('/leads', leadRoutes);
router.use('/quotations', quotationRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
