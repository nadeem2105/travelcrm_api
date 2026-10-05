const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'travel_portal',
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    dateStrings: true
});

// Test connection on boot
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log(`[Database] Connected successfully to MySQL: ${process.env.DB_NAME || 'travel_portal'}`);
        connection.release();
    } catch (err) {
        console.error('[Database] Connection failed:', err.message);
    }
})();

module.exports = pool;
