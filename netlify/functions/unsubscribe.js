// Netlify Function to handle mailing list unsubscribes
// Uses Netlify Blobs for subscriber storage with email encryption

const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

exports.handler = async (event, context) => {
    // Allow both POST and GET requests for unsubscribe links
    if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
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
        let email;
        
        if (event.httpMethod === 'POST') {
            const { email: bodyEmail } = JSON.parse(event.body);
            email = bodyEmail;
        } else {
            // GET request with email in query params
            email = event.queryStringParameters?.email;
        }

        // Validate email
        if (!email || !isValidEmail(email)) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Valid email address is required' })
            };
        }

        // Get the Netlify Blobs store
        const store = getStore('subscribers');
        
        // Check if email exists using hash
        const emailKey = hashEmail(email.toLowerCase());
        let subscriberData;
        try {
            const data = await store.get(emailKey);
            subscriberData = JSON.parse(data);
        } catch (err) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Email not found in subscription list' })
            };
        }

        // Soft delete: remove personal data but keep metrics data
        const anonymizedData = {
            email: "[deleted]",
            subscribedAt: subscriberData.subscribedAt,
            unsubscribedAt: new Date().toISOString(),
            status: "unsubscribed_deleted",
            source: subscriberData.source
        };

        await store.set(emailKey, JSON.stringify(anonymizedData));
        
        // Update analytics
        await updateAnalytics(store, 'unsubscribe');

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                success: true,
                message: 'Successfully unsubscribed from the mailing list'
            })
        };

    } catch (error) {
        console.error('Error unsubscribing email:', error);
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

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function hashEmail(email) {
    // Create a consistent hash of the email for use as storage key
    return crypto.createHash('sha256').update(email).digest('hex');
}

async function updateAnalytics(store, action) {
    try {
        let analytics;
        try {
            const analyticsData = await store.get('_analytics');
            analytics = JSON.parse(analyticsData);
        } catch (err) {
            // Analytics blob doesn't exist, create new one
            analytics = {
                totalSubscriptions: 0,
                totalUnsubscriptions: 0,
                subscriptionsByMonth: {},
                unsubscriptionsByMonth: {}
            };
        }

        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

        if (action === 'subscribe') {
            analytics.totalSubscriptions++;
            analytics.subscriptionsByMonth[currentMonth] = 
                (analytics.subscriptionsByMonth[currentMonth] || 0) + 1;
        } else if (action === 'unsubscribe') {
            analytics.totalUnsubscriptions++;
            analytics.unsubscriptionsByMonth[currentMonth] = 
                (analytics.unsubscriptionsByMonth[currentMonth] || 0) + 1;
        }

        await store.set('_analytics', JSON.stringify(analytics));
    } catch (error) {
        console.error('Error updating analytics:', error);
        // Don't throw - analytics failure shouldn't break subscription
    }
}