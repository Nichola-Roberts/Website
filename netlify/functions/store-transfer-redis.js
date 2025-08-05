// Production-ready store function using Upstash Redis
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Netlify environment variables

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Handle preflight CORS request
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

    try {
        const { code, data, expiresAt } = JSON.parse(event.body);

        // Validate input
        if (!code || !data || !expiresAt) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Missing required fields' })
            };
        }

        // Validate code format (4 alphanumeric characters - storage key only)
        if (!/^[A-Z0-9]{4}$/.test(code)) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Invalid code format' })
            };
        }

        const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (!redisUrl || !redisToken) {
            console.error('Redis credentials not configured');
            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Service configuration error' })
            };
        }

        // Store in Redis with TTL (2 hours = 7200 seconds)
        const key = `transfer:${code}`;
        const storeData = {
            data,
            createdAt: Date.now(),
            expiresAt
        };

        const response = await fetch(`${redisUrl}/setex/${key}/7200`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${redisToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(storeData)
        });

        if (!response.ok) {
            throw new Error('Failed to store in Redis');
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: 'Transfer code created',
                expiresAt: new Date(expiresAt).toISOString()
            })
        };

    } catch (error) {
        console.error('Error storing transfer:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Failed to create transfer code' })
        };
    }
};