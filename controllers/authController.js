const passport = require('passport');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');

// @desc    Get login page
exports.getLoginPage = (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    res.render('auth/login', {
        title: 'Login',
        layout: 'layouts/auth'
    });
};

// @desc    Process login
exports.login = [
    check('username', 'Username is required').notEmpty(),
    check('password', 'Password is required').notEmpty(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('auth/login', {
                title: 'Login',
                layout: 'layouts/auth',
                errors: errors.array(),
                username: req.body.username
            });
        }

        passport.authenticate('local', (err, user, info) => {
            if (err) { return next(err); }

            if (!user) {
                req.flash('error_msg', info.message || 'Invalid credentials');
                return res.redirect('/login');
            }

            req.logIn(user, (err) => {
                if (err) { return next(err); }

                // Redirect based on user role
                if (user.role === 'Loader') {
                    return res.redirect('/loader');
                }

                // Redirect to original requested URL or dashboard
                const returnTo = req.session.returnTo || '/dashboard';
                delete req.session.returnTo;
                return res.redirect(returnTo);
            });
        })(req, res, next);
    }
];

// @desc    Logout user
exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.flash('success_msg', 'You have been logged out');
        res.redirect('/login');
    });
};

// @desc    Get register page
exports.getRegisterPage = async (req, res) => {
    try {
        const userCount = await User.countDocuments();

        // If users exist, require authentication
        if (userCount > 0) {
            if (!req.isAuthenticated() || req.user.role !== 'Admin') {
                req.flash('error_msg', 'You must be an admin to register new users');
                return res.redirect('/login');
            }
        }

        res.render('auth/register', {
            title: 'Register New User',
            layout: userCount > 0 ? 'layouts/main' : 'layouts/auth'
        });
    } catch (err) {
        req.flash('error_msg', 'Server error');
        res.redirect('/login');
    }
};

// @desc    Register a user
exports.register = [
    check('username', 'Username is required').notEmpty().trim().escape(),
    check('username', 'Username must be at least 3 characters').isLength({ min: 3 }),
    check('password', 'Password is required').notEmpty(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    check('password2', 'Passwords do not match').custom((value, { req }) => value === req.body.password),
    async (req, res) => {
        const errors = validationResult(req);
        const { username, password, role } = req.body;

        if (!errors.isEmpty()) {
            return res.status(400).render('auth/register', {
                title: 'Register New User',
                layout: 'layouts/auth',
                errors: errors.array(),
                username,
                role
            });
        }

        try {
            const userCount = await User.countDocuments();

            // If users exist, require authentication
            if (userCount > 0) {
                if (!req.isAuthenticated() || req.user.role !== 'Admin') {
                    req.flash('error_msg', 'You must be an admin to register new users');
                    return res.redirect('/login');
                }
            }

            // Check if user exists
            const userExists = await User.findOne({ username });
            if (userExists) {
                return res.status(400).render('auth/register', {
                    title: 'Register New User',
                    layout: userCount > 0 ? 'layouts/main' : 'layouts/auth',
                    errors: [{ msg: 'Username already exists' }],
                    username,
                    role
                });
            }

            // Create new user
            const newUser = new User({
                username,
                password,
                role: role || 'Viewer', // Default to Viewer if not specified
                status: 'Active'
            });

            // Make first user an admin
            if (userCount === 0) {
                newUser.role = 'Admin';
            }

            // Save user to database
            await newUser.save();

            req.flash('success_msg', 'User registered successfully');

            // Redirect to appropriate page
            if (req.isAuthenticated()) {
                res.redirect('/users');
            } else {
                res.redirect('/login');
            }
        } catch (err) {
            console.error(err);
            req.flash('error_msg', 'Error registering user');
            res.redirect('/register');
        }
    }
];