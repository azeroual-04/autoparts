/**
 * Error Handling Middleware
 * Centralized error handling for the API
 */

/**
 * Custom API Error class
 */
class ApiError extends Error {
    constructor(statusCode, message, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Not Found handler for undefined routes
 */
const notFound = (req, res, next) => {
    const error = new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`);
    next(error);
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // PostgreSQL specific errors
    if (err.code) {
        switch (err.code) {
            case '23505': // Unique violation
                statusCode = 409;
                message = 'Resource already exists';
                break;
            case '23503': // Foreign key violation
                statusCode = 400;
                message = 'Referenced resource does not exist';
                break;
            case '22P02': // Invalid text representation (invalid UUID)
                statusCode = 400;
                message = 'Invalid ID format';
                break;
            case 'ECONNREFUSED':
                statusCode = 503;
                message = 'Database connection refused';
                break;
        }
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
        console.error('❌ Error:', {
            message: err.message,
            code: err.code,
            stack: err.stack
        });
    }

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            details: err.details
        })
    });
};

/**
 * Async handler wrapper to catch async errors
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    ApiError,
    notFound,
    errorHandler,
    asyncHandler
};
