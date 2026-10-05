const express = require('express');
const router = express.Router();
const flightController = require('../controllers/flightController');

router.get('/airports', flightController.getAirports);
router.get('/airlines', flightController.getAirlines);

module.exports = router;
