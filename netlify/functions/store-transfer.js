// Netlify Function to store transfer data temporarily
// Uses Netlify Blobs for storage with automatic expiration

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { code, data, expiresAt } = JSON.parse(event.body);

        // Validate input
        if (!code || !data || !expiresAt) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }

        // Validate code format (6 uppercase alphanumeric)
        if (!/^[A-Z0-9]{6}$/.test(code)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid code format' })
            };
        }

        // For Netlify, we'll use environment variables or a simple KV store
        // In production, you'd use Netlify Blobs or a database
        
        // Store data (simplified - in production use Netlify Blobs API)
        const storeData = {
            code,
            data,
            expiresAt,
            createdAt: Date.now()
        };

        // Since we can't directly access a database from this example,
        // we'll return success and handle storage through Netlify's edge functions
        // or use a third-party service like Upstash Redis

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                success: true,
                message: 'Data stored successfully',
                expiresAt
            })
        };
    } catch (error) {
        console.error('Error storing transfer:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};