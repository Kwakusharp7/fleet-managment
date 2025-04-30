const { check, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const moment = require('moment');
const Load = require('../models/Load');
const Project = require('../models/Project');

// @desc    Get all loads
// @route   GET /loads
exports.getLoads = async (req, res) => {
    try {
        // Get query parameters for filtering
        const { projectCode, status, search, sortBy = 'dateEntered', sortDir = 'desc' } = req.query;

        // Build query
        let query = {};

        if (projectCode) {
            query.projectCode = projectCode;
        }

        if (status) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { truckId: { $regex: search, $options: 'i' } },
                // Add other searchable fields as needed
            ];
        }

        // Get all projects for filter dropdown
        const projects = await Project.find().sort({ code: 1 });

        // Get all loads with project info
        const loads = await Load.find(query)
            .sort({ [sortBy]: sortDir === 'asc' ? 1 : -1 })
            .lean();

        // Enhance loads with project info
        const projectMap = {};
        projects.forEach(project => {
            projectMap[project.code] = project;
        });

        const enhancedLoads = loads.map(load => {
            const project = projectMap[load.projectCode] || { name: 'Unknown Project' };
            return {
                ...load,
                projectName: project.name,
                projectFullName: `${load.projectCode} – ${project.name}`,
                formattedDate: moment(load.dateEntered).format('YYYY-MM-DD HH:mm')
            };
        });

        res.render('load/index', {
            title: 'Load Management',
            loads: enhancedLoads,
            projects,
            filters: {
                projectCode: projectCode || '',
                status: status || '',
                search: search || '',
                sortBy,
                sortDir
            }
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error retrieving loads');
        res.redirect('/dashboard');
    }
};

// @desc    Get load create form
// @route   GET /loads/create
exports.getCreateLoadForm = async (req, res) => {
    try {
        const projects = await Project.find({ status: 'Active' }).sort({ code: 1 });

        res.render('load/create', {
            title: 'Create Load',
            projects
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error retrieving projects');
        res.redirect('/loads');
    }
};

// @desc    Create a load
// @route   POST /loads
exports.createLoad = [
    // Validation
    check('truckId').notEmpty().withMessage('Truck ID is required'),
    check('projectCode').notEmpty().withMessage('Project is required'),
    check('length').isFloat({ min: 1 }).withMessage('Length must be greater than 0'),
    check('width').isFloat({ min: 1 }).withMessage('Width must be greater than 0'),
    check('weight').isFloat({ min: 1000 }).withMessage('Weight capacity must be at least 1000 lbs'),

    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const projects = await Project.find({ status: 'Active' }).sort({ code: 1 });

            return res.status(400).render('load/create', {
                title: 'Create Load',
                errors: errors.array(),
                formData: req.body,
                projects
            });
        }

        try {
            const { truckId, projectCode, length, width, weight, skids, packingList } = req.body;

            // Check if project exists
            const project = await Project.findOne({ code: projectCode });
            if (!project) {
                req.flash('error_msg', 'Selected project not found');
                return res.redirect('/loads/create');
            }

            // Parse skids data from JSON string if sent from frontend
            let skidsArray = [];
            if (skids) {
                try {
                    skidsArray = typeof skids === 'string' ? JSON.parse(skids) : skids;
                } catch (e) {
                    console.error('Error parsing skids:', e);
                }
            }

            // Parse packing list data from JSON string if sent from frontend
            let packingListData = {};
            if (packingList) {
                try {
                    packingListData = typeof packingList === 'string' ? JSON.parse(packingList) : packingList;
                } catch (e) {
                    console.error('Error parsing packing list:', e);
                }
            }

            // Create new load
            const newLoad = new Load({
                truckId,
                projectCode,
                dateEntered: new Date(),
                status: 'Planned',
                truckInfo: {
                    length: parseFloat(length),
                    width: parseFloat(width),
                    weight: parseFloat(weight)
                },
                skids: skidsArray,
                packingList: packingListData,
                createdBy: req.user._id
            });

            // Calculate derived values
            newLoad.skidCount = skidsArray.length;
            newLoad.totalWeight = skidsArray.reduce((sum, skid) => sum + (parseFloat(skid.weight) || 0), 0);

            await newLoad.save();

            req.flash('success_msg', 'Load created successfully');
            res.redirect(`/loads/${newLoad._id}`);
        } catch (err) {
            console.error(err);
            req.flash('error_msg', 'Error creating load');
            res.redirect('/loads/create');
        }
    }
];

// @desc    Get load details
// @route   GET /loads/:id
exports.getLoadDetails = async (req, res) => {
    try {
        const load = await Load.findById(req.params.id).lean();

        if (!load) {
            req.flash('error_msg', 'Load not found');
            return res.redirect('/loads');
        }

        const project = await Project.findOne({ code: load.projectCode });

        res.render('load/view', {
            title: `Load Details: ${load.truckId}`,
            load: {
                ...load,
                projectName: project ? project.name : 'Unknown Project',
                projectFullName: project ? `${load.projectCode} – ${project.name}` : load.projectCode,
                formattedDate: moment(load.dateEntered).format('YYYY-MM-DD HH:mm'),
                canEdit: load.status !== 'Delivered'
            }
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error retrieving load');
        res.redirect('/loads');
    }
};

// @desc    Get load edit form
// @route   GET /loads/:id/edit
exports.getEditLoadForm = async (req, res) => {
    try {
        const load = await Load.findById(req.params.id);

        if (!load) {
            req.flash('error_msg', 'Load not found');
            return res.redirect('/loads');
        }

        // Check if load can be edited
        if (load.status === 'Delivered') {
            req.flash('error_msg', 'Delivered loads cannot be edited');
            return res.redirect(`/loads/${load._id}`);
        }

        const projects = await Project.find({ status: 'Active' }).sort({ code: 1 });
        const project = await Project.findOne({ code: load.projectCode });

        res.render('load/edit', {
            title: `Edit Load: ${load.truckId}`,
            load: {
                ...load.toObject(),
                projectName: project ? project.name : 'Unknown Project',
                projectFullName: project ? `${load.projectCode} – ${project.name}` : load.projectCode
            },
            projects
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error retrieving load');
        res.redirect('/loads');
    }
};

// @desc    Update a load
// @route   PUT /loads/:id
exports.updateLoad = [
    // Validation
    check('truckId').notEmpty().withMessage('Truck ID is required'),
    check('projectCode').notEmpty().withMessage('Project is required'),
    check('length').isFloat({ min: 1 }).withMessage('Length must be greater than 0'),
    check('width').isFloat({ min: 1 }).withMessage('Width must be greater than 0'),
    check('weight').isFloat({ min: 1000 }).withMessage('Weight capacity must be at least 1000 lbs'),

    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const projects = await Project.find({ status: 'Active' }).sort({ code: 1 });

            return res.status(400).render('load/edit', {
                title: 'Edit Load',
                errors: errors.array(),
                load: {
                    ...req.body,
                    _id: req.params.id
                },
                projects
            });
        }

        try {
            const { truckId, projectCode, status, length, width, weight, skids, packingList } = req.body;

            // Find the load
            const load = await Load.findById(req.params.id);

            if (!load) {
                req.flash('error_msg', 'Load not found');
                return res.redirect('/loads');
            }

            // Check if load can be edited
            if (load.status === 'Delivered') {
                req.flash('error_msg', 'Delivered loads cannot be edited');
                return res.redirect(`/loads/${load._id}`);
            }

            // Check if project exists
            const project = await Project.findOne({ code: projectCode });
            if (!project) {
                req.flash('error_msg', 'Selected project not found');
                return res.redirect(`/loads/${load._id}/edit`);
            }

            // Parse skids data from JSON string if sent from frontend
            let skidsArray = [];
            if (skids) {
                try {
                    skidsArray = typeof skids === 'string' ? JSON.parse(skids) : skids;
                } catch (e) {
                    console.error('Error parsing skids:', e);
                }
            }

            // Parse packing list data from JSON string if sent from frontend
            let packingListData = {};
            if (packingList) {
                try {
                    packingListData = typeof packingList === 'string' ? JSON.parse(packingList) : packingList;
                } catch (e) {
                    console.error('Error parsing packing list:', e);
                }
            }

            // Update load
            load.truckId = truckId;
            load.projectCode = projectCode;
            load.status = status || 'Planned';
            load.truckInfo = {
                length: parseFloat(length),
                width: parseFloat(width),
                weight: parseFloat(weight)
            };
            load.skids = skidsArray;
            load.packingList = packingListData;
            load.updatedBy = req.user._id;
            load.updatedAt = new Date();

            // Calculate derived values
            load.skidCount = skidsArray.length;
            load.totalWeight = skidsArray.reduce((sum, skid) => sum + (parseFloat(skid.weight) || 0), 0);

            await load.save();

            req.flash('success_msg', 'Load updated successfully');
            res.redirect(`/loads/${load._id}`);
        } catch (err) {
            console.error(err);
            req.flash('error_msg', 'Error updating load');
            res.redirect(`/loads/${req.params.id}/edit`);
        }
    }
];

// @desc    Delete a load
// @route   DELETE /loads/:id
exports.deleteLoad = async (req, res) => {
    try {
        const load = await Load.findById(req.params.id);

        if (!load) {
            req.flash('error_msg', 'Load not found');
            return res.redirect('/loads');
        }

        // Check if load can be deleted
        if (load.status === 'Delivered') {
            req.flash('error_msg', 'Delivered loads cannot be deleted');
            return res.redirect(`/loads/${load._id}`);
        }

        await load.deleteOne();

        req.flash('success_msg', 'Load deleted successfully');
        res.redirect('/loads');
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error deleting load');
        res.redirect('/loads');
    }
};

// @desc    Update load status
// @route   PUT /loads/:id/status
exports.updateLoadStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!status || !['Planned', 'Loaded', 'Delivered'].includes(status)) {
            req.flash('error_msg', 'Invalid status');
            return res.redirect(`/loads/${req.params.id}`);
        }

        const load = await Load.findById(req.params.id);

        if (!load) {
            req.flash('error_msg', 'Load not found');
            return res.redirect('/loads');
        }

        // Update status
        load.status = status;
        load.updatedBy = req.user._id;
        load.updatedAt = new Date();

        await load.save();

        req.flash('success_msg', `Load status updated to ${status}`);
        res.redirect(`/loads/${load._id}`);
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error updating load status');
        res.redirect(`/loads/${req.params.id}`);
    }
};

