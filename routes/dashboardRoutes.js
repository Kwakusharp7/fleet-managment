const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);

// @route   GET /dashboard
// @desc    Get dashboard
// @access  Private
router.get('/', dashboardController.getDashboard);

// @route   GET /dashboard/admin-stats
// @desc    Get admin statistics
// @access  Admin
router.get('/admin-stats', ensureAdmin, dashboardController.getAdminStats);

// @route   GET /dashboard/chart-data
// @desc    Get chart data
// @access  Private
router.get('/chart-data', dashboardController.getChartData);

module.exports = router;