const mongoose = require('mongoose');
const Project = require('../models/Project');
const Load = require('../models/Load');
const { check, validationResult } = require('express-validator');

// Weight calculator utility function
const calculateSkidWeight = (width, length, height = 0.5, density = 40) => {
    if (!width || !length || width <= 0 || length <= 0) {
        throw new Error('Width and length must be positive numbers');
    }
    const volume = width * length * height;
    const weight = volume * density;
    return Math.round(weight * 100) / 100;
};

// @desc    Get loader dashboard/job selection page
// @route   GET /loader
exports.getLoaderDashboard = async (req, res) => {
    try {
        console.log('--- Rendering Loader Dashboard ---');
        res.render('loader/index', {
            title: 'Loader Dashboard',
            layout: 'layouts/loader'
        });
    } catch (err) {
        console.error('Error loading loader dashboard:', err);
        req.flash('error_msg', 'Error loading dashboard');
        return res.redirect('/dashboard'); // Redirecting to main dashboard on error
    }
};

// @desc    Get project selection page
// @route   GET /loader/project-selection
exports.getProjectSelection = async (req, res, next) => {
    try {
        const taskType = req.query.task || 'inventory';
        console.log(`--- Loading Project Selection Page for task: ${taskType} ---`);
        const projects = await Project.find({ status: 'Active' }).sort({ code: 1 }).lean();
        res.render('loader/project-selection', {
            title: 'Select Project',
            layout: 'layouts/loader',
            projects,
            taskType: taskType
        });
    } catch (err) {
        console.error('Error loading project selection:', err);
        req.flash('error_msg', 'Error loading projects');
        res.redirect('/loader'); // Redirect to loader dashboard on error
        // Consider using next(err) for more robust error handling
    }
};

// @desc    Process project selection
// @route   POST /loader/project-selection
exports.processProjectSelection = async (req, res, next) => {
    try {
        const { projectId, taskType } = req.body;
        console.log(`--- Processing Project Selection: Project ${projectId}, Task ${taskType} ---`);

        if (!projectId) {
            req.flash('error_msg', 'Please select a project');
            return res.redirect(`/loader/project-selection?task=${taskType || 'inventory'}`);
        }

        const project = await Project.findOne({ code: projectId, status: 'Active' });
        if (!project) {
            req.flash('error_msg', 'Selected project not found or inactive');
            return res.redirect(`/loader/project-selection?task=${taskType || 'inventory'}`);
        }

        let redirectUrl;
        if (taskType === 'inventory') {
            redirectUrl = `/loader/inventory/${projectId}`;
        } else if (taskType === 'truckEntry') {
            redirectUrl = `/loader/truck/${projectId}`;
        } else {
            req.flash('error_msg', 'Invalid task type specified');
            return res.redirect('/loader');
        }
        console.log(`--- Redirecting to: ${redirectUrl} ---`);
        return res.redirect(redirectUrl);
    } catch (err) {
        console.error('Error processing project selection:', err);
        req.flash('error_msg', 'Error processing project selection');
        res.redirect('/loader/project-selection');
        // Consider using next(err)
    }
};

// @desc    Get recent projects
// @route   GET /loader/recent-projects
exports.getRecentProjects = async (req, res) => {
    try {
        console.log('--- Fetching Recent Projects for API ---');
        const recentLoads = await Load.find({ isInventory: { $ne: true } })
            .sort({ updatedAt: -1, dateEntered: -1 })
            .limit(10)
            .select('projectCode dateEntered updatedAt')
            .lean();

        const projectCodes = [...new Set(recentLoads.map(load => load.projectCode))];
        const projectsData = await Project.find({ code: { $in: projectCodes }, status: 'Active' })
            .select('code name')
            .lean();

        const projectMap = projectsData.reduce((map, project) => {
            map[project.code] = project;
            return map;
        }, {});

        const recentProjects = projectCodes
            .filter(code => projectMap[code])
            .map(code => {
                const project = projectMap[code];
                const latestLoad = recentLoads.find(load => load.projectCode === code);
                const lastActivity = latestLoad?.updatedAt || latestLoad?.dateEntered;
                return {
                    code: project.code,
                    name: project.name,
                    lastActivity: lastActivity ? new Date(lastActivity).toLocaleDateString() : 'N/A'
                };
            });
        res.json({ projects: recentProjects });
    } catch (err) {
        console.error('Error fetching recent projects API:', err);
        res.status(500).json({ error: 'Failed to fetch recent projects' });
    }
};

// @desc    Get inventory management page for a project
// @route   GET /loader/inventory/:projectId
exports.getInventoryPage = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        console.log(`--- Loading Inventory Page for project ${projectId} ---`);
        const project = await Project.findOne({ code: projectId, status: 'Active' }).lean();
        if (!project) {
            req.flash('error_msg', 'Project not found or inactive');
            return res.redirect('/loader/project-selection?task=inventory');
        }

        const inventoryLoad = await Load.findOne({ projectCode: projectId, isInventory: true }).lean();
        const inventorySkids = inventoryLoad?.skids || [];
        const nextSkidNumber = inventorySkids.length + 1;

        console.log(`--- Rendering Inventory page with ${inventorySkids.length} skids ---`);
        res.render('loader/inventory', {
            title: `Inventory - ${project.name}`,
            layout: 'layouts/loader',
            project,
            inventorySkids,
            nextSkidNumber
        });
    } catch (err) {
        console.error('Error loading inventory page:', err);
        req.flash('error_msg', 'Error loading inventory');
        res.redirect('/loader/project-selection?task=inventory');
        // Consider using next(err)
    }
};

// Helper function to generate inventory skid ID
const generateSkidId = (projectId, skidNumber) => {
    // Pad skid number if needed, e.g., INV-PROJ1-001
    const paddedNumber = String(skidNumber).padStart(3, '0');
    return `INV-${projectId}-${paddedNumber}`;
};

