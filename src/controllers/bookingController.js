const crypto = require('crypto');
const db = require('../config/db');
const { successResponse, errorResponse, paginationResponse } = require('../utils/response');

const generateBookingRef = () => {
    return 'BK-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
};

/**
 * Create a new booking
 */
const createBooking = async (req, res, next) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const {
            product_type,
            product_id,
            total_amount,
            subtotal,
            tax_amount,
            discount_amount,
            contact, // { name, email, phone }
            travellers = [],
            notes
        } = req.body;

        if (!product_type || !total_amount || !contact || !contact.name || !contact.phone) {
            return errorResponse(res, 'Product type, total amount, contact name and phone are required', 422);
        }

        const bookingRef = generateBookingRef();
        const userId = req.user ? req.user.id : null;

        const [bookingResult] = await connection.query(
            `INSERT INTO bookings (
                booking_reference, user_id, product_type, product_id,
                status, cancellation_status, refund_status,
                subtotal, tax_amount, discount_amount, total_amount, currency,
                contact, notes, booked_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'pending', 'none', 'none', ?, ?, ?, ?, 'INR', ?, ?, NOW(), NOW(), NOW())`,
            [
                bookingRef,
                userId,
                product_type,
                product_id || null,
                parseFloat(subtotal || total_amount),
                parseFloat(tax_amount || 0),
                parseFloat(discount_amount || 0),
                parseFloat(total_amount),
                JSON.stringify(contact),
                notes || null
            ]
        );

        const bookingId = bookingResult.insertId;

        // Add travellers if provided
        if (Array.isArray(travellers) && travellers.length > 0) {
            for (let i = 0; i < travellers.length; i++) {
                const t = travellers[i];
                await connection.query(
                    `INSERT INTO booking_travellers (
                        booking_id, traveller_type, title, first_name, last_name,
                        gender, is_primary, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                    [
                        bookingId,
                        t.traveller_type || 'adult',
                        t.title || 'Mr',
                        t.first_name || t.name || 'Traveller',
                        t.last_name || null,
                        t.gender || 'other',
                        i === 0 ? 1 : 0
                    ]
                );
            }
        }

        await connection.commit();

        return successResponse(res, {
            booking_id: bookingId,
            booking_reference: bookingRef,
            status: 'pending',
            total_amount: parseFloat(total_amount),
            currency: 'INR'
        }, 'Booking created successfully', 201);
    } catch (err) {
        await connection.rollback();
        next(err);
    } finally {
        connection.release();
    }
};

/**
 * Get authenticated user's bookings list
 */
const getMyBookings = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const offset = (page - 1) * limit;

        const [countRows] = await db.query(
            'SELECT COUNT(*) AS total FROM bookings WHERE user_id = ?',
            [req.user.id]
        );
        const total = countRows[0].total;

        const [bookings] = await db.query(
            `SELECT 
                b.id, b.booking_reference, b.product_type, b.product_id,
                b.status, b.cancellation_status, b.total_amount, b.currency,
                b.booked_at, b.created_at,
                p.name AS package_name, p.cover_image AS package_image,
                h.name AS hotel_name, h.cover_image AS hotel_image
             FROM bookings b
             LEFT JOIN packages p ON p.id = b.product_id AND b.product_type = 'package'
             LEFT JOIN hotels h ON h.id = b.product_id AND b.product_type = 'hotel'
             WHERE b.user_id = ?
             ORDER BY b.id DESC
             LIMIT ? OFFSET ?`,
            [req.user.id, limit, offset]
        );

        return paginationResponse(res, bookings, { page, limit, total }, 'My bookings retrieved');
    } catch (err) {
        next(err);
    }
};

/**
 * Get booking details by reference or id
 */
const getBookingDetails = async (req, res, next) => {
    try {
        const { identifier } = req.params;
        const isNumeric = /^\d+$/.test(identifier);
        const queryCondition = isNumeric ? 'b.id = ?' : 'b.booking_reference = ?';

        const [rows] = await db.query(
            `SELECT b.*,
                    p.name AS package_name, p.slug AS package_slug,
                    h.name AS hotel_name, h.slug AS hotel_slug
             FROM bookings b
             LEFT JOIN packages p ON p.id = b.product_id AND b.product_type = 'package'
             LEFT JOIN hotels h ON h.id = b.product_id AND b.product_type = 'hotel'
             WHERE ${queryCondition}
             LIMIT 1`,
            [identifier]
        );

        if (rows.length === 0) {
            return errorResponse(res, 'Booking not found', 404);
        }

        const booking = rows[0];

        // Access check: if authenticated and booking has user_id, ensure ownership
        if (req.user && booking.user_id && booking.user_id !== req.user.id) {
            return errorResponse(res, 'Access denied to this booking', 403);
        }

        if (booking.contact && typeof booking.contact === 'string') {
            try {
                booking.contact = JSON.parse(booking.contact);
            } catch (e) {}
        }

        // Fetch travellers
        const [travellers] = await db.query(
            'SELECT id, traveller_type, title, first_name, last_name, gender, is_primary FROM booking_travellers WHERE booking_id = ?',
            [booking.id]
        );

        return successResponse(res, {
            ...booking,
            travellers
        }, 'Booking details retrieved');
    } catch (err) {
        next(err);
    }
};

/**
 * Cancel a booking
 */
const cancelBooking = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const [rows] = await db.query('SELECT * FROM bookings WHERE id = ? LIMIT 1', [id]);
        if (rows.length === 0) {
            return errorResponse(res, 'Booking not found', 404);
        }

        const booking = rows[0];
        if (req.user && booking.user_id && booking.user_id !== req.user.id) {
            return errorResponse(res, 'Access denied', 403);
        }

        if (['cancelled', 'refunded'].includes(booking.status)) {
            return errorResponse(res, 'Booking is already cancelled', 400);
        }

        await db.query(
            `UPDATE bookings 
             SET status = 'cancelled', cancellation_status = 'requested', 
                 cancelled_at = NOW(), admin_notes = CONCAT(COALESCE(admin_notes, ''), '\nCancelled by user: ', ?), 
                 updated_at = NOW() 
             WHERE id = ?`,
            [reason || 'User requested cancellation', id]
        );

        return successResponse(res, null, 'Booking cancellation requested successfully');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createBooking,
    getMyBookings,
    getBookingDetails,
    cancelBooking
};
