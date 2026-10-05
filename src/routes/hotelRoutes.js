const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');

router.get('/', hotelController.getHotels);
router.get('/featured', hotelController.getFeaturedHotels);
router.get('/:identifier', hotelController.getHotelDetails);

module.exports = router;
