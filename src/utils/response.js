/**
 * Standardized API response formatters
 */

const successResponse = (res, data = null, message = 'Operation successful', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

const errorResponse = (res, message = 'An error occurred', statusCode = 400, errors = null) => {
    const response = {
        success: false,
        message
    };

    if (errors) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
};

const paginationResponse = (res, data = [], pagination = {}, message = 'Data retrieved successfully') => {
    return res.status(200).json({
        success: true,
        message,
        data,
        pagination: {
            page: Number(pagination.page) || 1,
            limit: Number(pagination.limit) || 10,
            totalItems: Number(pagination.total) || 0,
            totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10))
        }
    });
};

module.exports = {
    successResponse,
    errorResponse,
    paginationResponse
};
