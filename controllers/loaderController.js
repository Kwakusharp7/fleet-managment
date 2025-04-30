const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const moment = require('moment');
const Load = require('../models/Load');
const Project = require('../models/Project');
const helpers = require('../utils/helpers');

/**
 * @desc    Get loader interface
 * @route   GET /loader
 * @access  Loader
 */
exports.getLoaderInterface = async (req, res) => {
    try {
        // Get active projects for dropdowns
        const projects = await Project.find({ status: 'Active' }).sort({ code: 1 });

        res.render('loader/interface', {
            title: 'Loading & Inventory System',
            projects,
            user: req.user,
            path: '/loader'
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error loading interface');
        res.redirect('/dashboard');
    }
};

/**
 * @desc    Save truck info and create a new load
 * @route   POST /loader/truck-info
 * @access  Loader
 */
exports.saveTruckInfo = [
    // Validation
    check('truckId', 'Truck ID is required').notEmpty().trim(),
    check('projectCode', 'Project is required').notEmpty().trim(),
    check('length').isFloat({ min: 1 }).withMessage('Length must be greater than 0'),
    check('width').isFloat({ min: 1 }).withMessage('Width must be greater than 0'),
    check('weight').isFloat({ min: 1000 }).withMessage('Weight capacity must be at least 1000 lbs'),

    async (req, res) => {
        const errors = validationResult(req);

        // If there are validation errors, return them
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array(),
                message: 'Validation failed'
            });
        }

        try {
            const { truckId, projectCode, length, width, weight } = req.body;

            // Check if project exists
            const project = await Project.findOne({ code: projectCode });
            if (!project) {
                return res.status(400).json({
                    success: false,
                    message: 'Selected project not found'
                });
            }

            // Create or update the load
            let load;

            // Check if this is an update to an existing load
            if (req.body.loadId) {
                load = await Load.findById(req.body.loadId);

                if (!load) {
                    return res.status(404).json({
                        success: false,
                        message: 'Load not found'
                    });
                }

                // Only update if not delivered
                if (load.status === 'Delivered') {
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot edit a delivered load'
                    });
                }

                // Update the load
                load.truckId = truckId;
                load.projectCode = projectCode;
                load.truckInfo = {
                    length: parseFloat(length),
                    width: parseFloat(width),
                    weight: parseFloat(weight)
                };
                load.updatedBy = req.user._id;
                load.updatedAt = new Date();
            } else {
                // Create a new load
                load = new Load({
                    truckId,
                    projectCode,
                    dateEntered: new Date(),
                    status: 'Planned',
                    truckInfo: {
                        length: parseFloat(length),
                        width: parseFloat(width),
                        weight: parseFloat(weight)
                    },
                    skids: [],
                    createdBy: req.user._id,
                    skidCount: 0,
                    totalWeight: 0
                });
            }

            // Save the load
            await load.save();

            res.json({
                success: true,
                loadId: load._id,
                message: 'Truck information saved successfully'
            });
        } catch (err) {
            console.error('Error saving truck info:', err);
            res.status(500).json({
                success: false,
                message: 'Server error while saving truck information'
            });
        }
    }
];

/**
 * @desc    Save skids for a load
 * @route   POST /loader/save-skids
 * @access  Loader
 */
exports.saveSkids = async (req, res) => {
    try {
        const { loadId, skids } = req.body;

        if (!loadId || !mongoose.Types.ObjectId.isValid(loadId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid load ID'
            });
        }

        // Find the load
        const load = await Load.findById(loadId);

        if (!load) {
            return res.status(404).json({
                success: false,
                message: 'Load not found'
            });
        }

        // Check if load can be edited
        if (load.status === 'Delivered') {
            return res.status(400).json({
                success: false,
                message: 'Cannot edit a delivered load'
            });
        }

        // Update the skids
        load.skids = skids;

        // Calculate totals
        load.skidCount = skids.length;
        load.totalWeight = skids.reduce((sum, skid) => sum + (parseFloat(skid.weight) || 0), 0);

        // Update metadata
        load.updatedBy = req.user._id;
        load.updatedAt = new Date();

        // If there are skids and the status is Planned, update to Loaded
        if (skids.length > 0 && load.status === 'Planned') {
            load.status = 'Loaded';
        }

        // Save the load
        await load.save();

        res.json({
            success: true,
            message: 'Skids saved successfully'
        });
    } catch (err) {
        console.error('Error saving skids:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while saving skids'
        });
    }
};

