const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');

router.get('/', packageController.getPackages);
router.get('/featured', packageController.getFeaturedPackages);
router.get('/:identifier', packageController.getPackageDetails);

module.exports = router;