// @desc    Get load packing list generation page
// @route   GET /loads/:id/packing-list
exports.getPackingListPage = async (req, res) => {
    try {
        const load = await Load.findById(req.params.id);

        if (!load) {
            req.flash('error_msg', 'Load not found');
            return res.redirect('/loads');
        }

        const project = await Project.findOne({ code: load.projectCode });

        res.render('load/packing-list', {
            title: `Packing List: ${load.truckId}`,
            load: {
                ...load.toObject(),
                projectName: project ? project.name : 'Unknown Project',
                projectFullName: project ? `${load.projectCode} – ${project.name}` : load.projectCode
            }
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Error retrieving load');
        res.redirect('/loads');
    }
};

// @desc    Save packing list data
// @route   PUT /loads/:id/packing-list
exports.savePackingList = async (req, res) => {
    try {
        const { packingList } = req.body;

        const load = await Load.findById(req.params.id);

        if (!load) {
            req.flash('error_msg', 'Load not found');
            return res.redirect('/loads');
        }

        // Parse packing list data
        let packingListData = {};
        if (packingList) {
            try {
                packingListData = typeof packingList === 'string' ? JSON.parse(packingList) : packingList;
            } catch (e) {
                console.error('Error parsing packing list:', e);
                return res.status(400).json({ error: 'Invalid packing list data' });
            }
        }

        // Update packing list
        load.packingList = packingListData;
        load.updatedBy = req.user._id;
        load.updatedAt = new Date();

        // Check if status should be updated based on signature
        if (packingListData.signature && packingListData.receivedBy) {
            load.status = 'Delivered';
        }

        await load.save();

        // Handle AJAX request
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ success: true, message: 'Packing list saved successfully' });
        }

        req.flash('success_msg', 'Packing list saved successfully');
        res.redirect(`/loads/${load._id}`);
    } catch (err) {
        console.error(err);

        // Handle AJAX request
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ error: 'Error saving packing list' });
        }

        req.flash('error_msg', 'Error saving packing list');
        res.redirect(`/loads/${req.params.id}/packing-list`);
    }
};

