const db = require('../config/db');
const { successResponse, errorResponse, paginationResponse } = require('../utils/response');

/**
 * Get paginated list of hotels with filters
 */
const getHotels = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const offset = (page - 1) * limit;

        const {
            search,
            destination_id,
            city,
            star_rating,
            min_price,
            max_price,
            is_featured,
            sort
        } = req.query;

        let whereClauses = ["h.status = 'active'"];
        let params = [];

        if (search) {
            whereClauses.push('(h.name LIKE ? OR h.city LIKE ? OR h.address LIKE ?)');
            const s = `%${search.trim()}%`;
            params.push(s, s, s);
        }

        if (destination_id) {
            whereClauses.push('h.destination_id = ?');
            params.push(destination_id);
        }

        if (city) {
            whereClauses.push('h.city = ?');
            params.push(city);
        }

        if (star_rating) {
            whereClauses.push('h.star_rating = ?');
            params.push(parseInt(star_rating, 10));
        }

        if (min_price) {
            whereClauses.push('h.starting_price >= ?');
            params.push(parseFloat(min_price));
        }

        if (max_price) {
            whereClauses.push('h.starting_price <= ?');
            params.push(parseFloat(max_price));
        }

        if (is_featured !== undefined) {
            whereClauses.push('h.is_featured = ?');
            params.push(is_featured === 'true' || is_featured === '1' ? 1 : 0);
        }

        const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

        let orderSql = 'ORDER BY h.is_featured DESC, h.id DESC';
        if (sort === 'price_low') orderSql = 'ORDER BY h.starting_price ASC';
        if (sort === 'price_high') orderSql = 'ORDER BY h.starting_price DESC';
        if (sort === 'rating') orderSql = 'ORDER BY h.star_rating DESC';

        // Count
        const [countRows] = await db.query(
            `SELECT COUNT(*) AS total FROM hotels h ${whereSql}`,
            params
        );
        const total = countRows[0].total;

        // Data
        const [hotels] = await db.query(
            `SELECT 
                h.id, h.name, h.slug, h.destination_id, d.name AS destination_name,
                h.address, h.city, h.star_rating, h.short_description, h.cover_image,
                h.starting_price, h.is_featured
             FROM hotels h
             LEFT JOIN destinations d ON d.id = h.destination_id
             ${whereSql}
             ${orderSql}
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return paginationResponse(res, hotels, { page, limit, total }, 'Hotels retrieved successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * Get featured hotels
 */
const getFeaturedHotels = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit || '6', 10);

        const [hotels] = await db.query(`
            SELECT 
                h.id, h.name, h.slug, h.destination_id, d.name AS destination_name,
                h.address, h.city, h.star_rating, h.short_description, h.cover_image,
                h.starting_price, h.is_featured
            FROM hotels h
            LEFT JOIN destinations d ON d.id = h.destination_id
            WHERE h.status = 'active' AND h.is_featured = 1
            ORDER BY h.id DESC
            LIMIT ?
        `, [limit]);

        return successResponse(res, hotels, 'Featured hotels retrieved');
    } catch (err) {
        next(err);
    }
};

/**
 * Get hotel details with rooms
 */
const getHotelDetails = async (req, res, next) => {
    try {
        const { identifier } = req.params;
        const isNumeric = /^\d+$/.test(identifier);
        const queryCondition = isNumeric ? 'h.id = ?' : 'h.slug = ?';

        const [hotelRows] = await db.query(`
            SELECT 
                h.*,
                d.name AS destination_name,
                d.slug AS destination_slug
            FROM hotels h
            LEFT JOIN destinations d ON d.id = h.destination_id
            WHERE ${queryCondition} AND h.status = 'active'
            LIMIT 1
        `, [identifier]);

        if (hotelRows.length === 0) {
            return errorResponse(res, 'Hotel not found', 404);
        }

        const hotel = hotelRows[0];

        // Safely parse JSON fields
        ['amenities', 'policies', 'photos'].forEach(field => {
            if (hotel[field] && typeof hotel[field] === 'string') {
                try {
                    hotel[field] = JSON.parse(hotel[field]);
                } catch (e) {}
            }
        });

        // Get rooms
        const [rooms] = await db.query(`
            SELECT id, room_type, description, max_adults, max_children, base_price,
                   extra_bed_price, child_price, meal_plan, amenities, total_rooms, photo
            FROM hotel_rooms
            WHERE hotel_id = ? AND status = 'active'
            ORDER BY base_price ASC
        `, [hotel.id]);

        rooms.forEach(r => {
            if (r.amenities && typeof r.amenities === 'string') {
                try {
                    r.amenities = JSON.parse(r.amenities);
                } catch (e) {}
            }
        });

        return successResponse(res, {
            ...hotel,
            rooms
        }, 'Hotel details retrieved');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getHotels,
    getFeaturedHotels,
    getHotelDetails
};