// @desc    Add skid to inventory OR Update existing inventory skid (handles PUT via _method)
// @route   POST /loader/inventory/:projectId/skid
exports.addInventorySkid = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { width, length, description, editMode, skidId } = req.body;
        let { weight } = req.body;
        const isUpdate = editMode === 'true' && req.body._method === 'PUT';
        console.log(`--- ${isUpdate ? 'Updating' : 'Adding'} inventory skid for project ${projectId}. Data:`, req.body);

        // Basic validation
        const errors = [];
        if (!width || isNaN(parseFloat(width)) || parseFloat(width) <= 0) errors.push('Width must be a positive number.');
        if (!length || isNaN(parseFloat(length)) || parseFloat(length) <= 0) errors.push('Length must be a positive number.');

        if (errors.length > 0) {
            req.flash('error_msg', errors.join(' '));
            return res.redirect(`/loader/inventory/${projectId}`);
        }

        // Calculate weight if not provided/invalid
        if (!weight || isNaN(parseFloat(weight)) || parseFloat(weight) <= 0) {
            try {
                weight = calculateSkidWeight(parseFloat(width), parseFloat(length));
                console.log(`--- Calculated weight: ${weight} lbs ---`);
            } catch (calcError) {
                req.flash('error_msg', `Error calculating weight: ${calcError.message}`);
                return res.redirect(`/loader/inventory/${projectId}`);
            }
        }

        const project = await Project.findOne({ code: projectId, status: 'Active' });
        if (!project) {
            req.flash('error_msg', 'Project not found or inactive');
            return res.redirect('/loader/project-selection?task=inventory');
        }

        let inventoryLoad = await Load.findOne({ projectCode: projectId, isInventory: true });

        if (!inventoryLoad) {
            console.log('--- Creating new inventory load container ---');
            inventoryLoad = new Load({
                truckId: `INVENTORY-${projectId}`, projectCode: projectId, dateEntered: new Date(),
                status: 'Planned', isInventory: true, truckInfo: { length: 999, width: 999, weight: 999999 },
                skids: [], createdBy: req.user._id
            });
        }

        if (isUpdate) {
            // --- Update existing skid ---
            if (!skidId) {
                req.flash('error_msg', 'Skid ID missing for update.');
                return res.redirect(`/loader/inventory/${projectId}`);
            }
            const skidIndex = inventoryLoad.skids.findIndex(s => s.id === skidId);
            if (skidIndex === -1) {
                req.flash('error_msg', 'Skid not found in inventory for update.');
                return res.redirect(`/loader/inventory/${projectId}`);
            }
            console.log(`--- Updating skid at index ${skidIndex} with ID ${skidId} ---`);
            inventoryLoad.skids[skidIndex].width = parseFloat(width);
            inventoryLoad.skids[skidIndex].length = parseFloat(length);
            inventoryLoad.skids[skidIndex].weight = parseFloat(weight);
            inventoryLoad.skids[skidIndex].description = description || '';
            req.flash('success_msg', 'Inventory skid updated successfully.');
        } else {
            // --- Add new skid ---
            const skidCount = inventoryLoad.skids.length;
            const newSkidId = generateSkidId(projectId, skidCount + 1);
            const newSkid = {
                id: newSkidId, width: parseFloat(width), length: parseFloat(length),
                weight: parseFloat(weight), description: description || '', isInventory: true
            };
            console.log(`--- Adding new skid: ${newSkidId} ---`, newSkid);
            inventoryLoad.skids.push(newSkid);
            req.flash('success_msg', 'Skid added to inventory.');
        }

        // Update totals regardless of add/update
        inventoryLoad.skidCount = inventoryLoad.skids.length;
        inventoryLoad.totalWeight = inventoryLoad.skids.reduce((sum, skid) => sum + (parseFloat(skid.weight) || 0), 0);
        inventoryLoad.updatedAt = new Date();
        inventoryLoad.updatedBy = req.user._id;

        await inventoryLoad.save();
        console.log('--- Inventory load saved successfully ---');
        res.redirect(`/loader/inventory/${projectId}`);
    } catch (err) {
        console.error('Error processing inventory skid:', err);
        req.flash('error_msg', 'Error processing inventory skid: ' + err.message);
        res.redirect(`/loader/inventory/${req.params.projectId || ''}`);
        // Consider using next(err)
    }
};

// @desc    Update inventory skid (Direct PUT Handler - can be removed if POST handler covers it)
// @route   PUT /loader/inventory/:projectId/skid/:skidId
exports.updateInventorySkid = async (req, res, next) => {
     // This can likely be removed if the POST handler with method override works correctly.
     // If kept, ensure it has the same logic as the update part of addInventorySkid.
     console.warn('--- Direct PUT handler for inventory skid update invoked. Consider using POST with _method=PUT. ---');
     // Re-implement logic similar to the update part of addInventorySkid or call it.
     // For now, just redirecting to avoid duplicate logic.
     req.body.editMode = 'true'; // Simulate the form field
     req.body._method = 'PUT';   // Ensure method override is set
     return exports.addInventorySkid(req, res, next); // Delegate to the combined handler
};

// @desc    Delete inventory skid
// @route   DELETE /loader/inventory/:projectId/skid/:skidId
exports.deleteInventorySkid = async (req, res, next) => {
    try {
        const { projectId, skidId } = req.params;
        console.log(`--- Deleting inventory skid ${skidId} for project ${projectId} ---`);

        const inventoryLoad = await Load.findOne({ projectCode: projectId, isInventory: true });
        if (!inventoryLoad) {
            req.flash('error_msg', 'Inventory container not found.');
            return res.redirect(`/loader/inventory/${projectId}`);
        }

        const initialLength = inventoryLoad.skids.length;
        inventoryLoad.skids = inventoryLoad.skids.filter(skid => skid.id !== skidId);

        if (inventoryLoad.skids.length === initialLength) {
            req.flash('error_msg', 'Skid not found in inventory.');
            return res.redirect(`/loader/inventory/${projectId}`);
        }

        inventoryLoad.skidCount = inventoryLoad.skids.length;
        inventoryLoad.totalWeight = inventoryLoad.skids.reduce((sum, skid) => sum + (parseFloat(skid.weight) || 0), 0);
        inventoryLoad.updatedAt = new Date();
        inventoryLoad.updatedBy = req.user._id;

        await inventoryLoad.save();
        console.log('--- Inventory skid deleted and load saved ---');
        req.flash('success_msg', 'Inventory skid deleted successfully.');
        res.redirect(`/loader/inventory/${projectId}`);
    } catch (err) {
        console.error('Error deleting inventory skid:', err);
        req.flash('error_msg', 'Error deleting inventory skid');
        res.redirect(`/loader/inventory/${req.params.projectId || ''}`);
        // Consider using next(err)
    }
};

// @desc    Clear all inventory skids for a project
// @route   DELETE /loader/inventory/:projectId/clear
exports.clearInventorySkids = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        console.log(`--- Clearing ALL inventory skids for project ${projectId} ---`);

        const inventoryLoad = await Load.findOne({ projectCode: projectId, isInventory: true });
        if (inventoryLoad) {
            inventoryLoad.skids = [];
            inventoryLoad.skidCount = 0;
            inventoryLoad.totalWeight = 0;
            inventoryLoad.updatedAt = new Date();
            inventoryLoad.updatedBy = req.user._id;
            await inventoryLoad.save();
            console.log('--- Cleared inventory skids and saved load ---');
            req.flash('success_msg', 'All inventory skids cleared.');
        } else {
            req.flash('info_msg', 'No inventory container found to clear.');
        }
        res.redirect(`/loader/inventory/${projectId}`);
    } catch (err) {
        console.error('Error clearing inventory skids:', err);
        req.flash('error_msg', 'Error clearing inventory skids');
        res.redirect(`/loader/inventory/${req.params.projectId || ''}`);
        // Consider using next(err)
    }
};


// --- Truck Loading Wizard ---

