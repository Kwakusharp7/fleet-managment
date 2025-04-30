const { check, validationResult } = require('express-validator');

// Common validation chains

// User validation
exports.validateUser = [
    check('username')
        .notEmpty().withMessage('Username is required')
        .trim()
        .escape()
        .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long')
        .isLength({ max: 30 }).withMessage('Username cannot exceed 30 characters'),

    check('password')
        .if((value, { req }) => {
            // Only validate password if it's provided or if it's a new user (no ID)
            return value || !req.params.id;
        })
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

// Project validation
exports.validateProject = [
    check('code')
        .notEmpty().withMessage('Project code is required')
        .trim()
        .escape()
        .isLength({ max: 20 }).withMessage('Project code cannot exceed 20 characters'),

    check('name')
        .notEmpty().withMessage('Project name is required')
        .trim()
        .escape()
        .isLength({ max: 100 }).withMessage('Project name cannot exceed 100 characters'),

    check('address')
        .optional()
        .trim()
        .escape()
        .isLength({ max: 200 }).withMessage('Address cannot exceed 200 characters'),

    check('description')
        .optional()
        .trim()
        .escape()
        .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
];

// Truck info validation
exports.validateTruckInfo = [
    check('truckId')
        .notEmpty().withMessage('Truck ID is required')
        .trim()
        .escape()
        .isLength({ max: 50 }).withMessage('Truck ID cannot exceed 50 characters'),

    check('projectCode')
        .notEmpty().withMessage('Project is required')
        .trim()
        .escape(),

    check('length')
        .notEmpty().withMessage('Length is required')
        .isFloat({ min: 1 }).withMessage('Length must be greater than 0'),

    check('width')
        .notEmpty().withMessage('Width is required')
        .isFloat({ min: 1 }).withMessage('Width must be greater than 0'),

    check('weight')
        .notEmpty().withMessage('Weight capacity is required')
        .isFloat({ min: 1000 }).withMessage('Weight capacity must be at least 1000 lbs')
];

// Skid validation (can be used for individual skid validation)
exports.validateSkid = [
    check('width')
        .notEmpty().withMessage('Width is required')
        .isFloat({ min: 0.1 }).withMessage('Width must be greater than 0.1'),

    check('length')
        .notEmpty().withMessage('Length is required')
        .isFloat({ min: 0.1 }).withMessage('Length must be greater than 0.1'),

    check('weight')
        .notEmpty().withMessage('Weight is required')
        .isFloat({ min: 1 }).withMessage('Weight must be greater than 0'),

    check('description')
        .optional()
        .trim()
        .escape()
        .isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters')
];

// Packing List validation
exports.validatePackingList = [
    check('packingList.workOrder')
        .optional()
        .trim()
        .escape(),

    check('packingList.projectName')
        .optional()
        .trim()
        .escape(),

    check('packingList.projectAddress')
        .optional()
        .trim()
        .escape(),

    check('packingList.requestedBy')
        .optional()
        .trim()
        .escape(),

    check('packingList.carrier')
        .optional()
        .trim()
        .escape(),

    check('packingList.consignee')
        .optional()
        .trim()
        .escape(),

    check('packingList.consigneeAddress')
        .optional()
        .trim()
        .escape(),

    check('packingList.siteContact')
        .optional()
        .trim()
        .escape(),

    check('packingList.sitePhone')
        .optional()
        .trim()
        .escape(),

    check('packingList.packagedBy')
        .optional()
        .trim()
        .escape(),

    check('packingList.checkedBy')
        .optional()
        .trim()
        .escape(),

    check('packingList.receivedBy')
        .optional()
        .trim()
        .escape()
];

// Helper function to handle validation errors
exports.handleValidationErrors = (req, res, viewTemplate, additionalData = {}) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).render(viewTemplate, {
            ...additionalData,
            errors: errors.array(),
            formData: req.body
        });
    }

    return null;
};