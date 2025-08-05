// Netlify Function to retrieve transfer data

exports.handler = async (event, context) => {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const code = event.queryStringParameters?.code;

        // Validate input
        if (!code) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing transfer code' })
            };
        }

        // Validate code format
        if (!/^[A-Z0-9]{6}$/.test(code)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid code format' })
            };
        }

        // In production, retrieve from Netlify Blobs or database
        // For now, return a mock response for testing
        
        // Check if code exists and hasn't expired
        // This would be a real database query in production

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                data: 'encrypted_data_here' // Would be actual encrypted data
            })
        };
    } catch (error) {
        console.error('Error retrieving transfer:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};