// @desc    Get truck information entry page OR Redirect to skids if load exists
// @route   GET /loader/truck/:projectId
exports.getTruckInfoPage = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        console.log(`--- GET /loader/truck/${projectId} - Checking for existing load or creating new ---`);
        const project = await Project.findOne({ code: projectId, status: 'Active' });
        if (!project) {
            req.flash('error_msg', 'Project not found or inactive');
            return res.redirect('/loader/project-selection?task=truckEntry');
        }

        const existingLoad = await Load.findOne({
            projectCode: projectId, status: 'Planned', isInventory: { $ne: true }
        }).sort({ dateEntered: -1 });

        if (existingLoad) {
            console.log(`--- Found existing planned load ${existingLoad._id}, redirecting to skids page ---`);
            return res.redirect(`/loader/truck/${projectId}/skids?loadId=${existingLoad._id}`);
        } else {
            console.log('--- No existing planned load found, creating a new temporary load ---');
            const newLoad = new Load({
                projectCode: projectId, status: 'Planned', dateEntered: new Date(),
                truckId: `TEMP-${projectId}-${Date.now().toString().slice(-6)}`, // More unique temp ID
                truckInfo: { length: 48, width: 8.5, weight: 45000 }, // Sensible defaults
                createdBy: req.user._id
            });
            await newLoad.save();
            console.log(`--- Created new load ${newLoad._id}, redirecting to skids page ---`);
            return res.redirect(`/loader/truck/${projectId}/skids?loadId=${newLoad._id}`);
        }
    } catch (err) {
        console.error('Error in getTruckInfoPage (truck landing):', err);
        req.flash('error_msg', 'Error preparing truck loading session');
        res.redirect('/loader/project-selection?task=truckEntry');
        // Consider using next(err)
    }
};

// @desc    Show Truck Information Entry form
// @route   GET /loader/truck/:projectId/info
exports.showTruckInfo = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { loadId } = req.query;
        console.log(`--- Loading Truck Info Page for project ${projectId}, load ${loadId} ---`);

        if (!loadId || !mongoose.Types.ObjectId.isValid(loadId)) {
             req.flash('error_msg', 'Valid Load ID is required to view truck info.');
             // Attempt to find the project's load if ID is missing/invalid
             return res.redirect(`/loader/truck/${projectId}`);
        }

        const project = await Project.findOne({ code: projectId }).lean();
        const load = await Load.findById(loadId).lean();

        if (!project || !load) {
            req.flash('error_msg', 'Project or Load not found.');
            return res.redirect(`/loader/truck/${projectId}`); // Go back to the start for the project
        }
        if (load.projectCode !== projectId) {
             req.flash('error_msg', 'Load does not belong to this project.');
             return res.redirect(`/loader/truck/${projectId}`);
        }

        res.render('loader/truck-info', {
            title: `Truck Info - ${project.name}`,
            layout: 'layouts/loader',
            project,
            load,
            // existingLoad: null // Keep if needed by template, otherwise remove
        });
    } catch (err) {
        console.error('Error showing truck information form:', err);
        req.flash('error_msg', 'Error loading truck information form');
        // Redirect intelligently based on available info
        const redirectProject = req.params.projectId || '';
        res.redirect(redirectProject ? `/loader/truck/${redirectProject}` : '/loader');
        // Consider using next(err)
    }
};

// @desc    Save truck information (from truck-info page)
// @route   POST /loader/truck/:projectId
exports.saveTruckInfo = async (req, res, next) => {
    // NOTE: This route path POST /loader/truck/:projectId might conflict
    // if you intend to use it for something else (like starting a load).
    // Consider renaming to POST /loader/truck/:projectId/info if it specifically saves info from that page.
    try {
        const { projectId } = req.params;
        const { truckId, length, width, weight, loadId } = req.body;
        console.log(`--- Saving Truck Info for project ${projectId}, load ${loadId} ---`, req.body);

         if (!loadId || !mongoose.Types.ObjectId.isValid(loadId)) {
             req.flash('error_msg', 'Valid Load ID is required to save truck info.');
             return res.redirect(`/loader/truck/${projectId}`); // Redirect to start
         }

        // Validation
        const errors = [];
        if (!truckId || truckId.trim() === '') errors.push('Truck ID/Number is required.');
        if (!length || isNaN(parseFloat(length)) || parseFloat(length) <= 0) errors.push('Valid truck length (ft) is required.');
        if (!width || isNaN(parseFloat(width)) || parseFloat(width) <= 0) errors.push('Valid truck width (ft) is required.');
        if (!weight || isNaN(parseFloat(weight)) || parseFloat(weight) < 1000) errors.push('Valid truck weight capacity (lbs, min 1000) is required.');

        if (errors.length > 0) {
            req.flash('error_msg', errors.join(' '));
            // Redirect back to the info form WITH the loadId
            return res.redirect(`/loader/truck/${projectId}/info?loadId=${loadId}`);
        }

        const load = await Load.findById(loadId);
        if (!load) {
            req.flash('error_msg', 'Load not found.');
            return res.redirect(`/loader/truck/${projectId}`);
        }
        if (load.projectCode !== projectId) {
            req.flash('error_msg', 'Load does not belong to this project.');
            return res.redirect(`/loader/truck/${projectId}`);
        }
        if (load.status !== 'Planned') {
             req.flash('error_msg', `Cannot update truck info for a load with status: ${load.status}.`);
             return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
        }

        // Update load with new truck info
        load.truckId = truckId.trim();
        load.truckInfo = {
            length: parseFloat(length),
            width: parseFloat(width),
            weight: parseFloat(weight)
        };
        load.updatedAt = new Date();
        load.updatedBy = req.user._id;

        await load.save();
        console.log(`--- Truck info saved for load ${loadId}. Redirecting to Packing List. ---`);
        req.flash('success_msg', 'Truck information updated.');
        // Redirect to Packing List as per original logic
        return res.redirect(`/loader/truck/${projectId}/packing-list?loadId=${load._id}`);

    } catch (err) {
        console.error('Error saving truck information:', err);
        req.flash('error_msg', 'Error saving truck information');
        // Redirect back to info form on error
        const redirectLoadId = req.body.loadId || '';
        const redirectProject = req.params.projectId || '';
        res.redirect(redirectProject && redirectLoadId ? `/loader/truck/${redirectProject}/info?loadId=${redirectLoadId}` : '/loader');
        // Consider using next(err)
    }
};

