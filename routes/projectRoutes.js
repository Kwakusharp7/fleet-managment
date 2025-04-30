const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);

// @route   GET /projects
// @desc    Get all projects
// @access  Private
router.get('/', projectController.getProjects);

// @route   GET /projects/api
// @desc    Get all projects for API
// @access  Private
router.get('/api', projectController.getProjectsApi);

// --- Admin Only Routes ---
// All routes below require admin permissions

// @route   GET /projects/create
// @desc    Get project create form
// @access  Admin
router.get('/create', ensureAdmin, projectController.getCreateProjectForm);

// @route   POST /projects
// @desc    Create a new project
// @access  Admin
router.post('/', ensureAdmin, projectController.createProject);

// @route   GET /projects/:id/edit
// @desc    Get project edit form
// @access  Admin
router.get('/:id/edit', ensureAdmin, projectController.getEditProjectForm);

// @route   PUT /projects/:id
// @desc    Update a project
// @access  Admin
router.put('/:id', ensureAdmin, projectController.updateProject);

// @route   DELETE /projects/:id
// @desc    Delete a project
// @access  Admin
router.delete('/:id', ensureAdmin, projectController.deleteProject);

module.exports = router;