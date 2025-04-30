const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

// Apply authentication and admin middleware to all routes
router.use(ensureAuthenticated);
router.use(ensureAdmin);

// @route   GET /settings
// @desc    Get settings page
// @access  Admin
router.get('/', settingsController.getSettings);

// @route   POST /settings
// @desc    Update settings
// @access  Admin
router.post('/', settingsController.updateSettings);

module.exports = router;