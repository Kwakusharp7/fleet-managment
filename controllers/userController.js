const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// @desc    Get all users
// @route   GET /users
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().sort({ username: 1 });

        res.render('user/index', {
            title: 'User Management',
            users,
            // Pass the current user from the request
            user: req.user
        });
    } catch (err) {
        console.error('Error retrieving users:', err);
        req.flash('error_msg', 'Error retrieving users');
        res.redirect('/dashboard');
    }
};

// @desc    Get user create form
// @route   GET /users/create
exports.getCreateUserForm = (req, res) => {
    res.render('user/create', {
        title: 'Create User'
    });
};

// @desc    Create a user
// @route   POST /users
exports.createUser = [
    check('username', 'Username is required').notEmpty().trim().escape(),
    check('username', 'Username must be at least 3 characters').isLength({ min: 3 }),
    check('password', 'Password is required').notEmpty(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).render('user/create', {
                title: 'Create User',
                errors: errors.array(),
                user: req.body
            });
        }

        try {
            const { username, password, role, status } = req.body;

            // Check if user exists
            const userExists = await User.findOne({ username });
            if (userExists) {
                return res.status(400).render('user/create', {
                    title: 'Create User',
                    errors: [{ msg: 'Username already exists' }],
                    user: req.body
                });
            }

            // Create user
            const newUser = new User({
                username,
                password,
                role: role || 'Viewer',
                status: status || 'Active'
            });

            await newUser.save();

            req.flash('success_msg', 'User created successfully');
            res.redirect('/users');
        } catch (err) {
            console.error('Error creating user:', err);
            req.flash('error_msg', 'Error creating user');
            res.redirect('/users/create');
        }
    }
];

// @desc    Get user edit form
// @route   GET /users/:id/edit
exports.getEditUserForm = async (req, res) => {
    try {
        const userToEdit = await User.findById(req.params.id);

        if (!userToEdit) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/users');
        }

        res.render('user/edit', {
            title: 'Edit User',
            currentUser: req.user,  // Pass the logged-in user as currentUser
            user: userToEdit        // Pass the user being edited as user
        });
    } catch (err) {
        console.error('Error retrieving user:', err);
        req.flash('error_msg', 'Error retrieving user');
        res.redirect('/users');
    }
};

// @desc    Update a user
// @route   PUT /users/:id
exports.updateUser = [
    check('username', 'Username is required').notEmpty().trim().escape(),
    check('username', 'Username must be at least 3 characters').isLength({ min: 3 }),
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).render('user/edit', {
                title: 'Edit User',
                errors: errors.array(),
                user: req.user,
                userToEdit: {
                    ...req.body,
                    _id: req.params.id
                }
            });
        }

        try {
            const { username, password, role, status } = req.body;

            // Find the user
            const userToUpdate = await User.findById(req.params.id);

            if (!userToUpdate) {
                req.flash('error_msg', 'User not found');
                return res.redirect('/users');
            }

            // Check if username is taken by another user
            if (username !== userToUpdate.username) {
                const usernameExists = await User.findOne({ username });
                if (usernameExists) {
                    return res.status(400).render('user/edit', {
                        title: 'Edit User',
                        errors: [{ msg: 'Username already exists' }],
                        user: req.user,
                        userToEdit: {
                            ...req.body,
                            _id: req.params.id
                        }
                    });
                }
            }

            // Prevent user from changing their own role or status
            if (req.user.id.toString() === userToUpdate._id.toString() && req.user.role === 'Admin') {
                userToUpdate.username = username;
                // Allow user to change their password but not role/status
                if (password && password.trim() !== '') {
                    userToUpdate.password = password;
                }
            } else {
                // Regular update
                userToUpdate.username = username;
                userToUpdate.role = role;
                userToUpdate.status = status;

                // Update password only if provided
                if (password && password.trim() !== '') {
                    userToUpdate.password = password;
                }
            }

            await userToUpdate.save();

            req.flash('success_msg', 'User updated successfully');
            res.redirect('/users');
        } catch (err) {
            console.error('Error updating user:', err);
            req.flash('error_msg', 'Error updating user');
            res.redirect(`/users/${req.params.id}/edit`);
        }
    }
];

// @desc    Delete a user
// @route   DELETE /users/:id
exports.deleteUser = async (req, res) => {
    try {
        const userToDelete = await User.findById(req.params.id);

        if (!userToDelete) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/users');
        }

        // Prevent deleting current user
        if (req.user.id.toString() === userToDelete._id.toString()) {
            req.flash('error_msg', 'You cannot delete your own account');
            return res.redirect('/users');
        }

        // Prevent deleting admin account if last admin
        if (userToDelete.role === 'Admin') {
            const adminCount = await User.countDocuments({ role: 'Admin' });
            if (adminCount <= 1) {
                req.flash('error_msg', 'Cannot delete the last admin account');
                return res.redirect('/users');
            }
        }

        await User.deleteOne({ _id: userToDelete._id });

        req.flash('success_msg', 'User deleted successfully');
        res.redirect('/users');
    } catch (err) {
        console.error('Error deleting user:', err);
        req.flash('error_msg', 'Error deleting user');
        res.redirect('/users');
    }
};