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
const { addAuthHelpers } = require('./middleware/auth');
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
 
// Session configuration

app.use(session({

    secret: config.session.secret,

    resave: false,

    saveUninitialized: false,

    store: MongoStore.create({

        mongoUrl: config.db.uri,

        ttl: 14 * 24 * 60 * 60, // 14 days

        // Add these settings for Vercel's serverless environment

        touchAfter: 24 * 3600, // time period in seconds

        autoRemove: 'native'

    }),

    cookie: {

        secure: process.env.NODE_ENV === 'production',

        httpOnly: true,

        maxAge: config.session.duration,

        // Important for Vercel deployment

        sameSite: 'lax'

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

// Set layout based on user role
app.use((req, res, next) => {
    // If user is authenticated and has loader role, set loader layout as default
    if (req.isAuthenticated() && req.user && req.user.role === 'Loader') {
        // Only set loader layout for loader routes
        if (req.path.startsWith('/loader')) {
            res.locals.layout = 'layouts/loader';
        }
    }

    // For print routes, use print layout
    if (req.path.includes('/print')) {
        res.locals.layout = 'layouts/print';
    }

    next();
});


// Routes
app.use('/', require('./routes/authRoutes'));
app.use('/dashboard', require('./routes/dashboardRoutes'));
app.use('/loads', require('./routes/loadRoutes'));
app.use('/projects', require('./routes/projectRoutes'));
app.use('/users', require('./routes/userRoutes'));
app.use('/reports', require('./routes/reportRoutes')); // Add reports routes
app.use('/settings', require('./routes/settingsRoutes')); // Add settings routes
app.use('/loader', require('./routes/loaderRoutes'));


// Add API route for loader stats
app.get('/loader/stats', async (req, res) => {
    try {
        const Load = require('./models/Load');
        const moment = require('moment');

        // Get today's date range
        const startOfToday = moment().startOf('day');
        const endOfToday = moment().endOf('day');

        // Get start of week
        const startOfWeek = moment().startOf('week');

        // Count planned loads
        const plannedLoads = await Load.countDocuments({
            status: 'Planned',
            isInventory: { $ne: true } // Exclude inventory "loads"
        });

        // Count loads loaded today
        const loadedToday = await Load.countDocuments({
            status: 'Loaded',
            updatedAt: {
                $gte: startOfToday.toDate(),
                $lte: endOfToday.toDate()
            }
        });

        // Count delivered this week
        const deliveredWeek = await Load.countDocuments({
            status: 'Delivered',
            updatedAt: {
                $gte: startOfWeek.toDate()
            }
        });

        // Count all skids added (in both inventory and loaded trucks)
        const loadCounts = await Load.aggregate([
            { $match: { createdAt: { $gte: startOfWeek.toDate() } } },
            { $group: { _id: null, totalSkids: { $sum: "$skidCount" } } }
        ]);

        const skidsAdded = loadCounts.length > 0 ? loadCounts[0].totalSkids : 0;

        // Return stats
        res.json({
            plannedLoads,
            loadedToday,
            deliveredWeek,
            skidsAdded
        });
    } catch (err) {
        console.error('Error fetching loader stats:', err);
        res.status(500).json({ error: 'Failed to fetch loader stats' });
    }
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(globalErrorHandler);

module.exports = app;