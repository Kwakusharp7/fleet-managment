const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('passport');
const methodOverride = require('method-override');
const helmet = require('helmet');
const config = require('./config/config');
const { addAuthHelpers, redirectLoaderToDedicatedInterface} = require('./middleware/auth');
const { globalErrorHandler, notFoundHandler } = require('./utils/errorHandler');

// Initialize express
const app = express();

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "code.jquery.com", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "cdnjs.cloudflare.com"],
        },
    },
}));

// Body parser
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Method override
app.use(methodOverride('_method'));

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
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: config.session.duration
    }
}));

// Passport initialization
require('./config/auth');
app.use(passport.initialize());
app.use(passport.session());

// Flash messages
app.use(flash());

// Global variables and middleware
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');

    // Add path info for sidebar active state
    res.locals.path = req.path;

    next();
});

// Add authentication helpers to res.locals
app.use(addAuthHelpers);

// Routes
app.use('/', require('./routes/authRoutes'));
app.use('/dashboard', require('./routes/dashboardRoutes'));
app.use('/loads', require('./routes/loadRoutes'));
app.use('/projects', require('./routes/projectRoutes'));
app.use('/users', require('./routes/userRoutes'));
app.use('/reports', require('./routes/reportRoutes')); // Add reports routes
app.use('/settings', require('./routes/settingsRoutes')); // Add settings routes
// Apply loader redirection to dashboard routes
app.use('/dashboard', redirectLoaderToDedicatedInterface, require('./routes/dashboardRoutes'));

// Regular routes - not accessible to loaders who get redirected
app.use('/loads', redirectLoaderToDedicatedInterface, require('./routes/loadRoutes'));
app.use('/projects', redirectLoaderToDedicatedInterface, require('./routes/projectRoutes'));
app.use('/users', redirectLoaderToDedicatedInterface, require('./routes/userRoutes'));

// Loader-specific routes
app.use('/loader', require('./routes/loaderRoutes'));


// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(globalErrorHandler);

module.exports = app;