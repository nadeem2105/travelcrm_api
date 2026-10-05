const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

router.get('/', settingsController.getPublicSettings);
router.get('/banners', settingsController.getBanners);
router.get('/testimonials', settingsController.getTestimonials);
router.get('/faqs', settingsController.getFaqs);

module.exports = router;
