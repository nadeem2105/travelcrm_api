const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { errorResponse } = require('../utils/response');

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return errorResponse(res, 'Authentication token missing or invalid', 401);
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'travelcrm_super_secret_jwt_key_2026_secure');

        // Check if user exists in database
        const [rows] = await db.query(
            'SELECT id, name, email, phone, avatar, is_active FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1',
            [decoded.id]
        );

        if (!rows || rows.length === 0) {
            return errorResponse(res, 'User account no longer exists or has been deactivated', 401);
        }

        if (!rows[0].is_active) {
            return errorResponse(res, 'Your user account is inactive', 403);
        }

        req.user = rows[0];
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return errorResponse(res, 'Authentication token has expired', 401);
        }
        return errorResponse(res, 'Invalid authentication token', 401);
    }
};

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'travelcrm_super_secret_jwt_key_2026_secure');
            const [rows] = await db.query(
                'SELECT id, name, email, phone, avatar, is_active FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1',
                [decoded.id]
            );
            if (rows && rows.length > 0 && rows[0].is_active) {
                req.user = rows[0];
            }
        }
    } catch (err) {
        // Optional auth does not fail if invalid
    }
    next();
};

module.exports = {
    verifyToken,
    optionalAuth
};
