const express = require('express');
const router = express.Router();
const loadController = require('../controllers/loadController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);

// @route   GET /loads
// @desc    Get all loads
// @access  Private
router.get('/', loadController.getLoads);

// @route   GET /loads/create
// @desc    Get load create form
// @access  Private
router.get('/create', loadController.getCreateLoadForm);

// @route   POST /loads
// @desc    Create a new load
// @access  Private
router.post('/', loadController.createLoad);

// @route   GET /loads/:id
// @desc    Get load details
// @access  Private
router.get('/:id', loadController.getLoadDetails);

// @route   GET /loads/:id/edit
// @desc    Get load edit form
// @access  Private
router.get('/:id/edit', loadController.getEditLoadForm);

// @route   PUT /loads/:id
// @desc    Update a load
// @access  Private
router.put('/:id', loadController.updateLoad);

// @route   DELETE /loads/:id
// @desc    Delete a load
// @access  Admin
router.delete('/:id', ensureAdmin, loadController.deleteLoad);

// @route   PUT /loads/:id/status
// @desc    Update load status
// @access  Private
router.put('/:id/status', loadController.updateLoadStatus);

// @route   GET /loads/:id/packing-list
// @desc    Get packing list page
// @access  Private
router.get('/:id/packing-list', loadController.getPackingListPage);

// @route   PUT /loads/:id/packing-list
// @desc    Save packing list
// @access  Private
router.put('/:id/packing-list', loadController.savePackingList);

module.exports = router;