// Retrieve transfer data from Neon PostgreSQL
// Privacy-preserving: We only return encrypted data, cannot decrypt without user's key
const { Pool } = require('pg');

// Create connection pool for Neon PostgreSQL
const pool = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

exports.handler = async (event, context) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            body: ''
        };
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
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
        // Get access code from query parameters
        const accessCode = event.queryStringParameters?.code;

        if (!accessCode) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Access code is required' })
            };
        }

        // Validate access code format (4 characters)
        if (!/^[A-Z0-9]{4}$/i.test(accessCode)) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Invalid access code format' })
            };
        }

        // Retrieve the encrypted data
        const result = await pool.query(
            `SELECT encrypted_data, expires_at, accessed_count 
             FROM transfers 
             WHERE access_code = $1 AND expires_at > NOW()`,
            [accessCode.toUpperCase()]
        );

        if (result.rows.length === 0) {
            // Check if it existed but expired
            const expiredCheck = await pool.query(
                'SELECT expires_at FROM transfers WHERE access_code = $1',
                [accessCode.toUpperCase()]
            );
            
            if (expiredCheck.rows.length > 0) {
                return {
                    statusCode: 410,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({ 
                        error: 'Transfer code has expired',
                        success: false 
                    })
                };
            }
            
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ 
                    error: 'Transfer code not found',
                    success: false 
                })
            };
        }

        const transfer = result.rows[0];

        // Update access count
        await pool.query(
            'UPDATE transfers SET accessed_count = accessed_count + 1 WHERE access_code = $1',
            [accessCode.toUpperCase()]
        );

        // Return the encrypted data
        // The client will decrypt it using the encryption key (last 4 chars)
        // We never see the encryption key, so we cannot decrypt this data
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                success: true,
                data: transfer.encrypted_data,
                accessCount: transfer.accessed_count + 1
            })
        };

    } catch (error) {
        console.error('Retrieve transfer error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'Failed to retrieve transfer data',
                details: error.message 
            })
        };
    }
};