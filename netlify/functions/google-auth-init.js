/**
 * Google OAuth Initialization
 * Generates the Google OAuth URL for user authentication
 */

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        // Get Google OAuth credentials from environment variables
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.URL}/.netlify/functions/google-auth-callback`;

        if (!clientId) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID environment variable.'
                })
            };
        }

        // Google OAuth scopes - only request access to files created by this app
        const scopes = [
            'https://www.googleapis.com/auth/drive.file', // Only files created by this app
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'
        ].join(' ');

        // Build OAuth URL
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scopes,
            access_type: 'offline', // Request refresh token
            prompt: 'consent', // Force consent to get refresh token
            state: 'google_drive_sync' // CSRF protection
        });

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                authUrl
            })
        };
    } catch (error) {
        console.error('Auth init error:', error);
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
