// Authentication middleware functions

/**
 * Ensure user is authenticated
 * If not, redirect to login page
 */
exports.ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }

    // Store the requested URL to redirect after login
    if (req && req.session) {
        req.session.returnTo = req.originalUrl;
    }

    // Flash message
    req.flash('error_msg', 'Please log in to access this page');
    res.redirect('/login');
};

/**
 * Ensure user has admin role
 * If not, redirect to dashboard
 */
exports.ensureAdmin = (req, res, next) => {
    if (req && req.isAuthenticated && req.isAuthenticated() && req.user && req.user.role === 'Admin') {
        return next();
    }

    // Flash message
    if (req && req.flash) {
        req.flash('error_msg', 'You must have admin privileges to access this page');
    }
    res.redirect('/dashboard');
};

/**
 * Check if user is authenticated
 * Can be used for conditionally showing elements in templates
 */
exports.isAuthenticated = (req) => {
    return req && req.isAuthenticated && req.isAuthenticated();
};

/**
 * Check if user has admin role
 * Can be used for conditionally showing elements in templates
 */
exports.isAdmin = (req) => {
    return req && req.isAuthenticated && req.isAuthenticated() && req.user && req.user.role === 'Admin';
};

/**
 * Ensure user has loader role
 */
exports.ensureLoader = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'Loader') {
        return next();
    }

    req.flash('error_msg', 'You must have loader privileges to access this page');
    res.redirect('/');
};

/**
 * Redirect non-loader users to dashboard and loader users to loader interface
 */
exports.redirectLoaderToDedicatedInterface = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'Loader') {
        return res.redirect('/loader');
    }
    next();
};

/**
 * Check if user has loader role
 */
exports.isLoader = (req) => {
    return req.isAuthenticated() && req.user.role === 'Loader';
};

/**
 * Middleware to add authentication helpers to res.locals
 * Makes them available in templates
 */
exports.addAuthHelpers = (req, res, next) => {
    if (req && res) {
        res.locals.isAuthenticated = req.isAuthenticated ? req.isAuthenticated() : false;
        res.locals.isAdmin = req.isAuthenticated && req.isAuthenticated() && req.user && req.user.role === 'Admin';
        res.locals.isLoader = req.isAuthenticated() && req.user.role === 'Loader';
        res.locals.user = req.user || null;
    }
    next();
};