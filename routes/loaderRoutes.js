// Updated loaderRoutes.js - Fix for Reset Truck Skids List functionality

console.log('--- loaderRoutes.js file loaded by Node ---');
const express = require('express');
const router = express.Router();
const loaderController = require('../controllers/loaderController');
const { ensureAuthenticated, ensureLoader } = require('../middleware/auth');
const Load = require('../models/Load');
const mongoose = require('mongoose');

// Apply authentication and loader-role middleware to all routes
console.log('--- Applying ensureAuthenticated middleware globally to loader routes ---');
router.use(ensureAuthenticated);
console.log('--- Applying ensureLoader middleware globally to loader routes ---');
router.use(ensureLoader);

// @route   GET /loader
// @desc    Loader dashboard/job selection page
console.log('--- Defining GET / route ---');
router.get('/', loaderController.getLoaderDashboard);

// @route   GET /loader/project-selection
// @desc    Project selection page
console.log('--- Defining GET /project-selection route ---');
router.get('/project-selection', loaderController.getProjectSelection);

// @route   POST /loader/project-selection
// @desc    Process project selection
console.log('--- Defining POST /project-selection route ---');
router.post('/project-selection', loaderController.processProjectSelection);

// @route   GET /loader/recent-projects
// @desc    Get recent projects for selection page
console.log('--- Defining GET /recent-projects route ---');
router.get('/recent-projects', loaderController.getRecentProjects);

// --- Inventory routes ---
console.log('--- Defining Inventory Routes ---');
router.get('/inventory/:projectId', loaderController.getInventoryPage);
router.post('/inventory/:projectId/skid', loaderController.addInventorySkid);
router.put('/inventory/:projectId/skid/:skidId', loaderController.updateInventorySkid);
router.delete('/inventory/:projectId/skid/:skidId', loaderController.deleteInventorySkid);
router.delete('/inventory/:projectId/clear', loaderController.clearInventorySkids);

// --- TRUCK LOADING WIZARD ---
console.log('--- Defining Truck Loading Routes ---');
router.get('/truck/:projectId/info', loaderController.showTruckInfo);
router.get('/truck/:projectId', loaderController.getTruckInfoPage);
router.post('/truck/:projectId', loaderController.saveTruckInfo);
// OPTIONAL: Replace your existing getSkidDetailsPage with the multi-project version
router.get('/truck/:projectId/skids', loaderController.getSkidDetailsPageMultiProject);
router.post('/truck/:projectId/skid', loaderController.addTruckSkid);
router.put('/truck/:projectId/skid/:skidId', loaderController.updateTruckSkid);

// --- DELETE Truck Skid Routes ---
console.log('--- Defining DELETE /truck/:projectId/skid/:skidId route ---');
router.delete('/truck/:projectId/skid/:skidId', loaderController.deleteTruckSkid);

console.log('--- Defining POST /truck/:projectId/skid/:skidId for method override ---');
router.post('/truck/:projectId/skid/:skidId', (req, res, next) => {
    if (req.body._method === 'DELETE') {
        console.log('--- Handling DELETE via POST override for:', req.originalUrl);
        if (loaderController && typeof loaderController.deleteTruckSkid === 'function') {
            return loaderController.deleteTruckSkid(req, res, next);
        } else {
             console.error('!!! ERROR: loaderController.deleteTruckSkid is not a function in POST override !!!');
             return next(new Error('Controller function missing for skid deletion'));
        }
    }
    console.log('--- POST /truck/:projectId/skid/:skidId request without _method=DELETE, calling next() ---');
    next();
});

console.log('--- Defining POST /truck/:projectId/skids/delete-skid route ---');
router.post('/truck/:projectId/skids/delete-skid', async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { skidId, loadId } = req.body;
        console.log(`Deleting skid ${skidId} from load ${loadId} in project ${projectId} via POST /delete-skid`);

        if (!loadId || !mongoose.Types.ObjectId.isValid(loadId)) {
           req.flash('error_msg', 'Load ID is required');
           return res.redirect(`/loader/truck/${projectId}`);
        }
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
        const skidToRemove = load.skids.find(skid => skid.id === skidId);
        if (!skidToRemove) {
           console.error(`Skid ${skidId} not found in load ${loadId}`);
           req.flash('error_msg', 'Skid not found in truck load');
           return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
        }
        load.skids = load.skids.filter(skid => skid.id !== skidId);
        load.skidCount = load.skids.length;
        load.totalWeight = load.skids.reduce((sum, skid) => sum + (parseFloat(skid.weight) || 0), 0);
        load.updatedAt = new Date();
        load.updatedBy = req.user._id;
        await load.save();
        req.flash('success_msg', 'Truck skid removed');
        res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
    } catch (err) {
        console.error('Error removing truck skid via POST /delete-skid:', err);
        req.flash('error_msg', 'Error removing truck skid');
        next(err);
    }
});


// --- Clear Truck Skids Routes ---

// DELETE request (for forms with method-override)
console.log('--- Defining DELETE /truck/:projectId/skids/clear route ---');
router.delete('/truck/:projectId/skids/clear', loaderController.clearTruckSkids);

// IMPORTANT: ADD POST ROUTE FOR FORM METHOD OVERRIDE
console.log('--- Defining POST /truck/:projectId/skids/clear for method override ---');
router.post('/truck/:projectId/skids/clear', (req, res, next) => {
    // Handle method override
    if (req.body._method === 'DELETE') {
        console.log('--- Handling DELETE via POST override for skids/clear:', req.originalUrl);
        if (loaderController && typeof loaderController.clearTruckSkids === 'function') {
            return loaderController.clearTruckSkids(req, res, next);
        } else {
            console.error('!!! ERROR: loaderController.clearTruckSkids is not a function in POST override !!!');
            return next(new Error('Controller function missing for clearing skids'));
        }
    }
    
    // If no method override, it's an error because we don't expect regular POST to this endpoint
    console.error('--- Unexpected POST to /truck/:projectId/skids/clear without _method=DELETE ---');
    res.status(405).send('Method Not Allowed');
});

// --- Other Truck Routes ---
console.log('--- Defining Other Truck Routes ---');
router.post('/truck/:projectId/skids/add-from-inventory', loaderController.addSkidsFromInventory);
router.get('/truck/:projectId/packing-list', loaderController.getPackingListPage);
router.post('/truck/:projectId/packing-list', loaderController.savePackingList);
router.get('/truck/:projectId/print', loaderController.printTruckLoad);
router.get('/stats', loaderController.getLoaderStats);

// API route for getting available projects
router.get('/api/available-projects', loaderController.getAvailableProjects);

// Route for adding another project to the load
router.post('/truck/:projectId/add-project', loaderController.addProjectToLoad);

console.log('--- Finished Defining Loader Routes ---');
module.exports = router;