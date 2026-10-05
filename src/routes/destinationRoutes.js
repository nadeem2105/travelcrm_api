const express = require('express');
const router = express.Router();
const destinationController = require('../controllers/destinationController');

router.get('/', destinationController.getDestinations);
router.get('/:identifier', destinationController.getDestinationDetails);

module.exports = router;
