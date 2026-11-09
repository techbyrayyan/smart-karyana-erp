const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, expenseController.getExpenses);
router.post('/', authMiddleware, expenseController.createExpense);
router.delete('/:id', authMiddleware, expenseController.deleteExpense);

module.exports = router;
