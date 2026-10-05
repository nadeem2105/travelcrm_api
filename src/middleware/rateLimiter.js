const rateLimit = require('express-rate-limit');
const { errorResponse } = require('../utils/response');

/**
 * Helper to build custom rate limiter handlers with uniform API response format
 */
const buildHandler = (defaultMessage) => {
    return (req, res, next, options) => {
        const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
        return errorResponse(
            res,
            options.message || defaultMessage,
            429,
            {
                code: 'TOO_MANY_REQUESTS',
                retryAfterSeconds,
                windowMinutes: Math.ceil(options.windowMs / 60000)
            }
        );
    };
};

/**
 * 1. Global API Rate Limiter
 * Applied to all /api routes to prevent DoS and excessive queries.
 * Configurable via .env:
 * - RATE_LIMIT_WINDOW_MS (default 15 minutes = 900,000 ms)
 * - RATE_LIMIT_MAX_REQUESTS (default 100 requests per 15 min per IP)
 */
const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '300', 10),
    standardHeaders: true, // Return standard `RateLimit-*` headers
    legacyHeaders: false,  // Disable `X-RateLimit-*` headers
    skip: (req) => {
        // TEMPORARY: Bypass rate limiting for packages API endpoints (/api/v1/packages, /api/packages)
        if (req.originalUrl && req.originalUrl.includes('/packages')) {
            return true;
        }
        return false;
    },
    message: 'Too many requests from this IP, please try again later.',
    handler: buildHandler('Too many requests from this IP, please try again later.')
});

/**
 * 2. Strict Authentication Rate Limiter
 * Applied to login and registration endpoints to protect against brute force attacks.
 * Configurable via .env:
 * - AUTH_RATE_LIMIT_WINDOW_MS (default 15 minutes)
 * - AUTH_RATE_LIMIT_MAX (default 10 attempts)
 */
const authLimiter = rateLimit({
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10), // 10 attempts
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many login/registration attempts from this IP. Please try again after 15 minutes.',
    handler: buildHandler('Too many login/registration attempts from this IP. Please try again after 15 minutes.')
});

/**
 * 3. Form / Submission Rate Limiter
 * Applied to public lead inquiries and booking creation to prevent spam.
 * Configurable via .env:
 * - SUBMISSION_RATE_LIMIT_WINDOW_MS (default 15 minutes)
 * - SUBMISSION_RATE_LIMIT_MAX (default 20 requests)
 */
const submissionLimiter = rateLimit({
    windowMs: parseInt(process.env.SUBMISSION_RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.SUBMISSION_RATE_LIMIT_MAX || '20', 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Submission limit reached. Please wait a few minutes before submitting another request.',
    handler: buildHandler('Submission limit reached. Please wait a few minutes before submitting another request.')
});

/**
 * Factory helper for creating custom rate limiters
 */
const createLimiter = ({
    windowMs = 15 * 60 * 1000,
    max = 50,
    message = 'Too many requests, please try again later.'
} = {}) => {
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message,
        handler: buildHandler(message)
    });
};

module.exports = {
    apiLimiter,
    authLimiter,
    submissionLimiter,
    createLimiter
};
