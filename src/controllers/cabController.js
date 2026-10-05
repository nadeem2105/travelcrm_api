const db = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get available vehicle types
 */
const getVehicleTypes = async (req, res, next) => {
    try {
        const [types] = await db.query(`
            SELECT id, name, description, icon, sort_order
            FROM vehicle_types
            WHERE status = 'active'
            ORDER BY sort_order ASC, id ASC
        `);

        return successResponse(res, types, 'Vehicle types retrieved');
    } catch (err) {
        next(err);
    }
};

/**
 * Get available vehicles/cabs with filters
 */
const getVehicles = async (req, res, next) => {
    try {
        const { vehicle_type_id, capacity, is_ac } = req.query;

        let whereClauses = ["v.status = 'active'"];
        let params = [];

        if (vehicle_type_id) {
            whereClauses.push('v.vehicle_type_id = ?');
            params.push(vehicle_type_id);
        }

        if (capacity) {
            whereClauses.push('v.passenger_capacity >= ?');
            params.push(parseInt(capacity, 10));
        }

        if (is_ac !== undefined) {
            whereClauses.push('v.is_ac = ?');
            params.push(is_ac === 'true' || is_ac === '1' ? 1 : 0);
        }

        const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

        const [vehicles] = await db.query(`
            SELECT 
                v.id, v.name, v.vehicle_type_id, vt.name AS vehicle_type_name,
                v.image, v.passenger_capacity, v.luggage_capacity, v.is_ac,
                v.base_price, v.per_km_rate, v.per_hour_rate, v.cancellation_policy,
                v.is_featured
            FROM vehicles v
            LEFT JOIN vehicle_types vt ON vt.id = v.vehicle_type_id
            ${whereSql}
            ORDER BY v.is_featured DESC, v.base_price ASC
        `, params);

        return successResponse(res, vehicles, 'Vehicles retrieved');
    } catch (err) {
        next(err);
    }
};

/**
 * Get cab locations / pickup and drop destinations
 */
const getCabLocations = async (req, res, next) => {
    try {
        const [locations] = await db.query(`
            SELECT id, name, city, type, sort_order
            FROM cab_locations
            WHERE status = 'active'
            ORDER BY sort_order ASC, name ASC
        `);

        return successResponse(res, locations, 'Cab locations retrieved');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getVehicleTypes,
    getVehicles,
    getCabLocations
};
