const express = require('express');
const router = express.Router();
const cabController = require('../controllers/cabController');

router.get('/types', cabController.getVehicleTypes);
router.get('/vehicles', cabController.getVehicles);
router.get('/locations', cabController.getCabLocations);

module.exports = router;