// @desc    Get load create form
// @route   GET /loads/create
exports.getCreateLoadForm = async (req, res) => {
    try {
        const projects = await Project.find({ status: 'Active' }).sort({ code: 1 });

        res.render('load/create', {
            title: 'Create Load',
            projects,
            formData: {} // Initialize empty form data
        });
    } catch (err) {
        console.error('Error retrieving projects for create load form:', err);
        req.flash('error_msg', 'Error retrieving projects');
        res.redirect('/loads');
    }
};
// @desc    Get load edit form
// @route   GET /loads/:id/edit
exports.getEditLoadForm = async (req, res) => {
    try {
        const load = await Load.findById(req.params.id);

        if (!load) {
            req.flash('error_msg', 'Load not found');
            return res.redirect('/loads');
        }

        // Check if load can be edited
        if (load.status === 'Delivered') {
            req.flash('error_msg', 'Delivered loads cannot be edited');
            return res.redirect(`/loads/${load._id}`);
        }

        // Get all active projects for dropdown
        const projects = await Project.find({ status: 'Active' }).sort({ code: 1 });

        // Get project details for this load
        const project = await Project.findOne({ code: load.projectCode });

        res.render('load/edit', {
            title: `Edit Load: ${load.truckId}`,
            load: {
                ...load.toObject(),
                projectName: project ? project.name : 'Unknown Project',
                projectFullName: project ? `${load.projectCode} – ${project.name}` : load.projectCode
            },
            projects
        });
    } catch (err) {
        console.error('Error retrieving load for editing:', err);
        req.flash('error_msg', 'Error retrieving load');
        res.redirect('/loads');
    }
};