const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const db = require('./src/config/db');
const apiRoutes = require('./src/routes');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const { apiLimiter } = require('./src/middleware/rateLimiter');

const app = express();

// ==========================================
// Global Middlewares
// ==========================================
app.use(helmet({
    crossOriginResourcePolicy: false
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==========================================
// Health & Info Routes
// ==========================================
app.get('/', (req, res) => {
    res.json({
        success: true,
        name: 'Travel CRM REST API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        documentation: {
            api_prefix: '/api/v1',
            modules: [
                { path: '/api/v1/auth', description: 'Authentication (login, register, profile)' },
                { path: '/api/v1/packages', description: 'Tour packages, itineraries, departures' },
                { path: '/api/v1/hotels', description: 'Hotels, rooms, star ratings' },
                { path: '/api/v1/cabs', description: 'Cabs, vehicle types, locations' },
                { path: '/api/v1/flights', description: 'Airports and airlines' },
                { path: '/api/v1/destinations', description: 'Travel destinations and guides' },
                { path: '/api/v1/bookings', description: 'Booking creation, my bookings, cancellation' },
                { path: '/api/v1/leads', description: 'CRM leads capture and status management' },
                { path: '/api/v1/quotations', description: 'CRM quotations preview and customer decisions' },
                { path: '/api/v1/settings', description: 'Public site settings, banners, FAQs, testimonials' }
            ]
        }
    });
});

app.get('/health', async (req, res) => {
    try {
        const [result] = await db.query('SELECT 1 AS status');
        res.json({
            status: 'healthy',
            database: result[0].status === 1 ? 'connected' : 'error',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    } catch (err) {
        res.status(500).json({
            status: 'unhealthy',
            database: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ==========================================
// API Routes & Rate Limiting (Throttled)
// ==========================================
app.use('/api', apiLimiter);
app.use('/api/v1', apiRoutes);
app.use('/api', apiRoutes); // Alias for convenience

// ==========================================
// Error Handlers
// ==========================================
app.use(notFoundHandler);
app.use(errorHandler);

// ==========================================
// Server Start
// ==========================================
const PORT = parseInt(process.env.PORT || '5000', 10);
const server = http.createServer(app);

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n[Server Error] Port ${PORT} is already in use by another process.`);
        console.error(`You can change the port in .env (e.g. PORT=5001) or stop the process using port ${PORT}.\n`);
    } else {
        console.error('[Server Error]', err);
    }
    process.exit(1);
});

server.listen(PORT, () => {
    console.log('====================================================');
    console.log(`   Travel CRM Node.js API Server`);
    console.log('====================================================');
    console.log(` Server URL : http://localhost:${PORT}`);
    console.log(` API Base   : http://localhost:${PORT}/api/v1`);
    console.log(` Health     : http://localhost:${PORT}/health`);
    console.log(` Database   : ${process.env.DB_NAME || 'travel_portal'} on ${process.env.DB_HOST || '127.0.0.1'}`);
    console.log('====================================================');
});

module.exports = { app, server };