// @desc    Get skid details page for truck (Fixed version)
// @route   GET /loader/truck/:projectId/skids
exports.getSkidDetailsPage = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { loadId, showProject } = req.query;
        
        console.log(`--- Loading Skid Details Page ---`);
        console.log('Main project:', projectId);
        console.log('Show project:', showProject);
        console.log('Load ID:', loadId);

        if (!loadId || !mongoose.Types.ObjectId.isValid(loadId)) {
            req.flash('error_msg', 'Valid Load ID is required to view skids.');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        const project = await Project.findOne({ code: projectId, status: 'Active' }).lean();
        const load = await Load.findById(loadId);

        if (!project) {
            req.flash('error_msg', 'Project not found or inactive');
            return res.redirect('/loader/project-selection?task=truckEntry');
        }
        if (!load) {
            req.flash('error_msg', 'Load not found.');
            return res.redirect(`/loader/truck/${projectId}`);
        }
        if (load.projectCode !== projectId) {
            req.flash('error_msg', 'Load does not belong to this project.');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // IMPORTANT: Fetch ALL active projects to ensure complete mapping
        const allProjects = await Project.find({ status: 'Active' }).lean();
        
        // Create a comprehensive project mapping
        const projectMap = {};
        allProjects.forEach(proj => {
            projectMap[proj.code] = proj.name;
        });
        
        console.log('Project mapping:', projectMap);

        // CRITICAL: Determine which project's inventory to show
        // Use showProject from URL if available, otherwise use main project
        const displayProjectCode = showProject || projectId;
        console.log('Display project code:', displayProjectCode);
        
        let displayProject = await Project.findOne({ code: displayProjectCode, status: 'Active' }).lean();
        
        // Fallback to main project if display project not found
        if (!displayProject) {
            displayProject = project;
            console.warn(`Display project ${displayProjectCode} not found, using main project`);
        }

        // Get inventory skids for the display project
        const inventoryLoad = await Load.findOne({ 
            projectCode: displayProjectCode, 
            isInventory: true 
        }).lean();
        
        const inventorySkidsRaw = inventoryLoad?.skids || [];
        console.log(`Found ${inventorySkidsRaw.length} inventory skids for project ${displayProjectCode}`);

        // Get skids already on the truck
        const skidsOnTruckIds = new Set(load.skids.map(skid => skid.originalInvId).filter(id => id));

        const inventorySkids = inventorySkidsRaw.map(skid => ({
            ...skid,
            alreadyOnTruck: skidsOnTruckIds.has(skid.id),
            fromProject: displayProjectCode // Track which project this skid is from
        }));

        // Get additional projects if any
        const additionalProjects = [];
        if (load.additionalProjects && load.additionalProjects.length > 0) {
            const additionalProjectDocs = await Project.find({
                code: { $in: load.additionalProjects },
                status: 'Active'
            }).lean();
            additionalProjects.push(...additionalProjectDocs);
        }

        const spaceUtilization = calculateSpaceUtilization(load);
        const isOverweight = isLoadOverweight(load);

        console.log('Rendering view with:');
        console.log('- Main project:', project.code);
        console.log('- Display project:', displayProject.code);
        console.log('- Show project param:', showProject);

        res.render('loader/skid-details', {
            title: `Skid Details - ${project.name} / ${load.truckId}`,
            layout: 'layouts/loader',
            project,
            displayProject,
            load,
            inventorySkids,
            spaceUtilization,
            isOverweight,
            additionalProjects,
            showProject: displayProjectCode, // This is what the form should use
            projectMap,
            currentProjectCode: projectId
        });
    } catch (err) {
        console.error('Error loading skid details page:', err);
        req.flash('error_msg', 'Error loading skid details page');
        res.redirect(`/loader/truck/${req.params.projectId || ''}`);
    }
};
// @desc    Add skid directly to truck load (with source project tracking)
// @route   POST /loader/truck/:projectId/skid
exports.addTruckSkid = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { loadId, width, length, weight, description } = req.body;

        console.log(`Adding skid to truck for project ${projectId}, load ${loadId}`);

        // Validate required fields
        if (!loadId) {
            req.flash('error_msg', 'Load ID is required');
            return res.redirect(`/loader/truck/${projectId}/skids`);
        }

        if (!width || !length || !weight) {
            req.flash('error_msg', 'Width, length, and weight are required');
            return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
        }

        // Find the load
        const load = await Load.findById(loadId);

        if (!load) {
            req.flash('error_msg', 'Load not found');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Verify the load belongs to the correct project
        if (load.projectCode !== projectId) {
            req.flash('error_msg', 'Invalid load for this project');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Create new skid WITH source project
        const newSkid = {
            id: `TRUCK-${load.truckId}-${Date.now()}`, // Generate unique ID
            width: parseFloat(width),
            length: parseFloat(length),
            weight: parseFloat(weight),
            description: description || '',
            sourceProject: projectId,  // Track which project this skid belongs to
            addedAt: new Date(),
            addedBy: req.user._id
        };

        // Add skid to load
        load.skids.push(newSkid);
        load.skidCount = load.skids.length;
        load.totalWeight = load.skids.reduce((sum, skid) => sum + (parseFloat(skid.weight) || 0), 0);
        load.updatedAt = new Date();
        load.updatedBy = req.user._id;

        // Save the load
        await load.save();

        console.log(`Successfully added skid to load ${loadId}`);
        req.flash('success_msg', 'Skid added to truck successfully');

        // Redirect back to the skids page
        res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
    } catch (err) {
        console.error('Error adding truck skid:', err);
        req.flash('error_msg', 'Error adding skid to truck');
        res.redirect(`/loader/truck/${req.params.projectId}/skids?loadId=${req.body.loadId}`);
    }
};
// @desc    Update truck skid (handles PUT via _method from form)
// @route   PUT /loader/truck/:projectId/skid/:skidId
exports.updateTruckSkid = async (req, res, next) => {
    try {
        const { projectId, skidId } = req.params;
        const { loadId, width, length, description } = req.body;
        let { weight } = req.body;
        console.log(`--- Updating truck skid ${skidId} for project ${projectId}, load ${loadId} ---`, req.body);

        if (!loadId || !mongoose.Types.ObjectId.isValid(loadId)) {
            req.flash('error_msg', 'Valid Load ID is required.');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Validation
        const errors = [];
        if (!width || isNaN(parseFloat(width)) || parseFloat(width) <= 0) errors.push('Width must be a positive number.');
        if (!length || isNaN(parseFloat(length)) || parseFloat(length) <= 0) errors.push('Length must be a positive number.');
        // Weight is optional for update if pre-calculated, but if provided, must be valid
        if (weight && (isNaN(parseFloat(weight)) || parseFloat(weight) <= 0)) {
            errors.push('If weight is provided, it must be a positive number.');
        }


        if (errors.length > 0) {
            req.flash('error_msg', errors.join(' '));
            return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
        }

        // Calculate weight if needed (e.g., if weight field was cleared)
        if (!weight || isNaN(parseFloat(weight)) || parseFloat(weight) <= 0) {
            try {
                weight = calculateSkidWeight(parseFloat(width), parseFloat(length));
                console.log(`--- Calculated weight during update: ${weight} lbs ---`);
            } catch (calcError) {
                req.flash('error_msg', `Error calculating weight: ${calcError.message}`);
                return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
            }
        }

        const load = await Load.findById(loadId);
        if (!load || load.projectCode !== projectId || load.status !== 'Planned') {
            req.flash('error_msg', 'Invalid or non-editable load selected.');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        const skidIndex = load.skids.findIndex(skid => skid.id === skidId);
        if (skidIndex === -1) {
            req.flash('error_msg', 'Skid not found in truck load for update.');
            return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
        }

        console.log(`--- Updating skid data at index ${skidIndex} ---`);
        // Preserve originalInvId if it exists
        const originalInvId = load.skids[skidIndex].originalInvId;

        load.skids[skidIndex].width = parseFloat(width);
        load.skids[skidIndex].length = parseFloat(length);
        load.skids[skidIndex].weight = parseFloat(weight);
        load.skids[skidIndex].description = description || '';
        if (originalInvId) { // Ensure it's preserved
            load.skids[skidIndex].originalInvId = originalInvId;
        }


        // Update totals
        load.totalWeight = load.skids.reduce((sum, skid) => sum + (parseFloat(skid.weight) || 0), 0);
        // skidCount doesn't change on update
        load.updatedAt = new Date();
        load.updatedBy = req.user._id;

        await load.save();
        console.log('--- Truck skid updated and load saved ---');
        req.flash('success_msg', 'Truck skid updated successfully.');
        res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);

    } catch (err) {
        console.error('Error updating truck skid:', err);
        req.flash('error_msg', 'Error updating truck skid');
        const redirectLoadId = req.body.loadId || '';
        const redirectProject = req.params.projectId || '';
        res.redirect(redirectProject && redirectLoadId ? `/loader/truck/${redirectProject}/skids?loadId=${redirectLoadId}` : '/loader');
        // Consider using next(err)
    }
};

// @desc    Delete truck skid (handles DELETE or POST with _method=DELETE)
// @route   DELETE /loader/truck/:projectId/skid/:skidId
// @route   POST /loader/truck/:projectId/skid/:skidId (with _method=DELETE)
exports.deleteTruckSkid = async (req, res, next) => {
    try {
        const { projectId, skidId } = req.params;
        // Check body first (for forms), then query (for potential direct DELETE calls)
        const loadId = req.body.loadId || req.query.loadId;
        console.log(`--- Deleting truck skid ${skidId} from project ${projectId}, load ${loadId} ---`);

        if (!loadId || !mongoose.Types.ObjectId.isValid(loadId)) {
            req.flash('error_msg', 'Valid Load ID is required.');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        const load = await Load.findById(loadId);
        if (!load || load.projectCode !== projectId || load.status !== 'Planned') {
             req.flash('error_msg', 'Invalid or non-editable load selected.');
             return res.redirect(`/loader/truck/${projectId}`);
        }

        const initialLength = load.skids.length;
        const skidToRemove = load.skids.find(skid => skid.id === skidId);

        if (!skidToRemove) {
             req.flash('error_msg', 'Skid not found in truck load for deletion.');
             return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
        }
        const originalInvId = skidToRemove.originalInvId; // Get this before filtering

        load.skids = load.skids.filter(skid => skid.id !== skidId);

        if (load.skids.length === initialLength) {
             // Should not happen if find succeeded, but good practice
             req.flash('error_msg', 'Failed to remove skid.');
             return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
        }

        load.skidCount = load.skids.length;
        load.totalWeight = load.skids.reduce((sum, skid) => sum + (parseFloat(skid.weight) || 0), 0);
        load.updatedAt = new Date();
        load.updatedBy = req.user._id;

        await load.save();
        console.log('--- Truck skid removed and load saved ---');
        req.flash('success_msg', 'Truck skid removed successfully.');

        // Optional: Pass back deleted originalInvId if needed by frontend JS
        // res.locals.deletedOriginalInvId = originalInvId; // Not standard, better to handle via redirect flash

        res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);

    } catch (err) {
        console.error('Error removing truck skid:', err);
        req.flash('error_msg', 'Error removing truck skid');
        const redirectLoadId = req.body.loadId || req.query.loadId || '';
        const redirectProject = req.params.projectId || '';
        res.redirect(redirectProject && redirectLoadId ? `/loader/truck/${redirectProject}/skids?loadId=${redirectLoadId}` : '/loader');
        // Consider using next(err)
    }
};


// --- RELEVANT CONTROLLER FUNCTION ---
// @desc    Clear all truck skids
// @route   DELETE /loader/truck/:projectId/skids/clear
exports.clearTruckSkids = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { loadId } = req.body;

        console.log(`Clearing skids from load ${loadId} in project ${projectId}`);

        // Validate loadId
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

        // Verify the load belongs to the correct project
        if (load.projectCode !== projectId) {
            console.error(`Load ${loadId} does not belong to project ${projectId}`);
            req.flash('error_msg', 'Invalid load selected for this project');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Clear all skids from the load
        load.skids = [];
        load.skidCount = 0;
        load.totalWeight = 0;
        load.updatedAt = new Date();
        load.updatedBy = req.user._id;

        // Save the updated load
        await load.save();

        console.log(`Successfully cleared all skids from load ${loadId}`);
        req.flash('success_msg', 'All skids have been cleared from the truck');

        // Redirect back to the skids page
        res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
    } catch (err) {
        console.error('Error clearing truck skids:', err);
        req.flash('error_msg', 'Error clearing truck skids');
        next(err);
    }
};

