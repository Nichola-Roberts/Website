// Netlify Function to list subscribers (admin function)
// Uses Netlify Blobs for subscriber storage
// Requires authentication in production

const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
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
        // In production, add authentication here
        // const authToken = event.headers.authorization;
        // if (!authToken || !isValidAdminToken(authToken)) {
        //     return {
        //         statusCode: 401,
        //         body: JSON.stringify({ error: 'Unauthorized' })
        //     };
        // }

        // Get the Netlify Blobs store
        const store = getStore('subscribers');
        const subscribersList = await store.list();
        
        const subscribers = [];
        let activeCount = 0;
        let deletedCount = 0;
        let analytics = null;

        for (const blob of subscribersList.blobs) {
            // Handle analytics blob separately
            if (blob.key === '_analytics') {
                try {
                    analytics = JSON.parse(await store.get(blob.key));
                } catch (err) {
                    console.error('Error processing analytics:', err);
                }
                continue;
            }

            try {
                const subscriberData = JSON.parse(await store.get(blob.key));
                subscribers.push(subscriberData);
                
                if (subscriberData.status === 'active') {
                    activeCount++;
                } else if (subscriberData.status === 'unsubscribed_deleted') {
                    deletedCount++;
                }
            } catch (err) {
                console.error(`Error processing subscriber ${blob.key}:`, err);
            }
        }

        // Sort by subscription date (newest first)
        subscribers.sort((a, b) => new Date(b.subscribedAt) - new Date(a.subscribedAt));

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                stats: {
                    active: activeCount,
                    deleted: deletedCount,
                    total: activeCount + deletedCount
                },
                analytics: analytics || {
                    totalSubscriptions: 0,
                    totalUnsubscriptions: 0,
                    subscriptionsByMonth: {},
                    unsubscriptionsByMonth: {}
                },
                subscribers
            })
        };

    } catch (error) {
        console.error('Error listing subscribers:', error);
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