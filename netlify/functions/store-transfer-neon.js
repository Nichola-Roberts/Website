// Store transfer data in Neon PostgreSQL
// Privacy-preserving: We only store already-encrypted data, cannot decrypt without user's key
const { Pool } = require('pg');

// Create connection pool for Neon PostgreSQL
const pool = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Initialize transfers table if it doesn't exist
async function initializeDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS transfers (
                id SERIAL PRIMARY KEY,
                access_code VARCHAR(4) UNIQUE NOT NULL,
                encrypted_data TEXT NOT NULL,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                accessed_count INTEGER DEFAULT 0
            )
        `);
        
        // Create indexes for faster lookups
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_transfers_code ON transfers(access_code);
            CREATE INDEX IF NOT EXISTS idx_transfers_expires ON transfers(expires_at);
        `);
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

// Clean up expired transfers
async function cleanupExpiredTransfers() {
    try {
        const result = await pool.query(
            'DELETE FROM transfers WHERE expires_at < NOW()'
        );
        if (result.rowCount > 0) {
            console.log(`Cleaned up ${result.rowCount} expired transfers`);
        }
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

exports.handler = async (event, context) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Initialize database tables
        await initializeDatabase();
        
        // Clean up old transfers periodically
        await cleanupExpiredTransfers();
        
        const { code, data, expiresAt } = JSON.parse(event.body);

        // Validate input
        if (!code || !data || !expiresAt) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }

        // The 'code' here is just the access code (first 4 chars)
        // The encryption key (last 4 chars) never reaches the server
        // Data is already encrypted client-side
        
        // Validate access code format (4 characters, alphanumeric)
        if (!/^[A-Z0-9]{4}$/i.test(code)) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Invalid access code format' })
            };
        }

        // Check if code already exists
        const existing = await pool.query(
            'SELECT id FROM transfers WHERE access_code = $1',
            [code.toUpperCase()]
        );
        
        if (existing.rows.length > 0) {
            // Generate a new code suggestion
            return {
                statusCode: 409,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ 
                    error: 'Code already exists',
                    message: 'Please try again with a different code'
                })
            };
        }

        // Store the already-encrypted data
        // We cannot decrypt this without the user's encryption key
        const expiresDate = new Date(expiresAt);
        await pool.query(
            `INSERT INTO transfers (access_code, encrypted_data, expires_at) 
             VALUES ($1, $2, $3)`,
            [code.toUpperCase(), data, expiresDate]
        );

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                success: true,
                message: 'Transfer code created successfully'
            })
        };

    } catch (error) {
        console.error('Store transfer error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'Failed to store transfer data',
                details: error.message 
            })
        };
    }
};