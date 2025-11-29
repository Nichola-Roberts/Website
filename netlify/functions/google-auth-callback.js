/**
 * Google OAuth Callback
 * Exchanges authorization code for access tokens and user info
 */

const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
    // Allowed origins for CORS
    const allowedOrigins = [
        'https://www.energylandscapetheory.com',
        'https://energylandscapetheory.com',
        'http://localhost:8888'
    ];

    const origin = event.headers.origin || event.headers.Origin;
    const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { code, state } = JSON.parse(event.body);

        if (!code) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Authorization code is required'
                })
            };
        }

        // Validate CSRF token
        if (state !== 'google_drive_sync') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid state parameter'
                })
            };
        }

        // Get Google OAuth credentials
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.URL}/.netlify/functions/google-auth-callback`;

        if (!clientId || !clientSecret) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Google OAuth not configured'
                })
            };
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error('Token exchange error:', tokenData);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: tokenData.error_description || 'Failed to exchange code for tokens'
                })
            };
        }

        // Get user info
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        });

        const userInfo = await userInfoResponse.json();

        if (!userInfoResponse.ok) {
            console.error('User info error:', userInfo);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to fetch user info'
                })
            };
        }

        // Record anonymous stats (async, don't wait for it)
        recordAuthStats(userInfo.id).catch(err => {
            console.error('Stats recording error:', err);
            // Don't fail auth if stats recording fails
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresIn: tokenData.expires_in,
                userInfo: {
                    id: userInfo.id,
                    email: userInfo.email,
                    name: userInfo.name,
                    picture: userInfo.picture
                }
            })
        };
    } catch (error) {
        console.error('OAuth callback error:', error);
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

/**
 * Record anonymous authentication stats
 * @param {string} googleId - The user's Google ID
 */
async function recordAuthStats(googleId) {
    const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
    if (!databaseUrl) {
        return; // No database configured, skip stats
    }

    try {
        const sql = neon(databaseUrl);

        // Hash the Google ID (SHA-256 for anonymity)
        const userHash = crypto.createHash('sha256').update(googleId).digest('hex');

        // Insert or update stats
        await sql`
            INSERT INTO sync_stats (user_hash, first_sync, last_sync, sync_count)
            VALUES (${userHash}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
            ON CONFLICT (user_hash)
            DO UPDATE SET
                last_sync = CURRENT_TIMESTAMP
        `;
    } catch (error) {
        console.error('Failed to record auth stats:', error);
        // Don't throw - we don't want to break auth if stats fail
    }
}
