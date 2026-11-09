const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, saleController.getSales);
router.get('/:id', authMiddleware, saleController.getSaleById);
router.post('/', authMiddleware, saleController.createSale);
router.put('/:id', authMiddleware, saleController.updateSale);
router.post('/:id/void', authMiddleware, saleController.voidSale);

module.exports = router;
