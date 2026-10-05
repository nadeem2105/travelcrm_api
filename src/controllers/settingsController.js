const db = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get public site settings (branding, company, SEO, GA4 config)
 */
const getPublicSettings = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            "SELECT `key`, `value`, `type` FROM settings WHERE is_public = 1 OR `group` IN ('general', 'branding', 'seo')"
        );

        const settingsMap = {};
        rows.forEach(item => {
            let val = item.value;
            if (item.type === 'boolean') {
                val = ['1', 'true', 'on', 'yes'].includes(String(val).toLowerCase());
            } else if (item.type === 'number' && !isNaN(val)) {
                val = Number(val);
            } else if (item.type === 'json' && val) {
                try {
                    val = JSON.parse(val);
                } catch (e) {}
            }
            settingsMap[item.key] = val;
        });

        return successResponse(res, settingsMap, 'Site settings retrieved');
    } catch (err) {
        next(err);
    }
};

/**
 * Get active promotional banners
 */
const getBanners = async (req, res, next) => {
    try {
        const { position = 'home' } = req.query;

        const [banners] = await db.query(
            `SELECT id, title, subtitle, image, link_url, button_text, sort_order
             FROM banners
             WHERE status = 'active' AND position = ?
               AND (starts_at IS NULL OR starts_at <= NOW())
               AND (ends_at IS NULL OR ends_at >= NOW())
             ORDER BY sort_order ASC, id DESC`,
            [position]
        );

        return successResponse(res, banners, 'Banners retrieved');
    } catch (err) {
        next(err);
    }
};

/**
 * Get customer testimonials
 */
const getTestimonials = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit || '10', 10);

        const [testimonials] = await db.query(
            `SELECT id, customer_name, customer_photo, city, destination, rating, content, is_featured
             FROM testimonials
             WHERE status = 'active'
             ORDER BY is_featured DESC, id DESC
             LIMIT ?`,
            [limit]
        );

        return successResponse(res, testimonials, 'Testimonials retrieved');
    } catch (err) {
        next(err);
    }
};

/**
 * Get FAQs
 */
const getFaqs = async (req, res, next) => {
    try {
        const { category } = req.query;
        let query = "SELECT id, question, answer, category, sort_order FROM faqs WHERE status = 'active'";
        let params = [];

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        query += ' ORDER BY sort_order ASC, id ASC';

        const [faqs] = await db.query(query, params);

        return successResponse(res, faqs, 'FAQs retrieved');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getPublicSettings,
    getBanners,
    getTestimonials,
    getFaqs
};
