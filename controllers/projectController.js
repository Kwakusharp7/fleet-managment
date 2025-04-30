const { check, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Load = require('../models/Load');

// @desc    Get all projects
// @route   GET /projects
exports.getProjects = async (req, res) => {
    try {
        console.log('Loading project management page...');
        const projects = await Project.find().sort({ code: 1 });

        res.render('project/index', {
            title: 'Project Management',
            projects
        });
    } catch (err) {
        console.error('Error retrieving projects:', err);
        req.flash('error_msg', 'Error retrieving projects');
        res.redirect('/dashboard');
    }
};

// @desc    Get project create form
// @route   GET /projects/create
exports.getCreateProjectForm = (req, res) => {
    res.render('project/create', {
        title: 'Create Project'
    });
};

// @desc    Create a project
// @route   POST /projects
exports.createProject = [
    check('code', 'Project code is required').notEmpty().trim().escape(),
    check('name', 'Project name is required').notEmpty().trim().escape(),
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).render('project/create', {
                title: 'Create Project',
                errors: errors.array(),
                project: req.body
            });
        }

        try {
            const { code, name, status, address, description } = req.body;

            // Check if project code exists
            const projectExists = await Project.findOne({ code });
            if (projectExists) {
                return res.status(400).render('project/create', {
                    title: 'Create Project',
                    errors: [{ msg: 'Project code already exists' }],
                    project: req.body
                });
            }

            // Create project
            const newProject = new Project({
                code,
                name,
                status: status || 'Active',
                address,
                description,
                createdBy: req.user.id
            });

            await newProject.save();

            req.flash('success_msg', 'Project created successfully');
            res.redirect('/projects');
        } catch (err) {
            console.error('Error creating project:', err);
            req.flash('error_msg', 'Error creating project');
            res.redirect('/projects/create');
        }
    }
];

// @desc    Get project edit form
// @route   GET /projects/:id/edit
exports.getEditProjectForm = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            req.flash('error_msg', 'Project not found');
            return res.redirect('/projects');
        }

        res.render('project/edit', {
            title: 'Edit Project',
            project
        });
    } catch (err) {
        console.error('Error retrieving project:', err);
        req.flash('error_msg', 'Error retrieving project');
        res.redirect('/projects');
    }
};

// @desc    Update a project
// @route   PUT /projects/:id
exports.updateProject = [
    check('code', 'Project code is required').notEmpty().trim().escape(),
    check('name', 'Project name is required').notEmpty().trim().escape(),
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).render('project/edit', {
                title: 'Edit Project',
                errors: errors.array(),
                project: {
                    ...req.body,
                    _id: req.params.id
                }
            });
        }

        try {
            const { code, name, status, address, description } = req.body;

            // Find the project
            const project = await Project.findById(req.params.id);

            if (!project) {
                req.flash('error_msg', 'Project not found');
                return res.redirect('/projects');
            }

            // Check if code exists on another project
            if (code !== project.code) {
                const codeExists = await Project.findOne({ code });
                if (codeExists) {
                    return res.status(400).render('project/edit', {
                        title: 'Edit Project',
                        errors: [{ msg: 'Project code already exists' }],
                        project: {
                            ...req.body,
                            _id: req.params.id
                        }
                    });
                }

                // If changing code, update all related loads
                if (project.code !== code) {
                    await Load.updateMany({ projectCode: project.code }, { projectCode: code });
                }
            }

            // Update project
            project.code = code;
            project.name = name;
            project.status = status;
            project.address = address;
            project.description = description;

            await project.save();

            req.flash('success_msg', 'Project updated successfully');
            res.redirect('/projects');
        } catch (err) {
            console.error('Error updating project:', err);
            req.flash('error_msg', 'Error updating project');
            res.redirect(`/projects/${req.params.id}/edit`);
        }
    }
];

// @desc    Delete a project
// @route   DELETE /projects/:id
exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            req.flash('error_msg', 'Project not found');
            return res.redirect('/projects');
        }

        // Check if project is used in any loads
        const loadCount = await Load.countDocuments({ projectCode: project.code });

        if (loadCount > 0) {
            req.flash('error_msg', `Cannot delete project "${project.name}" because it is used in ${loadCount} loads`);
            return res.redirect('/projects');
        }

        // Delete project
        await project.deleteOne();

        req.flash('success_msg', 'Project deleted successfully');
        res.redirect('/projects');
    } catch (err) {
        console.error('Error deleting project:', err);
        req.flash('error_msg', 'Error deleting project');
        res.redirect('/projects');
    }
};

// @desc    Get all projects as JSON (for API)
// @route   GET /projects/api
exports.getProjectsApi = async (req, res) => {
    try {
        const projects = await Project.find({ status: 'Active' }).sort({ code: 1 });

        // Map to simpler format for select dropdown
        const projectsFormatted = projects.map(project => ({
            id: project.code,
            text: `${project.code} – ${project.name}`
        }));

        res.json(projectsFormatted);
    } catch (err) {
        console.error('Error retrieving projects for API:', err);
        res.status(500).json({ error: 'Error retrieving projects' });
    }
};