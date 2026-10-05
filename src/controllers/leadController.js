const crypto = require('crypto');
const db = require('../config/db');
const { successResponse, errorResponse, paginationResponse } = require('../utils/response');

const generateLeadNumber = () => {
    return 'LD-' + Date.now().toString().slice(-6) + '-' + Math.floor(100 + Math.random() * 900);
};

/**
 * Create a new CRM Lead (from website enquiry, modal, or API)
 */
const createLead = async (req, res, next) => {
    try {
        const {
            name,
            phone,
            email,
            destination,
            product_type = 'package',
            budget,
            travellers_count = 1,
            travel_date,
            adults,
            children,
            notes,
            utm_source,
            utm_medium,
            utm_campaign
        } = req.body;

        if (!name || !phone) {
            return errorResponse(res, 'Name and phone number are required', 422);
        }

        const leadNumber = generateLeadNumber();
        const uuid = crypto.randomUUID();

        const [result] = await db.query(
            `INSERT INTO crm_leads (
                uuid, lead_number, name, phone, email, destination,
                product_type, budget, travellers_count, travel_date,
                adults, children, source, status, priority, notes,
                utm_source, utm_medium, utm_campaign, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'website', 'new', 'medium', ?, ?, ?, ?, NOW(), NOW())`,
            [
                uuid,
                leadNumber,
                name.trim(),
                phone.trim(),
                email ? email.trim().toLowerCase() : null,
                destination || null,
                product_type,
                budget || null,
                parseInt(travellers_count, 10) || 1,
                travel_date || null,
                adults || null,
                children || null,
                notes || null,
                utm_source || null,
                utm_medium || null,
                utm_campaign || null
            ]
        );

        return successResponse(res, {
            lead_id: result.insertId,
            lead_number: leadNumber,
            status: 'new'
        }, 'Enquiry received. Our travel specialist will contact you shortly.', 201);
    } catch (err) {
        next(err);
    }
};

/**
 * List CRM leads (filtered, paginated)
 */
const getLeads = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '15', 10);
        const offset = (page - 1) * limit;

        const { status, priority, destination, search } = req.query;

        let whereClauses = ['l.deleted_at IS NULL'];
        let params = [];

        if (status) {
            whereClauses.push('l.status = ?');
            params.push(status);
        }

        if (priority) {
            whereClauses.push('l.priority = ?');
            params.push(priority);
        }

        if (destination) {
            whereClauses.push('l.destination LIKE ?');
            params.push(`%${destination.trim()}%`);
        }

        if (search) {
            whereClauses.push('(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.lead_number LIKE ?)');
            const s = `%${search.trim()}%`;
            params.push(s, s, s, s);
        }

        const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

        const [countRows] = await db.query(
            `SELECT COUNT(*) AS total FROM crm_leads l ${whereSql}`,
            params
        );
        const total = countRows[0].total;

        const [leads] = await db.query(
            `SELECT 
                l.id, l.uuid, l.lead_number, l.name, l.phone, l.email,
                l.destination, l.product_type, l.budget, l.travellers_count,
                l.travel_date, l.status, l.priority, l.created_at
             FROM crm_leads l
             ${whereSql}
             ORDER BY l.id DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return paginationResponse(res, leads, { page, limit, total }, 'Leads retrieved');
    } catch (err) {
        next(err);
    }
};

/**
 * Get lead details with follow-ups
 */
const getLeadDetails = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            'SELECT * FROM crm_leads WHERE (id = ? OR uuid = ? OR lead_number = ?) AND deleted_at IS NULL LIMIT 1',
            [id, id, id]
        );

        if (rows.length === 0) {
            return errorResponse(res, 'Lead not found', 404);
        }

        const lead = rows[0];

        // Fetch follow ups
        const [followUps] = await db.query(
            'SELECT id, note, scheduled_at, is_completed, created_at FROM crm_follow_ups WHERE lead_id = ? ORDER BY id DESC',
            [lead.id]
        );

        // Fetch quotations
        const [quotations] = await db.query(
            'SELECT id, quotation_number, title, total_amount, status, created_at FROM crm_quotations WHERE lead_id = ? ORDER BY id DESC',
            [lead.id]
        );

        return successResponse(res, {
            ...lead,
            follow_ups: followUps,
            quotations
        }, 'Lead details retrieved');
    } catch (err) {
        next(err);
    }
};

/**
 * Update lead status
 */
const updateLeadStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, notes, priority } = req.body;

        const validStatuses = ['new', 'contacted', 'quotation_sent', 'negotiating', 'converted', 'lost'];
        if (status && !validStatuses.includes(status)) {
            return errorResponse(res, `Invalid status. Valid values: ${validStatuses.join(', ')}`, 422);
        }

        await db.query(
            `UPDATE crm_leads 
             SET status = COALESCE(?, status),
                 priority = COALESCE(?, priority),
                 notes = COALESCE(?, notes),
                 updated_at = NOW()
             WHERE id = ? AND deleted_at IS NULL`,
            [status || null, priority || null, notes || null, id]
        );

        return successResponse(res, null, 'Lead updated successfully');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createLead,
    getLeads,
    getLeadDetails,
    updateLeadStatus
};
