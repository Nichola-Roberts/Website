exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
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
        const { email } = JSON.parse(event.body);
        
        // Log environment variables (safely)
        console.log('Environment check:', {
            hasAwsKey: !!process.env.MY_AWS_ACCESS_KEY_ID,
            hasAwsSecret: !!process.env.MY_AWS_SECRET_ACCESS_KEY,
            hasFromEmail: !!process.env.SES_FROM_ADDRESS,
            region: process.env.MY_AWS_REGION
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                success: true,
                message: 'Test function working - check logs for environment variables'
            })
        };
        
    } catch (error) {
        console.error('Test function error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'Test function error',
                details: error.message
            })
        };
    }
};