const express = require('express');
const router = express.Router();
const loaderController = require('../controllers/loaderController');
const { ensureAuthenticated, ensureLoader } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);
router.use(ensureLoader);

// @route   GET /loader
// @desc    Get loader interface
// @access  Loader
router.get('/', loaderController.getLoaderInterface);

// @route   POST /loader/truck-info
// @desc    Save truck info and create new load
// @access  Loader
router.post('/truck-info', loaderController.saveTruckInfo);

// @route   POST /loader/save-skids
// @desc    Save skids for a load
// @access  Loader
router.post('/save-skids', loaderController.saveSkids);

// @route   POST /loader/save-packing-list
// @desc    Save packing list
// @access  Loader
router.post('/save-packing-list', loaderController.savePackingList);

// @route   GET /loader/inventory/:projectCode
// @desc    Get inventory skids for a project
// @access  Loader
router.get('/inventory/:projectCode', loaderController.getInventorySkids);

// @route   GET /loader/load/:id
// @desc    Get load details for editing
// @access  Loader
router.get('/load/:id', loaderController.getLoadDetails);

module.exports = router;