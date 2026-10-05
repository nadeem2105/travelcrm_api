const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { verifyToken } = require('../middleware/auth');
const { submissionLimiter } = require('../middleware/rateLimiter');

router.post('/', submissionLimiter, leadController.createLead); // Public lead/enquiry submission
router.get('/', leadController.getLeads); // CRM leads list
router.get('/:id', leadController.getLeadDetails); // CRM lead details
router.patch('/:id/status', leadController.updateLeadStatus); // Update status

module.exports = router;
