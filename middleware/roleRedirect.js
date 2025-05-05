/**
 * Role-specific redirect middleware
 * Redirects users to appropriate dashboard based on their role
 */

/**
 * Redirect to appropriate dashboard based on user role
 */
exports.redirectToDashboard = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    // If no role or path is root (/)
    if (!req.user || !req.user.role || req.path === '/') {
        if (req.user && req.user.role === 'Loader') {
            return res.redirect('/loader');
        }
        return next();
    }

    // If already on correct path for role, continue
    if (req.user.role === 'Loader' && req.path.startsWith('/loader')) {
        return next();
    }

    // Redirect Loader users to loader dashboard for all non-loader paths
    // except for specific paths like logout, settings, etc.
    if (req.user.role === 'Loader' &&
        !req.path.startsWith('/loader') &&
        !req.path.startsWith('/logout') &&
        !req.path.startsWith('/settings') &&
        !req.path.startsWith('/assets') &&
        !req.path.startsWith('/css') &&
        !req.path.startsWith('/js') &&
        !req.path.startsWith('/img')) {
        return res.redirect('/loader');
    }

    // All other roles continue normally
    next();
};

/**
 * Handle first login - redirect based on role
 */
exports.handleFirstLogin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    }

    // After login, redirect based on role
    if (req.path === '/login' || req.path === '/') {
        if (req.user.role === 'Loader') {
            return res.redirect('/loader');
        } else {
            return res.redirect('/dashboard');
        }
    }

    next();
};

/**
 * Add role-specific class to body based on user role
 */
exports.addRoleClass = (req, res, next) => {
    if (req.isAuthenticated() && req.user && req.user.role) {
        res.locals.userRoleClass = `role-${req.user.role.toLowerCase()}`;
    } else {
        res.locals.userRoleClass = 'role-guest';
    }

    next();
};