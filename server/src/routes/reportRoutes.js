const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

router.get('/dashboard', authMiddleware, reportController.getDashboardStats);
router.get('/financial', authMiddleware, reportController.getReports);

module.exports = router;
