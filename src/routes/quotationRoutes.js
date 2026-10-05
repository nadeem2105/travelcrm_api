const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');

router.get('/', quotationController.getQuotations);
router.get('/:token', quotationController.getQuotationByToken);
router.post('/:token/action', quotationController.updateQuotationStatus);

module.exports = router;
