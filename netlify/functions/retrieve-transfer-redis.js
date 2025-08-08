// Production-ready retrieve function using Upstash Redis

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const code = event.queryStringParameters?.code;

        if (!code) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Missing transfer code' })
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
            return {
                statusCode: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Service configuration error' })
            };
        }

        // Get from Redis
        const key = `transfer:${code}`;
        const response = await fetch(`${redisUrl}/get/${key}`, {
            headers: {
                'Authorization': `Bearer ${redisToken}`
            }
        });

        const result = await response.json();

        if (!result.result) {
            return {
                statusCode: 404,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Transfer code not found or expired' })
            };
        }

        const transferData = JSON.parse(result.result);

        // Check if expired (double-check even though Redis handles TTL)
        if (Date.now() > transferData.expiresAt) {
            // Delete expired key
            await fetch(`${redisUrl}/del/${key}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${redisToken}`
                }
            });

            return {
                statusCode: 404,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Transfer code expired' })
            };
        }

        // DON'T delete the key - let it persist for 2 hours as set by TTL
        // await fetch(`${redisUrl}/del/${key}`, {
        //     method: 'POST', 
        //     headers: {
        //         'Authorization': `Bearer ${redisToken}`
        //     }
        // });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                data: transferData.data
            })
        };

    } catch (error) {
        console.error('Error retrieving transfer:', error);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Failed to retrieve transfer data' })
        };
    }
};