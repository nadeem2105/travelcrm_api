const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

// Helper to compare Laravel bcrypt ($2y$) hashes with bcryptjs ($2a$)
const comparePassword = async (plainPassword, hashedPassword) => {
    if (!hashedPassword) return false;
    // Replace $2y$ prefix with $2a$ for full bcryptjs compatibility
    const normalizedHash = hashedPassword.replace(/^\$2y\$/, '$2a$');
    return await bcrypt.compare(plainPassword, normalizedHash);
};

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        process.env.JWT_SECRET || 'travelcrm_super_secret_jwt_key_2026_secure',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

/**
 * Register a new customer
 */
const register = async (req, res, next) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return errorResponse(res, 'Name, email, and password are required', 422);
        }

        if (password.length < 6) {
            return errorResponse(res, 'Password must be at least 6 characters long', 422);
        }

        // Check if email already registered
        const [existing] = await db.query(
            'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1',
            [email.toLowerCase().trim()]
        );

        if (existing.length > 0) {
            return errorResponse(res, 'An account with this email already exists', 409);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await db.query(
            `INSERT INTO users (name, email, password, phone, is_active, created_at, updated_at) 
             VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
            [name.trim(), email.toLowerCase().trim(), hashedPassword, phone ? phone.trim() : null]
        );

        const newUser = {
            id: result.insertId,
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone ? phone.trim() : null
        };

        const token = generateToken(newUser);

        return successResponse(res, { user: newUser, token }, 'Registration successful', 201);
    } catch (err) {
        next(err);
    }
};

/**
 * User login
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return errorResponse(res, 'Email and password are required', 422);
        }

        const [rows] = await db.query(
            `SELECT id, name, email, phone, avatar, password, is_active 
             FROM users 
             WHERE email = ? AND deleted_at IS NULL 
             LIMIT 1`,
            [email.toLowerCase().trim()]
        );

        if (rows.length === 0) {
            return errorResponse(res, 'Invalid email or password credentials', 401);
        }

        const user = rows[0];

        if (!user.is_active) {
            return errorResponse(res, 'Your account is deactivated. Please contact support.', 403);
        }

        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return errorResponse(res, 'Invalid email or password credentials', 401);
        }

        const token = generateToken(user);

        delete user.password;

        return successResponse(res, { user, token }, 'Login successful');
    } catch (err) {
        next(err);
    }
};

/**
 * Get profile for authenticated user
 */
const getProfile = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT id, name, email, phone, avatar, dob, gender, city, address, created_at 
             FROM users 
             WHERE id = ? LIMIT 1`,
            [req.user.id]
        );

        if (rows.length === 0) {
            return errorResponse(res, 'User not found', 404);
        }

        return successResponse(res, rows[0], 'Profile retrieved successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * Update authenticated user's profile
 */
const updateProfile = async (req, res, next) => {
    try {
        const { name, phone, dob, gender, city, address } = req.body;

        await db.query(
            `UPDATE users 
             SET name = COALESCE(?, name),
                 phone = COALESCE(?, phone),
                 dob = COALESCE(?, dob),
                 gender = COALESCE(?, gender),
                 city = COALESCE(?, city),
                 address = COALESCE(?, address),
                 updated_at = NOW()
             WHERE id = ?`,
            [name || null, phone || null, dob || null, gender || null, city || null, address || null, req.user.id]
        );

        const [rows] = await db.query(
            `SELECT id, name, email, phone, avatar, dob, gender, city, address 
             FROM users 
             WHERE id = ? LIMIT 1`,
            [req.user.id]
        );

        return successResponse(res, rows[0], 'Profile updated successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * Change password
 */
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return errorResponse(res, 'Current password and new password are required', 422);
        }

        if (newPassword.length < 6) {
            return errorResponse(res, 'New password must be at least 6 characters long', 422);
        }

        const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) {
            return errorResponse(res, 'User not found', 404);
        }

        const isMatch = await comparePassword(currentPassword, rows[0].password);
        if (!isMatch) {
            return errorResponse(res, 'Incorrect current password', 400);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [
            hashedPassword,
            req.user.id
        ]);

        return successResponse(res, null, 'Password changed successfully');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword
};
