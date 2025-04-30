const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { ensureAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);

// @route   GET /reports
// @desc    Get reports page
// @access  Private
router.get('/', (req, res) => {
    try {
        reportController.getReportsPage(req, res);
    } catch (err) {
        console.error('Error in reports route:', err);
        res.status(500).render('error', {
            statusCode: 500,
            title: 'Error',
            message: 'An error occurred while loading the reports page'
        });
    }
});

// @route   POST /reports/generate
// @desc    Generate report
// @access  Private
router.post('/generate', (req, res) => {
    try {
        reportController.generateReport(req, res);
    } catch (err) {
        console.error('Error generating report:', err);
        res.status(500).render('error', {
            statusCode: 500,
            title: 'Error',
            message: 'An error occurred while generating the report'
        });
    }
});

module.exports = router;