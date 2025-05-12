const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('passport');
const helmet = require('helmet');
const config = require('./config/config');
const { addAuthHelpers } = require('./middleware/auth');
const { globalErrorHandler, notFoundHandler } = require('./utils/errorHandler');

// Initialize express
const app = express();

// Debugging middleware to log requests
app.use((req, res, next) => {
  console.log('<<< Request Received:', { // Changed marker for clarity
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl, // Use originalUrl to see the full path
    params: req.params,
    query: req.query,
    body: req.body,
    ip: req.ip
  });
  next();
});

// Check if method-override is properly installed
try {
  const methodOverride = require('method-override');
  console.log('Method override is available');
  // Configure method-override
  app.use(methodOverride('_method'));
} catch (err) {
  console.error('Method override is NOT available, install it with: npm install method-override');
  // Optionally exit if it's critical
  // process.exit(1);
}

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            // Allow scripts from self, inline, and specific CDNs
            scriptSrc: ["'self'", "'unsafe-inline'", "code.jquery.com", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
             // Allow styles from self, inline, and specific CDNs
            styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"],
             // Allow images from self and data URIs (for signatures)
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"], // Allow connections to self (for fetch/XHR)
            fontSrc: ["'self'", "cdnjs.cloudflare.com"], // Allow fonts from self and CDNs
            // Ensure frame ancestors is properly set if needed (e.g., 'none' or specific domains)
            // frameAncestors: ["'none'"],
        },
    },
    // Add other helmet configurations if needed, e.g., HSTS
    // hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));


// Body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Set up EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

// Session configuration
app.use(session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: config.db.uri,
        ttl: 14 * 24 * 60 * 60, // 14 days
        touchAfter: 24 * 3600, // time period in seconds
        autoRemove: 'native'
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Should be true in production
        httpOnly: true, // Helps prevent XSS
        maxAge: config.session.duration,
        sameSite: 'lax' // Good default for CSRF protection
    }
}));

// Passport initialization
require('./config/auth'); // Ensure your passport config is loaded
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());

// Global variables and middleware
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error'); // Passport login errors often use 'error'

    // Add user to locals if authenticated
    res.locals.currentUser = req.user || null;

    // Add path info for sidebar active state
    res.locals.path = req.path;

    next();
});

// Add authentication helpers to res.locals
app.use(addAuthHelpers);

// Set layout based on user role (Consider refactoring this into middleware if complex)
app.use((req, res, next) => {
    let layout = 'layouts/main'; // Default layout

    if (req.isAuthenticated() && req.user) {
        if (req.user.role === 'Loader' && req.path.startsWith('/loader')) {
            layout = 'layouts/loader';
        }
        // Add other role/path conditions if needed
    }

    // Override layout for print views
    if (req.path.includes('/print')) {
        layout = 'layouts/print';
    }

    res.locals.layout = layout; // Set the determined layout
    console.log(`--- Layout set to: ${layout} for path: ${req.path} ---`); // Log layout decision
    next();
});


// --- Routes ---
console.log('>>> Mounting Application Routes...');
app.use('/', require('./routes/authRoutes')); // Auth routes first
app.use('/dashboard', require('./routes/dashboardRoutes'));
app.use('/loads', require('./routes/loadRoutes'));
app.use('/projects', require('./routes/projectRoutes'));
app.use('/users', require('./routes/userRoutes'));
app.use('/reports', require('./routes/reportRoutes'));
app.use('/settings', require('./routes/settingsRoutes'));

console.log('>>> Mounting /loader routes...'); // Log before mounting loader routes
app.use('/loader', require('./routes/loaderRoutes')); // Mount loader routes
console.log('>>> Finished mounting /loader routes.');

// --- REMOVED Duplicate /loader/stats route from here ---
// It's handled by loaderRoutes.js and loaderController.js

// --- Error Handling ---
// 404 handler (should be after all valid routes)
console.log('>>> Mounting 404 Handler...');
app.use(notFoundHandler);

// Global Error handler (should be last)
console.log('>>> Mounting Global Error Handler...');
app.use(globalErrorHandler);

module.exports = app;