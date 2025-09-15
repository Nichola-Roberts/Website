// Netlify Function to list subscribers (admin function)
// Uses Neon PostgreSQL database for subscriber storage
// Requires authentication in production

const { Pool } = require('pg');

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
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // In production, add authentication here
        // const authToken = event.headers.authorization;
        // if (!authToken || !isValidAdminToken(authToken)) {
        //     return {
        //         statusCode: 401,
        //         body: JSON.stringify({ error: 'Unauthorized' })
        //     };
        // }

        // Get subscriber statistics from PostgreSQL
        const statsQuery = `
            SELECT 
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as active,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'unsubscribed' THEN 1 END) as unsubscribed,
                COUNT(*) as total
            FROM subscribers
        `;
        
        const statsResult = await pool.query(statsQuery);
        const stats = statsResult.rows[0];

        // Get recent subscribers (optional - remove if you just want counts)
        const recentQuery = `
            SELECT 
                id,
                status,
                source,
                subscribed_at,
                unsubscribed_at
            FROM subscribers
            ORDER BY subscribed_at DESC
            LIMIT 100
        `;
        
        const recentResult = await pool.query(recentQuery);
        const recentSubscribers = recentResult.rows;

        // Get analytics from analytics table if it exists
        let analytics = {
            totalSubscriptions: parseInt(stats.total) || 0,
            totalUnsubscriptions: parseInt(stats.unsubscribed) || 0
        };

        try {
            const analyticsQuery = `
                SELECT metric_name, metric_value, month
                FROM analytics
                WHERE metric_name IN ('subscriptions', 'unsubscriptions')
                ORDER BY month DESC
            `;
            const analyticsResult = await pool.query(analyticsQuery);
            
            const subscriptionsByMonth = {};
            const unsubscriptionsByMonth = {};
            
            analyticsResult.rows.forEach(row => {
                if (row.metric_name === 'subscriptions') {
                    subscriptionsByMonth[row.month] = row.metric_value;
                } else if (row.metric_name === 'unsubscriptions') {
                    unsubscriptionsByMonth[row.month] = row.metric_value;
                }
            });
            
            analytics.subscriptionsByMonth = subscriptionsByMonth;
            analytics.unsubscriptionsByMonth = unsubscriptionsByMonth;
        } catch (err) {
            // Analytics table might not exist, that's ok
            console.log('Analytics table not available:', err.message);
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                stats: {
                    active: parseInt(stats.active) || 0,
                    pending: parseInt(stats.pending) || 0,
                    unsubscribed: parseInt(stats.unsubscribed) || 0,
                    total: parseInt(stats.total) || 0
                },
                analytics: analytics,
                recentSubscribers: recentSubscribers
            })
        };

    } catch (error) {
        console.error('Error listing subscribers:', error);
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