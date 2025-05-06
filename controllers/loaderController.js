const mongoose = require('mongoose');
const Project = require('../models/Project');
const Load = require('../models/Load');
const { check, validationResult } = require('express-validator');

// @desc    Get loader dashboard/job selection page
// @route   GET /loader
exports.getLoaderDashboard = async (req, res) => {
    try {
        res.render('loader/index', {
            title: 'Loader Dashboard',
            layout: 'layouts/loader'
        });
    } catch (err) {
        console.error('Error loading loader dashboard:', err);
        req.flash('error_msg', 'Error loading dashboard');
        return res.redirect('/dashboard');
    }
};

// @desc    Get project selection page
// @route   GET /loader/project-selection
exports.getProjectSelection = async (req, res) => {
    try {
        // Get active projects
        const projects = await Project.find({ status: 'Active' }).sort({ code: 1 });

        res.render('loader/project-selection', {
            title: 'Select Project',
            layout: 'layouts/loader',
            projects,
            taskType: req.query.task || 'inventory'
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading projects');
        res.redirect('/loader');
    }
};

// @desc    Process project selection
// @route   POST /loader/project-selection
exports.processProjectSelection = async (req, res) => {
    try {
        const { projectId, taskType } = req.body;

        if (!projectId) {
            req.flash('error_msg', 'Please select a project');
            return res.redirect('/loader/project-selection?task=' + taskType);
        }

        // Validate project exists
        const project = await Project.findOne({ code: projectId, status: 'Active' });

        if (!project) {
            req.flash('error_msg', 'Selected project not found or inactive');
            return res.redirect('/loader/project-selection?task=' + taskType);
        }

        // Redirect based on selected task
        if (taskType === 'inventory') {
            return res.redirect(`/loader/inventory/${projectId}`);
        } else if (taskType === 'truckEntry') {
            return res.redirect(`/loader/truck/${projectId}`);
        } else {
            req.flash('error_msg', 'Invalid task type');
            return res.redirect('/loader');
        }
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error processing project selection');
        res.redirect('/loader/project-selection');
    }
};

// Helper function to modify load data for inventory use
function prepareInventoryLoad(load, projectId) {
    // Set the inventory flag
    load.isInventory = true;

    // If this is a new load, set default inventory values
    if (!load._id) {
        load.truckId = `INVENTORY-${projectId}`;
        load.status = 'Planned';

        // Set dummy values for truck info to pass validation
        load.truckInfo = {
            length: 100,
            width: 100,
            weight: 100000
        };
    }

    return load;
}

// @desc    Get inventory management page for a project
// @route   GET /loader/inventory/:projectId
exports.getInventoryPage = async (req, res) => {
    try {
        const { projectId } = req.params;
        console.log(`Loading inventory page for project ${projectId}`);

        // Validate project exists
        const project = await Project.findOne({ code: projectId, status: 'Active' });

        if (!project) {
            console.log(`Project ${projectId} not found or inactive`);
            req.flash('error_msg', 'Project not found or inactive');
            return res.redirect('/loader/project-selection?task=inventory');
        }

        // Find the inventory load for this project
        const inventoryLoad = await Load.findOne({
            projectCode: projectId,
            isInventory: true
        });

        console.log(`Inventory load for project ${projectId}: ${inventoryLoad ? 'Found' : 'Not found'}`);

        // Initialize inventory skids array
        let inventorySkids = [];
        let nextSkidNumber = 1;

        // If we found an inventory load, extract its skids
        if (inventoryLoad && inventoryLoad.skids && inventoryLoad.skids.length > 0) {
            console.log(`Found ${inventoryLoad.skids.length} inventory skids`);
            inventorySkids = inventoryLoad.skids;
            nextSkidNumber = inventoryLoad.skids.length + 1;
        } else {
            console.log(`No inventory skids found for project ${projectId}`);
        }

        console.log(`Rendering inventory page with ${inventorySkids.length} skids`);
        res.render('loader/inventory', {
            title: 'Inventory Management',
            layout: 'layouts/loader',
            project,
            inventorySkids,
            nextSkidNumber
        });
    } catch (err) {
        console.error('Error loading inventory:', err);
        req.flash('error_msg', 'Error loading inventory');
        res.redirect('/loader/project-selection?task=inventory');
    }
};

// Helper function to generate skid ID
const generateSkidId = (projectId, skidNumber) => {
    return `INV-${projectId}-${skidNumber}`;
};

// @desc    Add skid to inventory
// @route   POST /loader/inventory/:projectId/skid
exports.addInventorySkid = async (req, res) => {
    try {
        const { projectId } = req.params;
        console.log(`Adding inventory skid for project ${projectId}`);
        console.log("Request body:", req.body);

        const { width, length, weight, description, editMode, skidId } = req.body;
        const methodOverride = req.body._method || 'POST';

        // Validate input
        const errors = [];
        if (!width || width <= 0) errors.push({ msg: 'Width must be greater than 0' });
        if (!length || length <= 0) errors.push({ msg: 'Length must be greater than 0' });
        if (!weight || weight <= 0) errors.push({ msg: 'Weight must be greater than 0' });

        if (errors.length > 0) {
            console.log(`Validation errors: ${errors.map(e => e.msg).join(', ')}`);
            req.flash('error_msg', errors.map(err => err.msg).join(', '));
            return res.redirect(`/loader/inventory/${projectId}`);
        }

        // Validate project exists
        const project = await Project.findOne({ code: projectId, status: 'Active' });

        if (!project) {
            console.log(`Project ${projectId} not found or inactive`);
            req.flash('error_msg', 'Project not found or inactive');
            return res.redirect('/loader/project-selection?task=inventory');
        }

        // Find inventory load or create a new one if it doesn't exist
        let inventoryLoad = await Load.findOne({
            projectCode: projectId,
            isInventory: true
        });

        console.log(`Existing inventory load: ${inventoryLoad ? 'Found' : 'Not found'}`);

        // Count existing inventory skids to determine next ID
        let skidCount = 0;
        if (inventoryLoad) {
            skidCount = inventoryLoad.skids.length || 0;
            console.log(`Found existing inventory load with ${skidCount} skids`);
        } else {
            // Create new inventory load if it doesn't exist
            console.log('Creating new inventory load');
            inventoryLoad = new Load({
                truckId: `INVENTORY-${projectId}`,
                projectCode: projectId,
                dateEntered: new Date(),
                status: 'Planned',
                isInventory: true,
                truckInfo: {
                    length: 100,  // Set a dummy large value for inventory
                    width: 100,   // Set a dummy large value for inventory
                    weight: 100000 // Set a dummy large value for inventory
                },
                skids: [],
                createdBy: req.user._id
            });

            // Try to save the empty inventory load first to ensure it's created
            try {
                await inventoryLoad.save();
                console.log(`Created new empty inventory load for project ${projectId}`);
            } catch (saveErr) {
                console.error('Error creating inventory load:', saveErr);
                req.flash('error_msg', 'Error creating inventory container: ' + saveErr.message);
                return res.redirect(`/loader/inventory/${projectId}`);
            }
        }

        // Handle method override for PUT
        if (editMode === 'true' && methodOverride === 'PUT') {
            // Update existing skid
            console.log(`Updating existing skid ${skidId}`);
            const skidIndex = inventoryLoad.skids.findIndex(s => s.id === skidId);

            if (skidIndex === -1) {
                console.log(`Skid ${skidId} not found for editing`);
                req.flash('error_msg', 'Skid not found in inventory');
                return res.redirect(`/loader/inventory/${projectId}`);
            }

            inventoryLoad.skids[skidIndex].width = parseFloat(width);
            inventoryLoad.skids[skidIndex].length = parseFloat(length);
            inventoryLoad.skids[skidIndex].weight = parseFloat(weight);
            inventoryLoad.skids[skidIndex].description = description || '';

            req.flash('success_msg', 'Inventory skid updated successfully');
        } else {
            // Create new skid
            const newSkidId = generateSkidId(projectId, skidCount + 1);
            console.log(`Creating new skid ${newSkidId}`);

            const newSkid = {
                id: newSkidId,
                width: parseFloat(width),
                length: parseFloat(length),
                weight: parseFloat(weight),
                description: description || '',
                isInventory: true
            };

            console.log('New skid data:', newSkid);

            // Add to load's skids
            inventoryLoad.skids.push(newSkid);
            req.flash('success_msg', 'Skid added to inventory');
        }

        // Update skid count and total weight - this is how LoadController.js does it
        inventoryLoad.skidCount = inventoryLoad.skids.length;
        inventoryLoad.totalWeight = inventoryLoad.skids.reduce((sum, skid) => sum + (parseFloat(skid.weight) || 0), 0);

        console.log(`Saving inventory load with ${inventoryLoad.skids.length} skids and total weight ${inventoryLoad.totalWeight}`);

        // Save the load
        try {
            await inventoryLoad.save();
            console.log('Inventory load saved successfully');
        } catch (saveErr) {
            console.error('Error saving inventory load:', saveErr);
            console.error('Skids data:', JSON.stringify(inventoryLoad.skids));
            req.flash('error_msg', 'Error saving inventory: ' + saveErr.message);
            return res.redirect(`/loader/inventory/${projectId}`);
        }

        res.redirect(`/loader/inventory/${projectId}`);
    } catch (err) {
        console.error('Error processing inventory skid:', err);
        req.flash('error_msg', 'Error processing inventory skid: ' + err.message);
        res.redirect(`/loader/inventory/${req.params.projectId}`);
    }
};

// @desc    Update inventory skid
// @route   PUT /loader/inventory/:projectId/skid/:skidId
exports.updateInventorySkid = async (req, res) => {
    try {
        const { projectId, skidId } = req.params;
        const { width, length, weight, description } = req.body;

        // Validate input
        const errors = [];
        if (!width || width <= 0) errors.push({ msg: 'Width must be greater than 0' });
        if (!length || length <= 0) errors.push({ msg: 'Length must be greater than 0' });
        if (!weight || weight <= 0) errors.push({ msg: 'Weight must be greater than 0' });

        if (errors.length > 0) {
            req.flash('error_msg', errors.map(err => err.msg).join(', '));
            return res.redirect(`/loader/inventory/${projectId}`);
        }

        // Find the inventory load with the skid
        const inventoryLoad = await Load.findOne({
            projectCode: projectId,
            isInventory: true,
            'skids.id': skidId
        });

        if (!inventoryLoad) {
            req.flash('error_msg', 'Skid not found in inventory');
            return res.redirect(`/loader/inventory/${projectId}`);
        }

        // Update the skid
        const skidIndex = inventoryLoad.skids.findIndex(skid => skid.id === skidId);
        if (skidIndex === -1) {
            req.flash('error_msg', 'Skid not found in inventory');
            return res.redirect(`/loader/inventory/${projectId}`);
        }

        inventoryLoad.skids[skidIndex].width = parseFloat(width);
        inventoryLoad.skids[skidIndex].length = parseFloat(length);
        inventoryLoad.skids[skidIndex].weight = parseFloat(weight);
        inventoryLoad.skids[skidIndex].description = description || '';

        // Update total weight
        inventoryLoad.totalWeight = inventoryLoad.skids.reduce((sum, skid) => sum + (parseFloat(skid.weight) || 0), 0);

        // Save the updated load
        await inventoryLoad.save();

        req.flash('success_msg', 'Inventory skid updated');
        res.redirect(`/loader/inventory/${projectId}`);
    } catch (err) {
        console.error('Error updating inventory skid:', err);
        req.flash('error_msg', 'Error updating inventory skid');
        res.redirect(`/loader/inventory/${req.params.projectId}`);
    }
};

// @desc    Delete inventory skid
// @route   DELETE /loader/inventory/:projectId/skid/:skidId
exports.deleteInventorySkid = async (req, res) => {
    try {
        const { projectId, skidId } = req.params;

        // Find the inventory load with the skid
        const inventoryLoad = await Load.findOne({
            projectCode: projectId,
            isInventory: true,
            'skids.id': skidId
        });

        if (!inventoryLoad) {
            req.flash('error_msg', 'Skid not found in inventory');
            return res.redirect(`/loader/inventory/${projectId}`);
        }

        // Remove the skid
        inventoryLoad.skids = inventoryLoad.skids.filter(skid => skid.id !== skidId);

        // Update skid count and total weight
        inventoryLoad.skidCount = inventoryLoad.skids.length;
        inventoryLoad.totalWeight = inventoryLoad.skids.reduce((sum, skid) => sum + (parseFloat(skid.weight) || 0), 0);

        // Save the updated load
        await inventoryLoad.save();

        req.flash('success_msg', 'Inventory skid deleted');
        res.redirect(`/loader/inventory/${projectId}`);
    } catch (err) {
        console.error('Error deleting inventory skid:', err);
        req.flash('error_msg', 'Error deleting inventory skid');
        res.redirect(`/loader/inventory/${req.params.projectId}`);
    }
};

// @desc    Clear all inventory skids for a project
// @route   DELETE /loader/inventory/:projectId/clear
exports.clearInventorySkids = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Find the inventory load for the project
        const inventoryLoad = await Load.findOne({
            projectCode: projectId,
            isInventory: true
        });

        if (inventoryLoad) {
            // Clear all inventory skids
            inventoryLoad.skids = [];
            inventoryLoad.skidCount = 0;
            inventoryLoad.totalWeight = 0;

            // Save the updated load
            await inventoryLoad.save();
        }

        req.flash('success_msg', 'All inventory skids cleared');
        res.redirect(`/loader/inventory/${projectId}`);
    } catch (err) {
        console.error('Error clearing inventory skids:', err);
        req.flash('error_msg', 'Error clearing inventory skids');
        res.redirect(`/loader/inventory/${req.params.projectId}`);
    }
};

