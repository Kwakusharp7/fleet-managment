const express           = require('express');
const router            = express.Router();
const loaderController  = require('../controllers/loaderController');
const { ensureAuthenticated, ensureLoader } = require('../middleware/auth');
const Load = require('../models/Load'); // Add this import

// Apply authentication and loader‐role middleware to all routes
router.use(ensureAuthenticated);
router.use(ensureLoader);

// @route   GET /loader
// @desc    Loader dashboard/job selection page
router.get('/', loaderController.getLoaderDashboard);

// @route   GET /loader/project-selection
// @desc    Project selection page
router.get('/project-selection', loaderController.getProjectSelection);

// @route   POST /loader/project-selection
// @desc    Process project selection
router.post('/project-selection', loaderController.processProjectSelection);

// @route   GET /loader/recent-projects
// @desc    Get recent projects for selection page
router.get('/recent-projects', loaderController.getRecentProjects);

// Inventory routes
// @route   GET /loader/inventory/:projectId
// @desc    Inventory management for a project
router.get('/inventory/:projectId', loaderController.getInventoryPage);

// @route   POST /loader/inventory/:projectId/skid
// @desc    Add skid to inventory
router.post('/inventory/:projectId/skid', loaderController.addInventorySkid);

// @route   PUT /loader/inventory/:projectId/skid/:skidId
// @desc    Update inventory skid
router.put('/inventory/:projectId/skid/:skidId', loaderController.updateInventorySkid);

// @route   DELETE /loader/inventory/:projectId/skid/:skidId
// @desc    Delete inventory skid
router.delete('/inventory/:projectId/skid/:skidId', loaderController.deleteInventorySkid);

// @route   DELETE /loader/inventory/:projectId/clear
// @desc    Clear all inventory skids for a project
router.delete('/inventory/:projectId/clear', loaderController.clearInventorySkids);

// **TRUCK LOADING WIZARD**

// Step 2: Truck Information Entry form
// @route   GET /loader/truck/:projectId/info
// @desc    Truck Information Entry page
router.get(
  '/truck/:projectId/info',
  loaderController.showTruckInfo
);

// Step 1 landing (redirects into skid‐details via controller logic)
// @route   GET /loader/truck/:projectId
// @desc    Truck information redirect → Skid Details
router.get(
  '/truck/:projectId',
  loaderController.getTruckInfoPage
);

// @route   POST /loader/truck/:projectId
// @desc    Save truck information and proceed to Skid Details
router.post('/truck/:projectId', loaderController.saveTruckInfo);

// @route   GET /loader/truck/:projectId/skids
// @desc    Skid details page for truck
router.get('/truck/:projectId/skids', loaderController.getSkidDetailsPage);

// @route   POST /loader/truck/:projectId/skid
// @desc    Add skid to truck load
router.post('/truck/:projectId/skid', loaderController.addTruckSkid);

// @route   PUT /loader/truck/:projectId/skid/:skidId
// @desc    Update truck skid
router.put('/truck/:projectId/skid/:skidId', loaderController.updateTruckSkid);

// @route   DELETE /loader/truck/:projectId/skid/:skidId
// @desc    Delete truck skid (direct DELETE requests)
router.delete('/truck/:projectId/skid/:skidId', ensureAuthenticated, ensureLoader, loaderController.deleteTruckSkid);

// @route   POST /loader/truck/:projectId/skid/:skidId
// @desc    Handle DELETE requests from forms with _method=DELETE
router.post('/truck/:projectId/skid/:skidId', ensureAuthenticated, ensureLoader, (req, res, next) => {
  if (req.body._method === 'DELETE') {
    console.log('Handling DELETE for:', req.url);
    return loaderController.deleteTruckSkid(req, res, next);
  }
  // If it's not a DELETE request, continue to the next route
  next();
});

// @route   POST /loader/truck/:projectId/skids/delete-skid
// @desc    Alternative delete route that uses a simple POST (no method override)
router.post('/truck/:projectId/skids/delete-skid', ensureAuthenticated, ensureLoader, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { skidId, loadId } = req.body;

    console.log(`Deleting skid ${skidId} from load ${loadId} in project ${projectId}`);

    if (!loadId) {
      req.flash('error_msg', 'Load ID is required');
      return res.redirect(`/loader/truck/${projectId}`);
    }

    // Find the load
    const load = await Load.findById(loadId);

    if (!load) {
      console.error(`Load ${loadId} not found`);
      req.flash('error_msg', 'Load not found');
      return res.redirect(`/loader/truck/${projectId}`);
    }

    if (load.projectCode !== projectId) {
      console.error(`Load ${loadId} does not belong to project ${projectId}`);
      req.flash('error_msg', 'Invalid load selected for this project');
      return res.redirect(`/loader/truck/${projectId}`);
    }

    // Find the skid to be removed
    const skidToRemove = load.skids.find(skid => skid.id === skidId);

    if (!skidToRemove) {
      console.error(`Skid ${skidId} not found in load ${loadId}`);
      req.flash('error_msg', 'Skid not found in truck load');
      return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
    }

    // Remove the skid
    load.skids = load.skids.filter(skid => skid.id !== skidId);

    // Update skid count and total weight
    load.skidCount = load.skids.length;
    load.totalWeight = load.skids.reduce((sum, skid) => sum + (parseFloat(skid.weight) || 0), 0);

    // Save the updated load
    await load.save();

    req.flash('success_msg', 'Truck skid removed');
    res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
  } catch (err) {
    console.error('Error removing truck skid:', err);
    req.flash('error_msg', 'Error removing truck skid');
    res.redirect(`/loader/truck/${req.params.projectId}/skids?loadId=${req.body.loadId || ''}`);
  }
});

// @route   DELETE /loader/truck/:projectId/skids/clear
// @desc    Clear all truck skids
router.delete('/truck/:projectId/skids/clear', loaderController.clearTruckSkids);

// @route   POST /loader/truck/:projectId/skids/add-from-inventory
// @desc    Add skids from inventory to truck
router.post(
  '/truck/:projectId/skids/add-from-inventory',
  loaderController.addSkidsFromInventory
);

// @route   GET /loader/truck/:projectId/packing-list
// @desc    Packing list page
router.get('/truck/:projectId/packing-list', loaderController.getPackingListPage);

// @route   POST /loader/truck/:projectId/packing-list
// @desc    Save packing list
router.post('/truck/:projectId/packing-list', loaderController.savePackingList);

// @route   GET /loader/truck/:projectId/print
// @desc    Print truck load information
router.get('/truck/:projectId/print', loaderController.printTruckLoad);

// @route   GET /loader/stats
// @desc    Get loader dashboard stats
router.get('/stats', loaderController.getLoaderStats);

module.exports = router;