/**
 * View Sync Statistics
 * Returns anonymous usage statistics for the Google sync feature
 *
 * Access: Admin only (requires ADMIN_SECRET environment variable)
 */

const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Simple admin authentication
        const adminSecret = process.env.ADMIN_SECRET;
        const providedSecret = event.queryStringParameters?.secret;

        if (!adminSecret || providedSecret !== adminSecret) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Unauthorized. Admin access required.'
                })
            };
        }

        // Get database connection
        const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
        if (!databaseUrl) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Database not configured'
                })
            };
        }

        const sql = neon(databaseUrl);

        // Get overall statistics
        const overallStats = await sql`
            SELECT
                COUNT(*) as total_users,
                SUM(sync_count) as total_syncs,
                AVG(sync_count)::numeric(10,2) as avg_syncs_per_user,
                MAX(sync_count) as max_syncs,
                MIN(first_sync) as earliest_user,
                MAX(first_sync) as newest_user
            FROM sync_stats
        `;

        // Get recent activity (users who synced in last 24 hours)
        const recentActivity = await sql`
            SELECT COUNT(*) as active_users_24h
            FROM sync_stats
            WHERE last_sync >= NOW() - INTERVAL '24 hours'
        `;

        // Get recent activity (users who synced in last 7 days)
        const weeklyActivity = await sql`
            SELECT COUNT(*) as active_users_7d
            FROM sync_stats
            WHERE last_sync >= NOW() - INTERVAL '7 days'
        `;

        // Get top syncing users (anonymous hashes only)
        const topUsers = await sql`
            SELECT
                user_hash,
                sync_count,
                first_sync,
                last_sync
            FROM sync_stats
            ORDER BY sync_count DESC
            LIMIT 10
        `;

        // Get new users per day (last 7 days)
        const newUsersPerDay = await sql`
            SELECT
                DATE(first_sync) as date,
                COUNT(*) as new_users
            FROM sync_stats
            WHERE first_sync >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(first_sync)
            ORDER BY date DESC
        `;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                stats: {
                    overview: {
                        total_users: parseInt(overallStats[0].total_users),
                        total_syncs: parseInt(overallStats[0].total_syncs),
                        avg_syncs_per_user: parseFloat(overallStats[0].avg_syncs_per_user),
                        max_syncs_by_single_user: parseInt(overallStats[0].max_syncs),
                        earliest_user_signup: overallStats[0].earliest_user,
                        newest_user_signup: overallStats[0].newest_user
                    },
                    activity: {
                        active_last_24_hours: parseInt(recentActivity[0].active_users_24h),
                        active_last_7_days: parseInt(weeklyActivity[0].active_users_7d)
                    },
                    top_users: topUsers.map(user => ({
                        user_hash: user.user_hash,
                        sync_count: parseInt(user.sync_count),
                        first_sync: user.first_sync,
                        last_sync: user.last_sync
                    })),
                    new_users_by_day: newUsersPerDay.map(day => ({
                        date: day.date,
                        new_users: parseInt(day.new_users)
                    }))
                },
                note: 'All user_hash values are SHA-256 hashes. User identities cannot be determined from these values.'
            })
        };
    } catch (error) {
        console.error('Stats viewing error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};
