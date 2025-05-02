const express = require('express');
const router = express.Router();
const passport = require('passport');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const authController = require('../controllers/authController');
const { ensureAuthenticated } = require('../middleware/auth');
const { redirectToDashboard, handleFirstLogin } = require('../middleware/roleRedirect');

// Apply role-specific redirect middleware
router.use(handleFirstLogin);

// @route   GET /
// @desc    Redirect to login or appropriate dashboard
// @access  Public
router.get('/', redirectToDashboard, (req, res) => {
    if (req.isAuthenticated()) {
        // Default redirect based on role is handled in redirectToDashboard middleware
        return res.redirect('/dashboard');
    }
    res.redirect('/login');
});

// @route   GET /login
// @desc    Render login page
// @access  Public
router.get('/login', authController.getLoginPage);

// @route   POST /login
// @desc    Process login
// @access  Public
router.post('/login', authController.login);

// @route   GET /logout
// @desc    Process logout
// @access  Private
router.get('/logout', ensureAuthenticated, authController.logout);

// @route   GET /register
// @desc    Render registration page (Admin only in production)
// @access  Public (for initial setup), then Admin only
router.get('/register', authController.getRegisterPage);

// @route   POST /register
// @desc    Register a new user
// @access  Public (for initial setup), then Admin only
router.post('/register', authController.register);

module.exports = router;