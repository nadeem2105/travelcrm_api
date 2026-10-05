const db = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get airports list or autocomplete search
 */
const getAirports = async (req, res, next) => {
    try {
        const { search, popular } = req.query;

        let whereClauses = ["status = 'active'"];
        let params = [];

        if (search) {
            whereClauses.push('(code LIKE ? OR city LIKE ? OR name LIKE ?)');
            const s = `%${search.trim()}%`;
            params.push(s, s, s);
        }

        if (popular !== undefined) {
            whereClauses.push('is_popular = ?');
            params.push(popular === 'true' || popular === '1' ? 1 : 0);
        }

        const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

        const [airports] = await db.query(`
            SELECT id, code, name, city, country, is_popular, sort_order
            FROM airports
            ${whereSql}
            ORDER BY is_popular DESC, sort_order ASC, city ASC
            LIMIT 50
        `, params);

        return successResponse(res, airports, 'Airports retrieved');
    } catch (err) {
        next(err);
    }
};

/**
 * Get airlines list
 */
const getAirlines = async (req, res, next) => {
    try {
        const [airlines] = await db.query(`
            SELECT id, code, name, logo, is_lcc, default_baggage_kg
            FROM airlines
            WHERE status = 'active'
            ORDER BY name ASC
        `);

        return successResponse(res, airlines, 'Airlines retrieved');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAirports,
    getAirlines
};
