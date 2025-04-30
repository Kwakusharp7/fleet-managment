const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(ensureAuthenticated);
router.use(ensureAdmin);

// @route   GET /users
// @desc    Get all users
// @access  Admin
router.get('/', userController.getUsers);

// @route   GET /users/create
// @desc    Get user create form
// @access  Admin
router.get('/create', userController.getCreateUserForm);

// @route   POST /users
// @desc    Create a new user
// @access  Admin
router.post('/', userController.createUser);

// @route   GET /users/:id/edit
// @desc    Get user edit form
// @access  Admin
router.get('/:id/edit', userController.getEditUserForm);

// @route   PUT /users/:id
// @desc    Update a user
// @access  Admin
router.put('/:id', userController.updateUser);

// @route   DELETE /users/:id
// @desc    Delete a user
// @access  Admin
router.delete('/:id', userController.deleteUser);

module.exports = router;