const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Local strategy for email/password authentication
passport.use(
    new LocalStrategy({ usernameField: 'username' }, async (username, password, done) => {
        try {
            // Find user by username
            const user = await User.findOne({ username });

            // If user not found
            if (!user) {
                return done(null, false, { message: 'Invalid username or password' });
            }

            // Check if user is active
            if (user.status !== 'Active') {
                return done(null, false, { message: 'Your account is inactive. Please contact an administrator.' });
            }

            // Check password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return done(null, false, { message: 'Invalid username or password' });
            }

            // Update last login time
            user.lastLogin = new Date();
            await user.save();

            // Return user
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    })
);

// Serialize user to session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// Authentication middleware
exports.ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please log in to access this page');
    res.redirect('/login');
};

// Admin role middleware
exports.ensureAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'Admin') {
        return next();
    }
    req.flash('error_msg', 'You must have admin privileges to access this page');
    res.redirect('/dashboard');
};

module.exports = passport;