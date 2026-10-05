const db = require('../config/db');
const { successResponse, errorResponse, paginationResponse } = require('../utils/response');

/**
 * Get paginated list of packages with filters
 */
const getPackages = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '10', 10);
        const offset = (page - 1) * limit;

        const {
            search,
            destination_id,
            package_type,
            min_price,
            max_price,
            duration,
            is_featured,
            sort
        } = req.query;

        let whereClauses = ["p.status = 'active'"];
        let params = [];

        if (search) {
            whereClauses.push('(p.name LIKE ? OR p.short_description LIKE ? OR d.name LIKE ?)');
            const searchParam = `%${search.trim()}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        if (destination_id) {
            whereClauses.push('p.destination_id = ?');
            params.push(destination_id);
        }

        if (package_type) {
            whereClauses.push('p.package_type = ?');
            params.push(package_type);
        }

        if (min_price) {
            whereClauses.push('p.base_price >= ?');
            params.push(parseFloat(min_price));
        }

        if (max_price) {
            whereClauses.push('p.base_price <= ?');
            params.push(parseFloat(max_price));
        }

        if (duration) {
            whereClauses.push('p.duration_days = ?');
            params.push(parseInt(duration, 10));
        }

        if (is_featured !== undefined) {
            whereClauses.push('p.is_featured = ?');
            params.push(is_featured === 'true' || is_featured === '1' ? 1 : 0);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Sorting
        let orderSql = 'ORDER BY p.is_featured DESC, p.id DESC';
        if (sort === 'price_low') orderSql = 'ORDER BY p.base_price ASC';
        if (sort === 'price_high') orderSql = 'ORDER BY p.base_price DESC';
        if (sort === 'duration_short') orderSql = 'ORDER BY p.duration_days ASC';
        if (sort === 'duration_long') orderSql = 'ORDER BY p.duration_days DESC';

        // Count total
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM packages p
            LEFT JOIN destinations d ON d.id = p.destination_id
            ${whereSql}
        `;
        const [countRows] = await db.query(countQuery, params);
        const total = countRows[0].total;

        // Fetch paginated data
        const dataQuery = `
            SELECT 
                p.id, p.name, p.slug, p.destination_id, d.name AS destination_name,
                p.duration_days, p.duration_nights, p.cover_image, p.short_description,
                p.base_price, p.child_price, p.discount_percent, p.package_type,
                p.is_featured, p.max_travellers, p.created_at
            FROM packages p
            LEFT JOIN destinations d ON d.id = p.destination_id
            ${whereSql}
            ${orderSql}
            LIMIT ? OFFSET ?
        `;
        const [packages] = await db.query(dataQuery, [...params, limit, offset]);

        return paginationResponse(res, packages, { page, limit, total }, 'Packages retrieved successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * Get featured packages (home display)
 */
const getFeaturedPackages = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit || '6', 10);

        const [packages] = await db.query(`
            SELECT 
                p.id, p.name, p.slug, p.destination_id, d.name AS destination_name,
                p.duration_days, p.duration_nights, p.cover_image, p.short_description,
                p.base_price, p.child_price, p.discount_percent, p.package_type,
                p.is_featured
            FROM packages p
            LEFT JOIN destinations d ON d.id = p.destination_id
            WHERE p.status = 'active' AND p.is_featured = 1
            ORDER BY p.id DESC
            LIMIT ?
        `, [limit]);

        return successResponse(res, packages, 'Featured packages retrieved');
    } catch (err) {
        next(err);
    }
};

/**
 * Get single package details by slug or ID
 */
const getPackageDetails = async (req, res, next) => {
    try {
        const { identifier } = req.params;

        const isNumeric = /^\d+$/.test(identifier);
        const queryCondition = isNumeric ? 'p.id = ?' : 'p.slug = ?';

        const [packageRows] = await db.query(`
            SELECT 
                p.*,
                d.name AS destination_name,
                d.slug AS destination_slug,
                d.region AS destination_region
            FROM packages p
            LEFT JOIN destinations d ON d.id = p.destination_id
            WHERE ${queryCondition} AND p.status = 'active'
            LIMIT 1
        `, [identifier]);

        if (packageRows.length === 0) {
            return errorResponse(res, 'Package not found', 404);
        }

        const pkg = packageRows[0];

        // Safely parse JSON fields
        ['gallery', 'highlights', 'inclusions', 'exclusions', 'terms'].forEach(field => {
            if (pkg[field] && typeof pkg[field] === 'string') {
                try {
                    pkg[field] = JSON.parse(pkg[field]);
                } catch (e) {
                    // Keep original value if not JSON
                }
            }
        });

        // Get itineraries
        const [itineraries] = await db.query(`
            SELECT day_number, title, description, meals, activities, overnight_stay
            FROM package_itineraries
            WHERE package_id = ?
            ORDER BY day_number ASC
        `, [pkg.id]);

        itineraries.forEach(item => {
            ['meals', 'activities'].forEach(f => {
                if (item[f] && typeof item[f] === 'string') {
                    try {
                        item[f] = JSON.parse(item[f]);
                    } catch (e) {}
                }
            });
        });

        // Get hotel options if any
        const [hotelOptions] = await db.query(`
            SELECT 
                pho.id, pho.label, pho.room_type, pho.meal_plan, pho.star_rating,
                pho.base_adults, pho.max_adults, pho.max_children, pho.is_default,
                pho.upgrade_price, pho.extra_adult_price, pho.extra_child_price,
                h.name AS hotel_name, h.cover_image AS hotel_image, h.address AS hotel_address
            FROM package_hotel_options pho
            LEFT JOIN hotels h ON h.id = pho.hotel_id
            WHERE pho.package_id = ? AND pho.status = 'active'
            ORDER BY pho.sort_order ASC
        `, [pkg.id]);

        // Get available departures
        const [departures] = await db.query(`
            SELECT id, departure_date, inventory, booked, (inventory - booked) AS available_seats, price_override
            FROM package_departures
            WHERE package_id = ? AND status = 'open' AND departure_date >= CURDATE()
            ORDER BY departure_date ASC
            LIMIT 15
        `, [pkg.id]);

        return successResponse(res, {
            ...pkg,
            itineraries,
            hotel_options: hotelOptions,
            upcoming_departures: departures
        }, 'Package details retrieved');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getPackages,
    getFeaturedPackages,
    getPackageDetails
};