// @desc    Add skids from inventory to truck (FIXED VERSION)
// @route   POST /loader/truck/:projectId/skids/add-from-inventory
exports.addSkidsFromInventory = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { loadId, selectedSkids, sourceProject } = req.body;

        console.log('=== Adding inventory skids ===');
        console.log('Main project (from URL):', projectId);
        console.log('Source project (from form):', sourceProject);
        console.log('Load ID:', loadId);
        console.log('Selected skids:', selectedSkids);

        // Validate loadId
        if (!loadId) {
            req.flash('error_msg', 'Load ID is required');
            return res.redirect(`/loader/truck/${projectId}/skids`);
        }

        // Check if any skids were selected
        if (!selectedSkids) {
            req.flash('error_msg', 'No inventory skids were selected');
            return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
        }

        // Ensure selectedSkids is an array
        const skidIds = Array.isArray(selectedSkids) ? selectedSkids : [selectedSkids];

        if (skidIds.length === 0) {
            req.flash('error_msg', 'No inventory skids were selected');
            return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
        }

        // Find the load
        const load = await Load.findById(loadId);
        if (!load) {
            req.flash('error_msg', 'Load not found');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // CRITICAL FIX: Use the sourceProject from the form, NOT the main project
        const inventoryProjectCode = sourceProject || projectId;
        
        console.log('=== Source Project Resolution ===');
        console.log('Using inventory project code:', inventoryProjectCode);
        console.log('================================');

        // Find inventory skids from the correct project
        const inventoryLoad = await Load.findOne({
            projectCode: inventoryProjectCode,
            isInventory: true
        });

        if (!inventoryLoad) {
            req.flash('error_msg', 'No inventory container found for the selected project');
            return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
        }

        // Process each selected skid
        let addedCount = 0;
        let alreadyOnTruckCount = 0;

        for (const skidId of skidIds) {
            // Find the inventory skid
            const inventorySkid = inventoryLoad.skids.find(s => s.id === skidId);

            if (!inventorySkid) {
                console.warn(`Inventory skid not found: ${skidId}`);
                continue;
            }

            // Check if already on truck
            const alreadyOnTruck = load.skids.some(s => s.originalInvId === skidId);

            if (alreadyOnTruck) {
                alreadyOnTruckCount++;
                continue;
            }

            // Create new truck skid with the correct source project
            const newSkid = {
                id: `TRUCK-${load.truckId}-${Date.now()}-${addedCount}`,
                width: inventorySkid.width,
                length: inventorySkid.length,
                weight: inventorySkid.weight,
                description: inventorySkid.description,
                originalInvId: inventorySkid.id,
                sourceProject: inventoryProjectCode, // THIS IS THE KEY FIX
                addedAt: new Date(),
                addedBy: req.user._id
            };

            console.log(`=== Creating skid ===`);
            console.log(`Skid ID: ${newSkid.id}`);
            console.log(`Source Project: ${newSkid.sourceProject}`);
            console.log(`Original Inv ID: ${newSkid.originalInvId}`);
            console.log(`====================`);

            load.skids.push(newSkid);
            addedCount++;
        }

        // Update load totals
        if (addedCount > 0) {
            load.skidCount = load.skids.length;
            load.totalWeight = load.skids.reduce((sum, skid) => sum + (parseFloat(skid.weight) || 0), 0);
            load.updatedAt = new Date();
            load.updatedBy = req.user._id;

            await load.save();
            
            // Verify the saved data
            const verifyLoad = await Load.findById(loadId);
            console.log('=== Verification ===');
            const lastSkid = verifyLoad.skids[verifyLoad.skids.length - 1];
            console.log('Last added skid source project:', lastSkid.sourceProject);
            console.log('===================');
            
            // Get project name for the message
            const sourceProjectDoc = await Project.findOne({ code: inventoryProjectCode });
            const projectName = sourceProjectDoc ? sourceProjectDoc.name : inventoryProjectCode;
            req.flash('success_msg', `${addedCount} skid(s) from ${projectName} added to truck successfully`);
        } else if (alreadyOnTruckCount > 0) {
            req.flash('info_msg', 'Selected skids are already on the truck');
        } else {
            req.flash('warning_msg', 'No valid skids were found to add');
        }

        // Redirect back with the source project
        res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}&showProject=${inventoryProjectCode}`);

    } catch (error) {
        console.error('ERROR in addSkidsFromInventory:', error);
        req.flash('error_msg', 'Error adding skids to truck');
        res.redirect(`/loader/truck/${req.params.projectId}/skids?loadId=${req.body.loadId || ''}`);
    }
};

// @desc    Get packing list page
// @route   GET /loader/truck/:projectId/packing-list
exports.getPackingListPage = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { loadId } = req.query;
        console.log(`--- Loading Packing List Page for project ${projectId}, load ${loadId} ---`);

        if (!loadId || !mongoose.Types.ObjectId.isValid(loadId)) {
            req.flash('error_msg', 'Valid Load ID is required.');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        const project = await Project.findOne({ code: projectId, status: 'Active' }).lean();
        const load = await Load.findById(loadId).lean(); // Lean is okay for display

        if (!project) {
            req.flash('error_msg', 'Project not found or inactive');
            return res.redirect('/loader/project-selection?task=truckEntry');
        }
        if (!load) {
            req.flash('error_msg', 'Load not found.');
            return res.redirect(`/loader/truck/${projectId}`);
        }
        if (load.projectCode !== projectId) {
             req.flash('error_msg', 'Load does not belong to this project.');
             return res.redirect(`/loader/truck/${projectId}`);
        }

        const formattedDate = new Date().toISOString().split('T')[0]; // For default date input

        res.render('loader/packing-list', {
            title: `Packing List - ${project.name} / ${load.truckId}`,
            layout: 'layouts/loader',
            project,
            load,
            formattedDate
        });
    } catch (err) {
        console.error('Error loading packing list page:', err);
        req.flash('error_msg', 'Error loading packing list');
        const redirectLoadId = req.query.loadId || '';
        const redirectProject = req.params.projectId || '';
        res.redirect(redirectProject && redirectLoadId ? `/loader/truck/${redirectProject}/skids?loadId=${redirectLoadId}` : '/loader');
        // Consider using next(err)
    }
};

// @desc    Save packing list
// @route   POST /loader/truck/:projectId/packing-list
exports.savePackingList = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { loadId, signature, ...packingListData } = req.body;
        console.log(`--- Saving Packing List for project ${projectId}, load ${loadId} ---`);

        if (!loadId || !mongoose.Types.ObjectId.isValid(loadId)) {
            req.flash('error_msg', 'Valid Load ID is required.');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        const load = await Load.findById(loadId);
        if (!load || load.projectCode !== projectId) {
            req.flash('error_msg', 'Invalid load selected.');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Merge new data into existing packingList object
        load.packingList = {
            ...(load.packingList || {}), // Ensure packingList exists
            ...packingListData
        };

        let statusChangeMsg = '';
        // Update signature and potentially status
        if (signature && signature !== 'data:,') { // Check if signature pad was used
            load.packingList.signature = signature;
            // Only change status if it's currently Planned or Loaded
            if (load.status === 'Planned' || load.status === 'Loaded') {
                 if (packingListData.receivedBy && packingListData.receivedBy.trim() !== '') {
                     load.status = 'Delivered';
                     statusChangeMsg = 'Load marked as Delivered.';
                 } else {
                     load.status = 'Loaded';
                     statusChangeMsg = 'Load marked as Loaded.';
                 }
            }
        } else if (!load.packingList.signature && load.status === 'Delivered') {
             // Edge case: If signature was removed and status was Delivered, maybe revert?
             // load.status = 'Loaded'; // Or Planned? Requires business logic decision.
             // statusChangeMsg = 'Load status reverted due to signature removal.';
        }

        load.updatedAt = new Date();
        load.updatedBy = req.user._id;
        await load.save();

        console.log(`--- Packing list saved. Status: ${load.status}. ${statusChangeMsg} ---`);
        req.flash('success_msg', `Packing list saved. ${statusChangeMsg}`);

        // Redirect based on final status
        const redirectUrl = load.status === 'Delivered'
            ? `/loader` // Go back to loader dashboard if delivered
            : `/loader/truck/${projectId}/packing-list?loadId=${loadId}`; // Stay on packing list otherwise
        res.redirect(redirectUrl);

    } catch (err) {
        console.error('Error saving packing list:', err);
        req.flash('error_msg', 'Error saving packing list');
        const redirectLoadId = req.body.loadId || '';
        const redirectProject = req.params.projectId || '';
        res.redirect(redirectProject && redirectLoadId ? `/loader/truck/${redirectProject}/packing-list?loadId=${redirectLoadId}` : '/loader');
        // Consider using next(err)
    }
};


// @desc    Print truck load information
// @route   GET /loader/truck/:projectId/print
exports.printTruckLoad = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { loadId } = req.query;
        console.log(`--- Generating Print View for project ${projectId}, load ${loadId} ---`);

        if (!loadId || !mongoose.Types.ObjectId.isValid(loadId)) {
            req.flash('error_msg', 'Valid Load ID is required.');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Populate user details for createdBy and updatedBy
        const load = await Load.findById(loadId)
                               .populate('createdBy', 'username') // Select username field
                               .populate('updatedBy', 'username') // Select username field
                               .lean(); // Use lean for read-only view

        if (!load || load.projectCode !== projectId) {
            req.flash('error_msg', 'Invalid load selected for printing.');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        const project = await Project.findOne({ code: projectId }).lean();
        if (!project) {
             // Should not happen if load check passed, but good practice
             req.flash('error_msg', 'Project not found.');
             return res.redirect(`/loader/truck/${projectId}`);
        }

        res.render('loader/print', {
            title: `Print - ${load.truckId} / ${project.name}`,
            layout: 'layouts/print',
            project,
            load,
            spaceUtilization: calculateSpaceUtilization(load), // Use lean object
            isOverweight: isLoadOverweight(load),             // Use lean object
            // Format dates nicely
            formattedDate: load.dateEntered ? new Date(load.dateEntered).toLocaleDateString() : 'N/A',
            formattedUpdatedDate: load.updatedAt ? new Date(load.updatedAt).toLocaleString() : 'N/A', // Add time
            // Safely access populated usernames
            creatorUsername: load.createdBy?.username || 'N/A',
            updaterUsername: load.updatedBy?.username || 'N/A'
        });
    } catch (err) {
        console.error('Error generating print view:', err);
        req.flash('error_msg', 'Error generating print view');
        const redirectLoadId = req.query.loadId || '';
        const redirectProject = req.params.projectId || '';
        // Redirect back to skid details page on error
        res.redirect(redirectProject && redirectLoadId ? `/loader/truck/${redirectProject}/skids?loadId=${redirectLoadId}` : '/loader');
        // Consider using next(err)
    }
};


// @desc    Get loader dashboard stats API
// @route   GET /loader/stats
exports.getLoaderStats = async (req, res) => {
     // This duplicates the route definition in loaderRoutes.js.
     // Keep the logic here, but ensure the route is ONLY defined in loaderRoutes.js.
    try {
        console.log('--- Fetching Loader Stats API ---');
        const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
        const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); startOfWeek.setHours(0, 0, 0, 0);

        const plannedLoads = await Load.countDocuments({ status: 'Planned', isInventory: { $ne: true } });
        const loadedToday = await Load.countDocuments({ status: 'Loaded', updatedAt: { $gte: startOfToday, $lte: endOfToday }, isInventory: { $ne: true } });
        const deliveredWeek = await Load.countDocuments({ status: 'Delivered', updatedAt: { $gte: startOfWeek }, isInventory: { $ne: true } });

        const loadCounts = await Load.aggregate([
            { $match: { isInventory: { $ne: true } } }, // Count skids across all non-inventory loads ever
            { $group: { _id: null, totalSkids: { $sum: "$skidCount" } } }
        ]);
        const totalSkidsLoadedAllTime = loadCounts.length > 0 ? loadCounts[0].totalSkids : 0;

        res.json({
            plannedLoads,
            loadedToday,
            deliveredWeek,
            totalSkidsLoaded: totalSkidsLoadedAllTime
        });
    } catch (err) {
        console.error('Error fetching loader stats API:', err);
        res.status(500).json({ error: 'Failed to fetch loader stats' });
    }
};


// --- Helper Functions ---

// Update calculateSpaceUtilization function to handle weight properly
function calculateSpaceUtilization(load) {
    const result = {
        totalArea: 0,
        truckArea: 0,
        percentage: 0,
        formattedPercentage: '0.0%',
        totalWeight: 0  // Add this property
    };
    
    // Calculate truck area if truck info exists
    if (load && load.truckInfo && load.truckInfo.length && load.truckInfo.width) {
        const length = parseFloat(load.truckInfo.length);
        const width = parseFloat(load.truckInfo.width);
        
        if (!isNaN(length) && !isNaN(width) && length > 0 && width > 0) {
            result.truckArea = length * width;
        }
    }
    
    // Calculate total area and weight from skids
    if (load && load.skids && Array.isArray(load.skids)) {
        load.skids.forEach(skid => {
            const width = parseFloat(skid.width);
            const length = parseFloat(skid.length);
            const weight = parseFloat(skid.weight);
            
            if (!isNaN(width) && !isNaN(length) && width > 0 && length > 0) {
                result.totalArea += (width * length);
            }
            
            if (!isNaN(weight) && weight > 0) {
                result.totalWeight += weight;
            }
        });
    }
    
    // Calculate percentage if truck area is available
    if (result.truckArea > 0) {
        result.percentage = (result.totalArea / result.truckArea) * 100;
        result.formattedPercentage = `${result.percentage.toFixed(1)}%`;
    }
    
    return result;
}

// Check if a load is overweight (Corrected Version)
function isLoadOverweight(load) {
    if (!load || !load.truckInfo || !load.truckInfo.weight || isNaN(parseFloat(load.truckInfo.weight)) || parseFloat(load.truckInfo.weight) <= 0) {
        return false;
    }
    if (load.totalWeight === undefined || load.totalWeight === null || isNaN(parseFloat(load.totalWeight))) {
        return false;
    }
    const totalWeight = parseFloat(load.totalWeight);
    const capacity = parseFloat(load.truckInfo.weight);
    return totalWeight > capacity;
}

// Ensure all exported functions are available
module.exports = exports;

// @desc    Get available projects for multi-project loading
// @route   GET /api/available-projects
exports.getAvailableProjects = async (req, res) => {
    try {
        const { excludeProject } = req.query;
        console.log(`Fetching available projects, excluding: ${excludeProject}`);
        
        // Build query
        const query = { status: 'Active' };
        if (excludeProject) {
            query.code = { $ne: excludeProject };
        }
        
        const projects = await Project.find(query)
            .select('code name')
            .sort({ code: 1 })
            .lean();
            
        res.json({ projects });
    } catch (err) {
        console.error('Error fetching available projects:', err);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
};

// @desc    Add another project's inventory to current load
// @route   POST /truck/:projectId/add-project
exports.addProjectToLoad = async (req, res, next) => {
    try {
        const { projectId } = req.params; // Current project
        const { loadId, additionalProjectCode } = req.body;
        
        console.log(`Adding project ${additionalProjectCode} inventory to load ${loadId}`);
        
        // Validate inputs
        if (!loadId || !additionalProjectCode) {
            req.flash('error_msg', 'Load ID and project code are required');
            return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
        }
        
        // Find the load
        const load = await Load.findById(loadId);
        if (!load) {
            req.flash('error_msg', 'Load not found');
            return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
        }
        
        // Verify the additional project exists
        const additionalProject = await Project.findOne({ 
            code: additionalProjectCode, 
            status: 'Active' 
        });
        
        if (!additionalProject) {
            req.flash('error_msg', 'Selected project not found or inactive');
            return res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}`);
        }
        
        // Include the additional project in the load (if not already there)
        if (!load.additionalProjects) {
            load.additionalProjects = [];
        }
        
        if (!load.additionalProjects.includes(additionalProjectCode)) {
            load.additionalProjects.push(additionalProjectCode);
            load.updatedAt = new Date();
            load.updatedBy = req.user._id;
            await load.save();
        }
        
        req.flash('success_msg', `Added ${additionalProject.name} to available projects`);
        res.redirect(`/loader/truck/${projectId}/skids?loadId=${loadId}&showProject=${additionalProjectCode}`);
        
    } catch (err) {
        console.error('Error adding project to load:', err);
        req.flash('error_msg', 'Error adding project to load');
        res.redirect(`/loader/truck/${req.params.projectId}/skids?loadId=${req.body.loadId || ''}`);
    }
};