/**
 * @desc    Save packing list
 * @route   POST /loader/save-packing-list
 * @access  Loader
 */
exports.savePackingList = async (req, res) => {
    try {
        const { loadId, status } = req.body;

        if (!loadId || !mongoose.Types.ObjectId.isValid(loadId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid load ID'
            });
        }

        // Find the load
        const load = await Load.findById(loadId);

        if (!load) {
            return res.status(404).json({
                success: false,
                message: 'Load not found'
            });
        }

        // Check if load can be edited
        if (load.status === 'Delivered' && status !== 'Delivered') {
            return res.status(400).json({
                success: false,
                message: 'Cannot edit a delivered load'
            });
        }

        // Check required fields for completion
        if (status === 'Delivered') {
            if (!req.body.receivedBy) {
                return res.status(400).json({
                    success: false,
                    message: 'Driver name is required to mark as delivered'
                });
            }

            if (!req.body.signature) {
                return res.status(400).json({
                    success: false,
                    message: 'Driver signature is required to mark as delivered'
                });
            }
        }

        // Update packing list data
        const packingList = {
            date: req.body.date || null,
            workOrder: req.body.workOrder || '',
            projectName: req.body.projectName || '',
            projectAddress: req.body.projectAddress || '',
            requestedBy: req.body.requestedBy || '',
            carrier: req.body.carrier || '',
            consignee: req.body.consignee || '',
            consigneeAddress: req.body.consigneeAddress || '',
            siteContact: req.body.siteContact || '',
            sitePhone: req.body.sitePhone || '',
            deliveryDate: req.body.deliveryDate || null,
            packagedBy: req.body.packagedBy || '',
            checkedBy: req.body.checkedBy || req.user.username,
            receivedBy: req.body.receivedBy || '',
            signature: req.body.signature || null
        };

        // Update the load
        load.packingList = packingList;
        load.status = status || load.status;
        load.updatedBy = req.user._id;
        load.updatedAt = new Date();

        // Save the load
        await load.save();

        res.json({
            success: true,
            message: 'Packing list saved successfully'
        });
    } catch (err) {
        console.error('Error saving packing list:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while saving packing list'
        });
    }
};

/**
 * @desc    Get inventory skids for a project
 * @route   GET /loader/inventory/:projectCode
 * @access  Loader
 */
exports.getInventorySkids = async (req, res) => {
    try {
        const { projectCode } = req.params;

        // Check if project exists
        const project = await Project.findOne({ code: projectCode });
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        // Find all loads for this project
        const loads = await Load.find({
            projectCode,
            status: 'Delivered' // Only delivered loads have their skids available for inventory
        }).select('skids');

        // Flatten all skids from all loads
        const inventorySkids = loads.reduce((allSkids, load) => {
            return allSkids.concat(load.skids.map(skid => ({
                ...skid.toObject(),
                loadId: load._id
            })));
        }, []);

        res.json({
            success: true,
            skids: inventorySkids
        });
    } catch (err) {
        console.error('Error fetching inventory skids:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching inventory skids'
        });
    }
};

/**
 * @desc    Get load details for editing
 * @route   GET /loader/load/:id
 * @access  Loader
 */
exports.getLoadDetails = async (req, res) => {
    try {
        const load = await Load.findById(req.params.id);

        if (!load) {
            return res.status(404).json({
                success: false,
                message: 'Load not found'
            });
        }

        // Check if the user has access to this load
        if (load.status === 'Delivered') {
            return res.status(400).json({
                success: false,
                message: 'Cannot edit a delivered load'
            });
        }

        const project = await Project.findOne({ code: load.projectCode });

        res.json({
            success: true,
            load: {
                ...load.toObject(),
                projectName: project ? project.name : 'Unknown Project',
                formattedDate: moment(load.dateEntered).format('YYYY-MM-DD HH:mm')
            }
        });
    } catch (err) {
        console.error('Error fetching load details:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching load details'
        });
    }
};