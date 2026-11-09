const express = require('express');
const router = express.Router();
const aiInvoiceController = require('../controllers/aiInvoiceController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// Handle multiple images (up to 5 pages per invoice)
router.post('/scan', authMiddleware, upload.array('invoiceImages', 5), aiInvoiceController.scanInvoice);
router.post('/confirm', authMiddleware, aiInvoiceController.confirmPurchase);

module.exports = router;