// @desc    Get truck information entry page
// @route   GET /loader/truck/:projectId
exports.getTruckInfoPage = async (req, res) => {
    try {
        const { projectId } = req.params;

        // Validate project exists
        const project = await Project.findOne({ code: projectId, status: 'Active' });

        if (!project) {
            req.flash('error_msg', 'Project not found or inactive');
            return res.redirect('/loader/project-selection?task=truckEntry');
        }

        // Check if there's an existing truck load in progress
        const existingLoad = await Load.findOne({
            projectCode: projectId,
            status: 'Planned',
            isInventory: { $ne: true } // Not an inventory load
        }).sort({ dateEntered: -1 });

        res.render('loader/truck-info', {
            title: 'Truck Information',
            layout: 'layouts/loader',
            project,
            existingLoad
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading truck information page');
        res.redirect('/loader/project-selection?task=truckEntry');
    }
};

// @desc    Save truck information and proceed to skid details
// @route   POST /loader/truck/:projectId
exports.saveTruckInfo = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { truckId, length, width, weight, loadId } = req.body;

        // Validate input
        const errors = [];
        if (!truckId) errors.push({ msg: 'Truck ID is required' });
        if (!length || length <= 0) errors.push({ msg: 'Length must be greater than 0' });
        if (!width || width <= 0) errors.push({ msg: 'Width must be greater than 0' });
        if (!weight || weight < 1000) errors.push({ msg: 'Weight must be at least 1000 lbs' });

        if (errors.length > 0) {
            req.flash('error_msg', errors.map(err => err.msg).join(', '));
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Validate project exists
        const project = await Project.findOne({ code: projectId, status: 'Active' });

        if (!project) {
            req.flash('error_msg', 'Project not found or inactive');
            return res.redirect('/loader/project-selection?task=truckEntry');
        }

        let load;

        // If loadId is provided, update existing load
        if (loadId) {
            load = await Load.findById(loadId);

            if (!load || load.status !== 'Planned' || load.projectCode !== projectId) {
                req.flash('error_msg', 'Invalid load selected');
                return res.redirect(`/loader/truck/${projectId}`);
            }

            // Update truck info
            load.truckId = truckId;
            load.truckInfo = {
                length: parseFloat(length),
                width: parseFloat(width),
                weight: parseFloat(weight)
            };
            load.updatedBy = req.user._id;
            load.updatedAt = new Date();
        } else {
            // Create new load
            load = new Load({
                truckId,
                projectCode: projectId,
                dateEntered: new Date(),
                status: 'Planned',
                truckInfo: {
                    length: parseFloat(length),
                    width: parseFloat(width),
                    weight: parseFloat(weight)
                },
                skids: [],
                skidCount: 0,
                totalWeight: 0,
                createdBy: req.user._id
            });
        }

        // Save the load
        await load.save();

        // Redirect to skid details page
        res.redirect(`/loader/truck/${projectId}/skids?loadId=${load._id}`);
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error saving truck information');
        res.redirect(`/loader/truck/${req.params.projectId}`);
    }
};

// @desc    Get skid details page for truck
// @route   GET /loader/truck/:projectId/skids
exports.getSkidDetailsPage = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { loadId } = req.query;

        if (!loadId) {
            req.flash('error_msg', 'Load ID is required');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Validate project exists
        const project = await Project.findOne({ code: projectId, status: 'Active' });

        if (!project) {
            req.flash('error_msg', 'Project not found or inactive');
            return res.redirect('/loader/project-selection?task=truckEntry');
        }

        // Find the load
        const load = await Load.findById(loadId);

        if (!load || load.projectCode !== projectId) {
            req.flash('error_msg', 'Invalid load selected');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Get inventory skids for this project - CRITICAL SECTION
        // Find the inventory load for this project
        console.log(`Looking for inventory with projectCode: ${projectId}`);
        const inventoryLoad = await Load.findOne({
            projectCode: projectId,
            isInventory: true
        });

        // Debug
        console.log(`Inventory load found: ${inventoryLoad ? 'Yes' : 'No'}`);
        if (inventoryLoad) {
            console.log(`Inventory skids count: ${inventoryLoad.skids ? inventoryLoad.skids.length : 0}`);
        }

        let inventorySkids = [];
        if (inventoryLoad && inventoryLoad.skids && inventoryLoad.skids.length > 0) {
            // Mark skids that are already on the truck
            inventorySkids = inventoryLoad.skids.map(skid => ({
                ...skid.toObject ? skid.toObject() : skid,
                alreadyOnTruck: load.skids.some(truckSkid => 
                    truckSkid.originalInvId === skid.id
                )
            }));
        }

        // Debug
        console.log(`Processed inventory skids: ${inventorySkids.length}`);

        // Calculate space utilization & check if overweight
        const spaceUtilization = calculateSpaceUtilization(load);
        const isOverweight = isLoadOverweight(load);

        res.render('loader/skid-details', {
            title: 'Skid Details',
            layout: 'layouts/loader',
            project,
            load,
            inventorySkids,
            spaceUtilization,
            isOverweight
        });
    } catch (err) {
        console.error('Error loading skid details page:', err);
        req.flash('error_msg', 'Error loading skid details page');
        res.redirect(`/loader/truck/${req.params.projectId}`);
    }
};

// @desc    Add skid to truck load
// @route   POST /loader/truck/:projectId/skid
exports.addTruckSkid = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { loadId, width, length, weight, description } = req.body;

        if (!loadId) {
            req.flash('error_msg', 'Load ID is required');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Validate input
        const errors = [];
        if (!width || width <= 0) errors.push({ msg: 'Width must be greater than 0' });
        if (!length || length <= 0) errors.push({ msg: 'Length must be greater than 0' });
        if (!weight || weight <= 0) errors.push({ msg: 'Weight must be greater than 0' });

        if (errors.length > 0) {
            req.flash('error_msg', errors.map(err => err.msg).join(', '));
            return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
        }

        // Create new skid
        // Ensure the load is fetched before adding a skid
        const load = await Load.findById(loadId);

        if (!load || load.status !== 'Planned' || load.projectCode !== projectId) {
            req.flash('error_msg', 'Invalid load selected');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        const newSkid = {
            id: `SKID-${load.skids.length + 1}`,
            width: parseFloat(width),
            length: parseFloat(length),
            weight: parseFloat(weight),
            description: description || ''
        };

        // Add to load's skids
        load.skids.push(newSkid);

        // Update skid count and total weight
        load.skidCount = load.skids.length;
        load.totalWeight = load.skids.reduce((sum, skid) => sum + (parseFloat(skid.weight) || 0), 0);

        // Save the load
        await load.save();

        req.flash('success_msg', 'Skid added to truck load');
        res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
    } catch (err) {
        console.error('Error adding skid to truck load:', err);
        req.flash('error_msg', 'Error adding skid to truck load');
        res.redirect(`/loader/truck/${req.params.projectId}/skids?loadId=${req.body.loadId}`);
    }
};

// @desc    Clear all truck skids
// @route   DELETE /loader/truck/:projectId/skids/clear
exports.clearTruckSkids = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { loadId } = req.body;

        if (!loadId) {
            req.flash('error_msg', 'Load ID is required');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Find the load
        const load = await Load.findById(loadId);

        if (!load || load.status !== 'Planned' || load.projectCode !== projectId) {
            req.flash('error_msg', 'Invalid load selected');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Clear all skids
        load.skids = [];
        load.skidCount = 0;
        load.totalWeight = 0;

        // Save the updated load
        await load.save();

        req.flash('success_msg', 'All truck skids cleared');
        res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error clearing truck skids');
        res.redirect(`/loader/truck/${req.params.projectId}/skids?loadId=${req.body.loadId}`);
    }
};

// @desc    Add skids from inventory to truck
// @route   POST /loader/truck/:projectId/skids/add-from-inventory
exports.addSkidsFromInventory = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { loadId, selectedSkids } = req.body;

        if (!loadId) {
            req.flash('error_msg', 'Load ID is required');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Convert selectedSkids to array if it's a string (single selection)
        const skidIds = Array.isArray(selectedSkids) ? selectedSkids : [selectedSkids];

        if (!skidIds.length) {
            req.flash('error_msg', 'No skids selected');
            return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
        }

        // Find the load
        const load = await Load.findById(loadId);

        if (!load || load.status !== 'Planned' || load.projectCode !== projectId) {
            req.flash('error_msg', 'Invalid load selected');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Find the inventory load
        const inventoryLoad = await Load.findOne({
            projectCode: projectId,
            status: 'Planned',
            isInventory: true
        });

        if (!inventoryLoad) {
            req.flash('error_msg', 'No inventory found for this project');
            return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
        }

        // Add selected inventory skids to truck load
        let addedCount = 0;

        for (const skidId of skidIds) {
            // Check if skid is already on the truck
            const alreadyOnTruck = load.skids.some(truckSkid => truckSkid.originalInvId === skidId);

            if (alreadyOnTruck) {
                continue; // Skip if already added
            }

            // Find the inventory skid
            const inventorySkid = inventoryLoad.skids.find(skid => skid.id === skidId);

            if (!inventorySkid) {
                continue; // Skip if not found
            }

            // Create new truck skid based on inventory skid
            const newSkid = {
                id: `SKID-${load.skids.length + 1}`,
                width: inventorySkid.width,
                length: inventorySkid.length,
                weight: inventorySkid.weight,
                description: inventorySkid.description || '',
                originalInvId: inventorySkid.id // Track where this came from
            };

            // Add to load's skids
            load.skids.push(newSkid);
            addedCount++;
        }

        // Update skid count and total weight
        load.skidCount = load.skids.length;
        load.totalWeight = load.skids.reduce((sum, skid) => sum + (parseFloat(skid.weight) || 0), 0);

        // Save the load
        await load.save();

        if (addedCount > 0) {
            req.flash('success_msg', `Added ${addedCount} skid(s) from inventory to truck load`);
        } else {
            req.flash('info_msg', 'No new skids added. Selected skids may already be on the truck.');
        }

        res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error adding skids from inventory');
        res.redirect(`/loader/truck/${req.params.projectId}/skids?loadId=${req.body.loadId}`);
    }
};

// @desc    Update truck skid
// @desc    Get packing list page
// @route   GET /loader/truck/:projectId/packing-list
exports.getPackingListPage = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { loadId } = req.query;

        if (!loadId) {
            req.flash('error_msg', 'Load ID is required');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Validate project exists
        const project = await Project.findOne({ code: projectId, status: 'Active' });

        if (!project) {
            req.flash('error_msg', 'Project not found or inactive');
            return res.redirect('/loader/project-selection?task=truckEntry');
        }

        // Find the load
        const load = await Load.findById(loadId);

        if (!load || load.projectCode !== projectId) {
            req.flash('error_msg', 'Invalid load selected');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Format current date for default values
        const formattedDate = new Date().toISOString().split('T')[0];

        res.render('loader/packing-list', {
            title: 'Packing List',
            layout: 'layouts/loader',
            project,
            load,
            formattedDate
        });
    } catch (err) {
        console.error('Error loading packing list page:', err);
        req.flash('error_msg', 'Error loading packing list');
        res.redirect(`/loader/truck/${req.params.projectId}/skids?loadId=${req.query.loadId}`);
    }
};

// @desc    Save packing list
// @route   POST /loader/truck/:projectId/packing-list
exports.savePackingList = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { loadId, signature, ...packingListData } = req.body;

        if (!loadId) {
            req.flash('error_msg', 'Load ID is required');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Find the load
        const load = await Load.findById(loadId);

        if (!load || load.projectCode !== projectId) {
            req.flash('error_msg', 'Invalid load selected');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Update packing list data
        load.packingList = {
            ...load.packingList,
            ...packingListData
        };

        // If signature is provided, update signature and mark as delivered or loaded depending on receivedBy
        if (signature && signature !== 'data:,') {
            load.packingList.signature = signature;

            // If receivedBy is filled out, mark as Delivered, otherwise as Loaded
            if (packingListData.receivedBy) {
                load.status = 'Delivered';
            } else {
                load.status = 'Loaded';
            }
        }

        // Update timestamp
        load.updatedAt = new Date();
        load.updatedBy = req.user._id;

        // Save the load
        await load.save();

        // Determine redirect based on status
        const redirectUrl = load.status === 'Delivered'
            ? `/loader`
            : `/loader/truck/${projectId}/packing-list?loadId=${loadId}`;

        let statusMsg = 'Packing list saved successfully';
        if (load.status === 'Loaded') {
            statusMsg = 'Packing list saved and load marked as Loaded';
        } else if (load.status === 'Delivered') {
            statusMsg = 'Packing list saved and load marked as Delivered';
        }

        req.flash('success_msg', statusMsg);
        res.redirect(redirectUrl);
    } catch (err) {
        console.error('Error saving packing list:', err);
        req.flash('error_msg', 'Error saving packing list');
        res.redirect(`/loader/truck/${req.params.projectId}/packing-list?loadId=${req.body.loadId}`);
    }
};

// @desc    Print truck load information
// @route   GET /loader/truck/:projectId/print
exports.printTruckLoad = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { loadId } = req.query;

        if (!loadId) {
            req.flash('error_msg', 'Load ID is required');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Find the load
        const load = await Load.findById(loadId).populate('createdBy', 'username');

        if (!load || load.projectCode !== projectId) {
            req.flash('error_msg', 'Invalid load selected');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Find the project
        const project = await Project.findOne({ code: projectId });

        res.render('loader/print', {
            title: `Print - ${load.truckId}`,
            layout: 'layouts/print', // Use a print-specific layout with minimal styling
            project,
            load,
            spaceUtilization: calculateSpaceUtilization(load),
            isOverweight: isLoadOverweight(load),
            formattedDate: load.dateEntered ? new Date(load.dateEntered).toLocaleDateString() : ''
        });
    } catch (err) {
        console.error('Error generating print view:', err);
        req.flash('error_msg', 'Error generating print view');
        res.redirect(`/loader/truck/${req.params.projectId}/skids?loadId=${req.query.loadId}`);
    }
};

// @desc    Update truck skid
// @route   PUT /loader/truck/:projectId/skid/:skidId
exports.updateTruckSkid = async (req, res) => {
    try {
        const { projectId, skidId } = req.params;
        const { loadId, width, length, weight, description } = req.body;

        if (!loadId) {
            req.flash('error_msg', 'Load ID is required');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Validate input
        const errors = [];
        if (!width || width <= 0) errors.push({ msg: 'Width must be greater than 0' });
        if (!length || length <= 0) errors.push({ msg: 'Length must be greater than 0' });
        if (!weight || weight <= 0) errors.push({ msg: 'Weight must be greater than 0' });

        if (errors.length > 0) {
            req.flash('error_msg', errors.map(err => err.msg).join(', '));
            return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
        }

        // Find the load
        const load = await Load.findById(loadId);

        if (!load || load.status !== 'Planned' || load.projectCode !== projectId) {
            req.flash('error_msg', 'Invalid load selected');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Update the skid
        const skidIndex = load.skids.findIndex(skid => skid.id === skidId);
        if (skidIndex === -1) {
            req.flash('error_msg', 'Skid not found in truck load');
            return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
        }

        // Keep originalInvId if it exists
        const originalInvId = load.skids[skidIndex].originalInvId;

        load.skids[skidIndex].width = parseFloat(width);
        load.skids[skidIndex].length = parseFloat(length);
        load.skids[skidIndex].weight = parseFloat(weight);
        load.skids[skidIndex].description = description || '';

        // Restore originalInvId if it was present
        if (originalInvId) {
            load.skids[skidIndex].originalInvId = originalInvId;
        }

        // Update total weight
        load.totalWeight = load.skids.reduce((sum, skid) => sum + (parseFloat(skid.weight) || 0), 0);

        // Save the updated load
        await load.save();

        req.flash('success_msg', 'Truck skid updated');
        res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
    } catch (err) {
        console.error('Error updating truck skid:', err);
        req.flash('error_msg', 'Error updating truck skid');
        res.redirect(`/loader/truck/${req.params.projectId}/skids?loadId=${req.body.loadId}`);
    }
};

// @desc    Delete truck skid
// @route   DELETE /loader/truck/:projectId/skid/:skidId
exports.deleteTruckSkid = async (req, res) => {
    try {
        const { projectId, skidId } = req.params;
        const { loadId } = req.body;

        if (!loadId) {
            req.flash('error_msg', 'Load ID is required');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Find the load
        const load = await Load.findById(loadId);

        if (!load || load.status !== 'Planned' || load.projectCode !== projectId) {
            req.flash('error_msg', 'Invalid load selected');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Find the skid to be removed
        const skidToRemove = load.skids.find(skid => skid.id === skidId);

        if (!skidToRemove) {
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
        res.redirect(`/loader/truck/${req.params.projectId}/skids?loadId=${req.body.loadId}`);
    }
};

// @desc    Get recent projects
// @route   GET /loader/recent-projects

// @desc    Get recent projects
// @route   GET /loader/recent-projects
exports.getRecentProjects = async (req, res) => {
    try {
      // Get projects with recent activity
      const recentLoads = await Load.find({ 
        isInventory: { $ne: true } 
      })
      .sort({ updatedAt: -1, dateEntered: -1 })
      .limit(10)
      .select('projectCode dateEntered updatedAt')
      .lean();
  
      // Extract unique project codes
      const projectCodes = [...new Set(recentLoads.map(load => load.projectCode))];
  
      // Get project details
      const projectsData = await Project.find({ 
        code: { $in: projectCodes },
        status: 'Active'
      }).select('code name').lean();
  
      // Create a map for quick lookup
      const projectMap = {};
      projectsData.forEach(project => {
        projectMap[project.code] = project;
      });
  
      // Create recent projects array with activity info
      const recentProjects = projectCodes
        .filter(code => projectMap[code]) // Only include active projects
        .map(code => {
          const project = projectMap[code];
          const latestLoad = recentLoads.find(load => load.projectCode === code);
          const lastActivity = latestLoad?.updatedAt || latestLoad?.dateEntered;
          
          return {
            code: project.code,
            name: project.name,
            lastActivity: lastActivity ? new Date(lastActivity).toLocaleDateString() : 'Unknown'
          };
        });
  
      res.json({ projects: recentProjects });
    } catch (err) {
      console.error('Error fetching recent projects:', err);
      res.status(500).json({ error: 'Failed to fetch recent projects' });
    }
  };
// Helper functions

// Calculate space utilization for a load
function calculateSpaceUtilization(load) {
    if (!load || !load.truckInfo || !load.truckInfo.length || !load.truckInfo.width) {
        return { totalArea: 0, truckArea: 0, percentage: 0, formattedPercentage: '0%' };
    }

    const totalArea = load.skids.reduce((sum, skid) => {
        return sum + ((skid.width || 0) * (skid.length || 0));
    }, 0);

    const truckArea = load.truckInfo.length * load.truckInfo.width;
    const percentage = truckArea > 0 ? (totalArea / truckArea) * 100 : 0;

    return {
        totalArea,
        truckArea,
        percentage,
        formattedPercentage: `${percentage.toFixed(1)}%`
    };
}

// Check if a load is overweight
function isLoadOverweight(load) {
    if (!load || !load.truckInfo || !load.truckInfo.weight) return false;

    const totalWeight = (load.totalWeight || 0);
    return totalWeight > load.truckInfo.weight;
}
// @desc    Get loader dashboard stats
// @route   GET /loader/stats
exports.getLoaderStats = async (req, res) => {
    try {
      // Get today's date range
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      
      // Get start of week
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
  
      // Count planned loads
      const plannedLoads = await Load.countDocuments({
        status: 'Planned',
        isInventory: { $ne: true } // Exclude inventory "loads"
      });
  
      // Count loads loaded today
      const loadedToday = await Load.countDocuments({
        status: 'Loaded',
        updatedAt: {
          $gte: startOfToday,
          $lte: endOfToday
        }
      });
  
      // Count delivered this week
      const deliveredWeek = await Load.countDocuments({
        status: 'Delivered',
        updatedAt: {
          $gte: startOfWeek
        }
      });
  
      // Count all skids added (in both inventory and loaded trucks)
      const loadCounts = await Load.aggregate([
        { 
          $match: { 
            createdAt: { $gte: startOfWeek }
          }
        },
        { 
          $group: { 
            _id: null, 
            totalSkids: { $sum: "$skidCount" } 
          } 
        }
      ]);
  
      const skidsAdded = loadCounts.length > 0 ? loadCounts[0].totalSkids : 0;
  
      // Return stats
      res.json({
        plannedLoads,
        loadedToday,
        deliveredWeek,
        skidsAdded
      });
    } catch (err) {
      console.error('Error fetching loader stats:', err);
      res.status(500).json({ error: 'Failed to fetch loader stats' });
    }
  };