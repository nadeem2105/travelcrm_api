const db = require('../config/db');
const { successResponse, errorResponse, paginationResponse } = require('../utils/response');

/**
 * List quotations (paginated)
 */
const getQuotations = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '15', 10);
        const offset = (page - 1) * limit;

        const { status, search } = req.query;

        let whereClauses = ['1=1'];
        let params = [];

        if (status) {
            whereClauses.push('q.status = ?');
            params.push(status);
        }

        if (search) {
            whereClauses.push('(q.quotation_number LIKE ? OR q.title LIKE ? OR l.name LIKE ?)');
            const s = `%${search.trim()}%`;
            params.push(s, s, s);
        }

        const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

        const [countRows] = await db.query(
            `SELECT COUNT(*) AS total 
             FROM crm_quotations q 
             LEFT JOIN crm_leads l ON l.id = q.lead_id 
             ${whereSql}`,
            params
        );
        const total = countRows[0].total;

        const [quotations] = await db.query(
            `SELECT 
                q.id, q.quotation_number, q.public_token, q.title,
                q.total_amount, q.currency, q.status, q.valid_until,
                q.travel_date, q.created_at,
                l.id AS lead_id, l.name AS lead_name, l.phone AS lead_phone, l.destination
             FROM crm_quotations q
             LEFT JOIN crm_leads l ON l.id = q.lead_id
             ${whereSql}
             ORDER BY q.id DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return paginationResponse(res, quotations, { page, limit, total }, 'Quotations retrieved');
    } catch (err) {
        next(err);
    }
};

/**
 * Get quotation details by public token or quotation number
 */
const getQuotationByToken = async (req, res, next) => {
    try {
        const { token } = req.params;

        const [rows] = await db.query(
            `SELECT q.*,
                    l.name AS customer_name, l.email AS customer_email, l.phone AS customer_phone, l.destination,
                    p.name AS package_name
             FROM crm_quotations q
             LEFT JOIN crm_leads l ON l.id = q.lead_id
             LEFT JOIN packages p ON p.id = q.package_id
             WHERE q.public_token = ? OR q.quotation_number = ? OR q.id = ?
             LIMIT 1`,
            [token, token, isNaN(token) ? 0 : token]
        );

        if (rows.length === 0) {
            return errorResponse(res, 'Quotation not found', 404);
        }

        const quote = rows[0];

        // Parse JSON fields
        ['itinerary', 'hotels', 'items', 'inclusions', 'exclusions', 'payment_schedule'].forEach(f => {
            if (quote[f] && typeof quote[f] === 'string') {
                try {
                    quote[f] = JSON.parse(quote[f]);
                } catch (e) {}
            }
        });

        // Track view
        if (quote.status === 'sent') {
            await db.query("UPDATE crm_quotations SET status = 'viewed', viewed_at = NOW() WHERE id = ?", [quote.id]);
            quote.status = 'viewed';
        }

        return successResponse(res, quote, 'Quotation retrieved');
    } catch (err) {
        next(err);
    }
};

/**
 * Accept or reject quotation
 */
const updateQuotationStatus = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { action } = req.body; // 'accept' or 'reject'

        if (!['accept', 'reject'].includes(action)) {
            return errorResponse(res, "Action must be either 'accept' or 'reject'", 422);
        }

        const newStatus = action === 'accept' ? 'accepted' : 'rejected';
        const timestampColumn = action === 'accept' ? 'accepted_at' : 'rejected_at';

        const [result] = await db.query(
            `UPDATE crm_quotations 
             SET status = ?, ${timestampColumn} = NOW(), updated_at = NOW()
             WHERE (public_token = ? OR quotation_number = ? OR id = ?) AND status IN ('sent', 'viewed', 'negotiation')`,
            [newStatus, token, token, isNaN(token) ? 0 : token]
        );

        if (result.affectedRows === 0) {
            return errorResponse(res, 'Quotation not found or already closed', 400);
        }

        return successResponse(res, { status: newStatus }, `Quotation ${newStatus} successfully`);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getQuotations,
    getQuotationByToken,
    updateQuotationStatus
};