// @desc    Modified getSkidDetailsPage to handle multiple projects
// @route   GET /truck/:projectId/skids
exports.getSkidDetailsPageMultiProject = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { loadId, showProject } = req.query;
        console.log(`Loading Skid Details Page for project ${projectId}, load ${loadId}, showing ${showProject || projectId}`);

        if (!loadId || !mongoose.Types.ObjectId.isValid(loadId)) {
            req.flash('error_msg', 'Valid Load ID is required to view skids.');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        const project = await Project.findOne({ code: projectId, status: 'Active' }).lean();
        const load = await Load.findById(loadId);

        if (!project) {
            req.flash('error_msg', 'Project not found or inactive');
            return res.redirect('/loader/project-selection?task=truckEntry');
        }
        if (!load) {
            req.flash('error_msg', 'Load not found.');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Determine which project's inventory to show
        const displayProjectCode = showProject || projectId;
        const displayProject = await Project.findOne({ code: displayProjectCode, status: 'Active' }).lean();
        
        // Get inventory skids for the display project
        const inventoryLoad = await Load.findOne({ 
            projectCode: displayProjectCode, 
            isInventory: true 
        }).lean();
        
        const inventorySkidsRaw = inventoryLoad?.skids || [];

        // Get skids already on the truck
        const skidsOnTruckIds = new Set(load.skids.map(skid => skid.originalInvId).filter(id => id));
        
        const inventorySkids = inventorySkidsRaw.map(skid => ({
            ...skid,
            alreadyOnTruck: skidsOnTruckIds.has(skid.id),
            fromProject: displayProjectCode // Track which project this skid is from
        }));

        // Get additional projects if any
        const additionalProjects = [];
        if (load.additionalProjects && load.additionalProjects.length > 0) {
            const additionalProjectDocs = await Project.find({
                code: { $in: load.additionalProjects },
                status: 'Active'
            }).lean();
            additionalProjects.push(...additionalProjectDocs);
        }

        const spaceUtilization = calculateSpaceUtilization(load);
        const isOverweight = isLoadOverweight(load);

        res.render('loader/skid-details', {
            title: `Skid Details - ${project.name} / ${load.truckId}`,
            layout: 'layouts/loader',
            project,
            displayProject, // The project whose inventory we're showing
            load,
            inventorySkids,
            spaceUtilization,
            isOverweight,
            additionalProjects,
            showProject: displayProjectCode
        });
    } catch (err) {
        console.error('Error loading skid details page:', err);
        req.flash('error_msg', 'Error loading skid details page');
        res.redirect(`/loader/truck/${req.params.projectId || ''}`);
    }
};

