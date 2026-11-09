const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, purchaseController.getPurchases);
router.get('/:id', authMiddleware, purchaseController.getPurchaseById);
router.post('/manual', authMiddleware, purchaseController.createManualPurchase);

module.exports = router;
