const express = require('express');
const router = express.Router();
const loaderController = require('../controllers/loaderController');
const { ensureAuthenticated, ensureLoader } = require('../middleware/auth');

// Apply authentication and loader role middleware to all routes
router.use(ensureAuthenticated);
router.use(ensureLoader);

// @route   GET /loader
// @desc    Loader dashboard/job selection page
// @access  Loader/Admin
router.get('/', loaderController.getLoaderDashboard);

// @route   GET /loader/project-selection
// @desc    Project selection page
// @access  Loader/Admin
router.get('/project-selection', loaderController.getProjectSelection);

// @route   POST /loader/project-selection
// @desc    Process project selection
// @access  Loader/Admin
router.post('/project-selection', loaderController.processProjectSelection);

// @route   GET /loader/inventory/:projectId
// @desc    Inventory management for a project
// @access  Loader/Admin
router.get('/inventory/:projectId', loaderController.getInventoryPage);

// @route   POST /loader/inventory/:projectId/skid
// @desc    Add skid to inventory
// @access  Loader/Admin
router.post('/inventory/:projectId/skid', loaderController.addInventorySkid);

// @route   PUT /loader/inventory/:projectId/skid/:skidId
// @desc    Update inventory skid
// @access  Loader/Admin
router.put('/inventory/:projectId/skid/:skidId', loaderController.updateInventorySkid);

// @route   DELETE /loader/inventory/:projectId/skid/:skidId
// @desc    Delete inventory skid
// @access  Loader/Admin
router.delete('/inventory/:projectId/skid/:skidId', loaderController.deleteInventorySkid);

// @route   DELETE /loader/inventory/:projectId/clear
// @desc    Clear all inventory skids for a project
// @access  Loader/Admin
router.delete('/inventory/:projectId/clear', loaderController.clearInventorySkids);

// @route   GET /loader/truck/:projectId
// @desc    Truck information entry page
// @access  Loader/Admin
router.get('/truck/:projectId', loaderController.getTruckInfoPage);

// @route   POST /loader/truck/:projectId
// @desc    Save truck information and proceed to skid details
// @access  Loader/Admin
router.post('/truck/:projectId', loaderController.saveTruckInfo);

// @route   GET /loader/truck/:projectId/skids
// @desc    Skid details page for truck
// @access  Loader/Admin
router.get('/truck/:projectId/skids', loaderController.getSkidDetailsPage);

// @route   POST /loader/truck/:projectId/skid
// @desc    Add skid to truck load
// @access  Loader/Admin
router.post('/truck/:projectId/skid', loaderController.addTruckSkid);

// @route   PUT /loader/truck/:projectId/skid/:skidId
// @desc    Update truck skid
// @access  Loader/Admin
router.put('/truck/:projectId/skid/:skidId', loaderController.updateTruckSkid);

// @route   DELETE /loader/truck/:projectId/skid/:skidId
// @desc    Delete truck skid
// @access  Loader/Admin
router.delete('/truck/:projectId/skid/:skidId', loaderController.deleteTruckSkid);

// @route   DELETE /loader/truck/:projectId/skids/clear
// @desc    Clear all truck skids
// @access  Loader/Admin
router.delete('/truck/:projectId/skids/clear', loaderController.clearTruckSkids);

// @route   POST /loader/truck/:projectId/skids/add-from-inventory
// @desc    Add skids from inventory to truck
// @access  Loader/Admin
router.post('/truck/:projectId/skids/add-from-inventory', loaderController.addSkidsFromInventory);

// @route   GET /loader/truck/:projectId/packing-list
// @desc    Packing list page
// @access  Loader/Admin
router.get('/truck/:projectId/packing-list', loaderController.getPackingListPage);

// @route   POST /loader/truck/:projectId/packing-list
// @desc    Save packing list
// @access  Loader/Admin
router.post('/truck/:projectId/packing-list', loaderController.savePackingList);

// @route   GET /loader/truck/:projectId/print
// @desc    Print truck load information
// @access  Loader/Admin
router.get('/truck/:projectId/print', loaderController.printTruckLoad);

module.exports = router;