// @desc    Get skid details page with project names
// @route   GET /loader/truck/:projectId/skids
exports.getSkidDetailsPageWithProjects = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const { loadId, showProject } = req.query;
        console.log(`Loading Skid Details Page for project ${projectId}, load ${loadId}`);

        if (!loadId || !mongoose.Types.ObjectId.isValid(loadId)) {
            req.flash('error_msg', 'Valid Load ID is required to view skids.');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        const project = await Project.findOne({ code: projectId, status: 'Active' }).lean();
        const load = await Load.findById(loadId);

        if (!project) {
            req.flash('error_msg', 'Project not found or inactive');
            return res.redirect('/loader/project-selection?task=truckEntry');
        }
        if (!load) {
            req.flash('error_msg', 'Load not found.');
            return res.redirect(`/loader/truck/${projectId}`);
        }

        // Collect unique project codes from the load's skids
        const projectCodes = new Set();
        projectCodes.add(projectId); // Add the main project

        // Extract project codes from skids
        load.skids.forEach(skid => {
            if (skid.sourceProject) {
                projectCodes.add(skid.sourceProject);
            } else if (skid.originalInvId) {
                const parts = skid.originalInvId.split('-');
                if (parts.length >= 3 && parts[0] === 'INV') {
                    projectCodes.add(parts[1]);
                }
            }
        });

        // Fetch all projects at once
        const allProjects = await Project.find({
            code: { $in: Array.from(projectCodes) },
            status: 'Active'
        }).lean();

        // Create a mapping of project code to project name
        const projectMap = {};
        allProjects.forEach(proj => {
            projectMap[proj.code] = proj.name;
        });

        // Determine which project's inventory to show
        const displayProjectCode = showProject || projectId;
        const displayProject = await Project.findOne({ code: displayProjectCode, status: 'Active' }).lean();

        // Get inventory skids for the display project
        const inventoryLoad = await Load.findOne({
            projectCode: displayProjectCode,
            isInventory: true
        }).lean();

        const inventorySkidsRaw = inventoryLoad?.skids || [];

        // Get skids already on the truck
        const skidsOnTruckIds = new Set(load.skids.map(skid => skid.originalInvId).filter(id => id));

        const inventorySkids = inventorySkidsRaw.map(skid => ({
            ...skid,
            alreadyOnTruck: skidsOnTruckIds.has(skid.id),
            fromProject: displayProjectCode
        }));

        // Get additional projects if any
        const additionalProjects = [];
        if (load.additionalProjects && load.additionalProjects.length > 0) {
            const additionalProjectDocs = await Project.find({
                code: { $in: load.additionalProjects },
                status: 'Active'
            }).lean();
            additionalProjects.push(...additionalProjectDocs);
        }

        const spaceUtilization = calculateSpaceUtilization(load);
        const isOverweight = isLoadOverweight(load);

        res.render('loader/skid-details', {
            title: `Skid Details - ${project.name} / ${load.truckId}`,
            layout: 'layouts/loader',
            project,
            displayProject,
            load,
            inventorySkids,
            spaceUtilization,
            isOverweight,
            additionalProjects,
            showProject: displayProjectCode,
            projectMap // Pass the project mapping to the view
        });
    } catch (err) {
        console.error('Error loading skid details page:', err);
        req.flash('error_msg', 'Error loading skid details page');
        res.redirect(`/loader/truck/${req.params.projectId || ''}`);
    }
};