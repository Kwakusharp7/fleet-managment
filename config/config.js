// General application configuration
require('dotenv').config();

module.exports = {
    // Application settings
    app: {
        name: process.env.APP_NAME || 'Fleet Management System',
        companyName: process.env.COMPANY_NAME || 'Desa Systems',
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000
    },

    // MongoDB settings
    db: {
        uri: process.env.MONGO_URI || 'mongodb://localhost:27017/fleet_management'
    },

    // Session settings
    session: {
        secret: process.env.SESSION_SECRET || 'keyboard cat',
        duration: 14 * 24 * 60 * 60 * 1000, // 14 days in milliseconds
        activeDuration: 1000 * 60 * 5 // 5 minutes
    },

    // Upload settings
    uploads: {
        maxSize: 5 * 1024 * 1024, // 5MB in bytes
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    },

    // Date format settings
    dateFormat: {
        long: 'YYYY-MM-DD HH:mm',
        short: 'YYYY-MM-DD',
        input: 'YYYY-MM-DD'
    },

    // Status options
    statusOptions: {
        loads: ['Planned', 'Loaded', 'Delivered'],
        projects: ['Active', 'Inactive'],
        users: ['Active', 'Inactive']
    },

    // Default pagination settings
    pagination: {
        perPage: 10,
        maxPerPage: 100
    },

    // Weight units (for future localization)
    weightUnit: 'lbs',

    // Dimension units (for future localization)
    dimensionUnit: 'ft'
};