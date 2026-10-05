const db = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all active destinations with package counts
 */
const getDestinations = async (req, res, next) => {
    try {
        const { is_featured, region } = req.query;

        let whereClauses = ["d.status = 'active'"];
        let params = [];

        if (is_featured !== undefined) {
            whereClauses.push('d.is_featured = ?');
            params.push(is_featured === 'true' || is_featured === '1' ? 1 : 0);
        }

        if (region) {
            whereClauses.push('d.region = ?');
            params.push(region);
        }

        const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

        const [destinations] = await db.query(`
            SELECT 
                d.id, d.name, d.slug, d.region, d.cover_image, d.short_description,
                d.best_time, d.altitude, d.famous_for, d.is_featured, d.sort_order,
                COUNT(DISTINCT p.id) AS packages_count,
                COUNT(DISTINCT h.id) AS hotels_count
            FROM destinations d
            LEFT JOIN packages p ON p.destination_id = d.id AND p.status = 'active'
            LEFT JOIN hotels h ON h.destination_id = d.id AND h.status = 'active'
            ${whereSql}
            GROUP BY d.id
            ORDER BY d.sort_order ASC, d.name ASC
        `, params);

        return successResponse(res, destinations, 'Destinations retrieved');
    } catch (err) {
        next(err);
    }
};

/**
 * Get single destination details by slug or id
 */
const getDestinationDetails = async (req, res, next) => {
    try {
        const { identifier } = req.params;
        const isNumeric = /^\d+$/.test(identifier);
        const queryCondition = isNumeric ? 'd.id = ?' : 'd.slug = ?';

        const [destinationRows] = await db.query(`
            SELECT d.*
            FROM destinations d
            WHERE ${queryCondition} AND d.status = 'active'
            LIMIT 1
        `, [identifier]);

        if (destinationRows.length === 0) {
            return errorResponse(res, 'Destination not found', 404);
        }

        const dest = destinationRows[0];

        // Safely parse JSON
        ['gallery', 'places_to_visit', 'things_to_do'].forEach(field => {
            if (dest[field] && typeof dest[field] === 'string') {
                try {
                    dest[field] = JSON.parse(dest[field]);
                } catch (e) {}
            }
        });

        // Get top packages for this destination
        const [packages] = await db.query(`
            SELECT id, name, slug, duration_days, duration_nights, cover_image, base_price, is_featured
            FROM packages
            WHERE destination_id = ? AND status = 'active'
            ORDER BY is_featured DESC, base_price ASC
            LIMIT 6
        `, [dest.id]);

        return successResponse(res, {
            ...dest,
            packages
        }, 'Destination details retrieved');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getDestinations,
    getDestinationDetails
};
