// Netlify Function to handle mailing list unsubscribes
// Uses Neon PostgreSQL database for subscriber storage with email encryption

const { Pool } = require('pg');
const crypto = require('crypto');

// Create connection pool for Neon PostgreSQL
const pool = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

exports.handler = async (event, context) => {
    // Allow both POST and GET requests for unsubscribe links
    if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
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
        let email;
        
        if (event.httpMethod === 'POST') {
            const { email: bodyEmail } = JSON.parse(event.body);
            email = bodyEmail;
        } else {
            // GET request with email in query params
            email = event.queryStringParameters?.email;
        }

        // Validate email
        if (!email || !isValidEmail(email)) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Valid email address is required' })
            };
        }

        // Check if email exists using hash
        const emailHash = hashEmail(email.toLowerCase());
        const subscriber = await pool.query(
            'SELECT id, status, subscribed_at, source FROM subscribers WHERE email_hash = $1',
            [emailHash]
        );
        
        if (subscriber.rows.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Email not found in subscription list' })
            };
        }

        const subscriberData = subscriber.rows[0];
        
        // Update subscriber record - soft delete but keep analytics data
        await pool.query(`
            UPDATE subscribers 
            SET status = 'unsubscribed',
                encrypted_email = '[deleted]',
                unsubscribed_at = CURRENT_TIMESTAMP
            WHERE email_hash = $1
        `, [emailHash]);
        
        // Update analytics
        await updateAnalytics('unsubscribe');

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                success: true,
                message: 'Successfully unsubscribed from the mailing list'
            })
        };

    } catch (error) {
        console.error('Error unsubscribing email:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function hashEmail(email) {
    // Create a consistent hash of the email for use as storage key
    return crypto.createHash('sha256').update(email).digest('hex');
}

async function updateAnalytics(action) {
    try {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        
        // Update total counts
        await pool.query(`
            INSERT INTO analytics (metric_name, metric_value, month)
            VALUES ($1, 1, NULL)
            ON CONFLICT (metric_name, month)
            DO UPDATE SET 
                metric_value = analytics.metric_value + 1,
                updated_at = CURRENT_TIMESTAMP
        `, [`total_${action}s`]);
        
        // Update monthly counts
        await pool.query(`
            INSERT INTO analytics (metric_name, metric_value, month)
            VALUES ($1, 1, $2)
            ON CONFLICT (metric_name, month)
            DO UPDATE SET 
                metric_value = analytics.metric_value + 1,
                updated_at = CURRENT_TIMESTAMP
        `, [`${action}s`, currentMonth]);
        
    } catch (error) {
        console.error('Error updating analytics:', error);
        // Don't throw - analytics failure shouldn't break subscription
    }
}