/**
 * Database Setup for Sync Statistics
 * Creates the sync_stats table for anonymous usage tracking
 * Run this once to initialize the database
 */

const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        // Get database connection string
        const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;

        if (!databaseUrl) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Database connection not configured'
                })
            };
        }

        // Connect to database
        const sql = neon(databaseUrl);

        // Create sync_stats table
        await sql`
            CREATE TABLE IF NOT EXISTS sync_stats (
                user_hash VARCHAR(64) PRIMARY KEY,
                first_sync TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                last_sync TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                sync_count INTEGER DEFAULT 1,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Create index for faster queries
        await sql`
            CREATE INDEX IF NOT EXISTS idx_sync_stats_last_sync
            ON sync_stats(last_sync DESC)
        `;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Sync stats table created successfully',
                schema: {
                    table: 'sync_stats',
                    columns: [
                        'user_hash (VARCHAR 64) - SHA-256 hash of Google ID',
                        'first_sync (TIMESTAMP) - When user first synced',
                        'last_sync (TIMESTAMP) - Most recent sync',
                        'sync_count (INTEGER) - Total number of syncs',
                        'created_at (TIMESTAMP) - Record creation time'
                    ]
                }
            })
        };
    } catch (error) {
        console.error('Database setup error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message,
                details: 'Failed to create sync_stats table'
            })
        };
    }
};
