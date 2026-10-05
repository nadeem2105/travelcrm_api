const { errorResponse } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

    if (err.type === 'entity.parse.failed') {
        return errorResponse(res, 'Malformed JSON payload provided', 400);
    }

    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Internal server error occurred'
        : err.message || 'Internal server error';

    return errorResponse(res, message, statusCode, err.errors || null);
};

const notFoundHandler = (req, res) => {
    return errorResponse(res, `API route '${req.originalUrl}' not found on this server`, 404);
};

module.exports = {
    errorHandler,
    notFoundHandler
};
