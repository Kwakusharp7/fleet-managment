/**
 * Error handling utilities
 */

/**
 * Custom error class for API errors
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Handle errors in development mode
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleDevError = (err, req, res) => {
    // API error
    if (req && (req.xhr || (req.headers && req.headers.accept && req.headers.accept.indexOf('json') > -1))) {
        return res.status(err.statusCode || 500).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    }

    // Web page error
    console.error('ERROR 💥', err);
    return res.status(err.statusCode || 500).render('error', {
        title: 'Error',
        statusCode: err.statusCode || 500,
        message: err.message,
        error: err,
        stack: err.stack
    });
};

/**
 * Handle errors in production mode
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleProdError = (err, req, res) => {
    // Operational errors (expected)
    if (err.isOperational) {
        // API error
        if (req && (req.xhr || (req.headers && req.headers.accept && req.headers.accept.indexOf('json') > -1))) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            });
        }

        // Web page error
        return res.status(err.statusCode).render('error', {
            title: 'Error',
            statusCode: err.statusCode,
            message: err.message
        });
    }

    // Programming or unknown errors (unexpected)
    console.error('ERROR 💥', err);

    // API error
    if (req && (req.xhr || (req.headers && req.headers.accept && req.headers.accept.indexOf('json') > -1))) {
        return res.status(500).json({
            status: 'error',
            message: 'Something went wrong'
        });
    }

    // Web page error
    return res.status(500).render('error', {
        title: 'Error',
        statusCode: 500,
        message: 'Something went wrong'
    });
};

/**
 * Global error handler middleware
 */
const globalErrorHandler = (err, req, res, next) => {
    // Check if req is defined
    if (!req || !res) {
        console.error('Error handler called with invalid req or res object:', err);
        return next(err);
    }

    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        handleDevError(err, req, res);
    } else {
        // Handle specific error types
        let error = { ...err };
        error.message = err.message;

        // Mongoose validation error
        if (err.name === 'ValidationError') {
            error = handleValidationError(err);
        }

        // Mongoose duplicate key error
        if (err.code === 11000) {
            error = handleDuplicateKeyError(err);
        }

        // Mongoose cast error
        if (err.name === 'CastError') {
            error = handleCastError(err);
        }

        handleProdError(error, req, res);
    }
};

/**
 * Handle Mongoose validation errors
 * @param {Error} err - Mongoose validation error
 * @returns {AppError} Custom app error
 */
const handleValidationError = (err) => {
    const errors = Object.values(err.errors).map(val => val.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

/**
 * Handle Mongoose duplicate key errors
 * @param {Error} err - Mongoose duplicate key error
 * @returns {AppError} Custom app error
 */
const handleDuplicateKeyError = (err) => {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Duplicate field value: "${value}" for field "${field}". Please use another value.`;
    return new AppError(message, 400);
};

/**
 * Handle Mongoose cast errors
 * @param {Error} err - Mongoose cast error
 * @returns {AppError} Custom app error
 */
const handleCastError = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
};

/**
 * Not found error handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFoundHandler = (req, res, next) => {
    // Check if req is defined
    if (!req || !req.originalUrl) {
        return next(new AppError('Request object is invalid', 500));
    }

    const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
    next(err);
};

module.exports = {
    AppError,
    globalErrorHandler,
    notFoundHandler
};