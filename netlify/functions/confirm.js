// Netlify Function to confirm email subscriptions
// Handles double opt-in confirmation for GDPR compliance

const { Pool } = require('pg');
const crypto = require('crypto');

// Create connection pool for Neon PostgreSQL
const pool = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

exports.handler = async (event, context) => {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: {
                'Content-Type': 'text/html',
            },
            body: `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Method Not Allowed</title>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
                    <h1 style="color: #e74c3c;">Method Not Allowed</h1>
                    <p>This endpoint only accepts GET requests.</p>
                </body>
                </html>
            `
        };
    }

    try {
        const token = event.queryStringParameters?.token;

        if (!token) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'text/html',
                },
                body: generateErrorPage('Missing confirmation token', 'The confirmation link appears to be invalid.')
            };
        }

        // Find subscriber with matching token
        const subscriber = await pool.query(
            'SELECT id, email_hash, status, confirmation_expires FROM subscribers WHERE confirmation_token = $1',
            [token]
        );

        if (subscriber.rows.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'text/html',
                },
                body: generateErrorPage('Invalid confirmation token', 'This confirmation link is not valid or may have already been used.')
            };
        }

        const foundSubscriber = subscriber.rows[0];

        // Check if token has expired
        if (new Date() > new Date(foundSubscriber.confirmation_expires)) {
            return {
                statusCode: 410,
                headers: {
                    'Content-Type': 'text/html',
                },
                body: generateErrorPage('Confirmation link expired', 'This confirmation link has expired. Please subscribe again to receive a new confirmation email.')
            };
        }

        // Check if already confirmed
        if (foundSubscriber.status === 'active') {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'text/html',
                },
                body: generateSuccessPage('Already confirmed', 'Your email subscription was already confirmed. Thank you!')
            };
        }

        // Confirm the subscription
        await pool.query(`
            UPDATE subscribers 
            SET status = 'active',
                confirmation_token = NULL,
                confirmation_expires = NULL
            WHERE id = $1
        `, [foundSubscriber.id]);

        // Update analytics for confirmed subscription
        await updateAnalytics('subscribe');

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/html',
            },
            body: generateSuccessPage('Subscription confirmed!', 'Thank you for confirming your subscription. You\'ll be notified when the Energy Landscape Theory book is released.')
        };

    } catch (error) {
        console.error('Error confirming subscription:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'text/html',
            },
            body: generateErrorPage('Server Error', 'An error occurred while confirming your subscription. Please try again later.')
        };
    }
};

function generateSuccessPage(title, message) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    max-width: 600px; 
                    margin: 50px auto; 
                    padding: 20px; 
                    text-align: center; 
                    line-height: 1.6;
                }
                .success { color: #27ae60; }
                .button { 
                    display: inline-block; 
                    background: #3B7D69; 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <h1 class="success">${title}</h1>
            <p>${message}</p>
            <a href="/" class="button">Return to Energy Landscape Theory</a>
        </body>
        </html>
    `;
}

function generateErrorPage(title, message) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    max-width: 600px; 
                    margin: 50px auto; 
                    padding: 20px; 
                    text-align: center; 
                    line-height: 1.6;
                }
                .error { color: #e74c3c; }
                .button { 
                    display: inline-block; 
                    background: #3B7D69; 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <h1 class="error">${title}</h1>
            <p>${message}</p>
            <a href="/" class="button">Return to Energy Landscape Theory</a>
        </body>
        </html>
    `;
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