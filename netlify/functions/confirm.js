// Netlify Function to confirm email subscriptions
// Handles double opt-in confirmation for GDPR compliance

const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

exports.handler = async (event, context) => {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: {
                'Content-Type': 'text/html',
            },
            body: `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Method Not Allowed</title>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
                    <h1 style="color: #e74c3c;">Method Not Allowed</h1>
                    <p>This endpoint only accepts GET requests.</p>
                </body>
                </html>
            `
        };
    }

    try {
        const token = event.queryStringParameters?.token;

        if (!token) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'text/html',
                },
                body: generateErrorPage('Missing confirmation token', 'The confirmation link appears to be invalid.')
            };
        }

        // Get the Netlify Blobs store
        const store = getStore('subscribers');
        const subscribersList = await store.list();
        
        let foundSubscriber = null;
        let foundKey = null;

        // Find subscriber with matching token
        for (const blob of subscribersList.blobs) {
            if (blob.key === '_analytics') continue;
            
            try {
                const subscriberData = JSON.parse(await store.get(blob.key));
                if (subscriberData.confirmationToken === token) {
                    foundSubscriber = subscriberData;
                    foundKey = blob.key;
                    break;
                }
            } catch (err) {
                console.error(`Error processing subscriber ${blob.key}:`, err);
            }
        }

        if (!foundSubscriber) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'text/html',
                },
                body: generateErrorPage('Invalid confirmation token', 'This confirmation link is not valid or may have already been used.')
            };
        }

        // Check if token has expired
        if (new Date() > new Date(foundSubscriber.confirmationExpires)) {
            return {
                statusCode: 410,
                headers: {
                    'Content-Type': 'text/html',
                },
                body: generateErrorPage('Confirmation link expired', 'This confirmation link has expired. Please subscribe again to receive a new confirmation email.')
            };
        }

        // Check if already confirmed
        if (foundSubscriber.status === 'active') {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'text/html',
                },
                body: generateSuccessPage('Already confirmed', 'Your email subscription was already confirmed. Thank you!')
            };
        }

        // Confirm the subscription
        foundSubscriber.status = 'active';
        foundSubscriber.confirmedAt = new Date().toISOString();
        // Remove confirmation token and expiry for security
        delete foundSubscriber.confirmationToken;
        delete foundSubscriber.confirmationExpires;

        await store.set(foundKey, JSON.stringify(foundSubscriber));

        // Update analytics for confirmed subscription
        await updateAnalytics(store, 'subscribe');

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/html',
            },
            body: generateSuccessPage('Subscription confirmed!', 'Thank you for confirming your subscription. You\'ll be notified when the Energy Landscape Theory book is released.')
        };

    } catch (error) {
        console.error('Error confirming subscription:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'text/html',
            },
            body: generateErrorPage('Server Error', 'An error occurred while confirming your subscription. Please try again later.')
        };
    }
};

function generateSuccessPage(title, message) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    max-width: 600px; 
                    margin: 50px auto; 
                    padding: 20px; 
                    text-align: center; 
                    line-height: 1.6;
                }
                .success { color: #27ae60; }
                .button { 
                    display: inline-block; 
                    background: #3B7D69; 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <h1 class="success">✅ ${title}</h1>
            <p>${message}</p>
            <a href="/" class="button">Return to Energy Landscape Theory</a>
        </body>
        </html>
    `;
}

function generateErrorPage(title, message) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    max-width: 600px; 
                    margin: 50px auto; 
                    padding: 20px; 
                    text-align: center; 
                    line-height: 1.6;
                }
                .error { color: #e74c3c; }
                .button { 
                    display: inline-block; 
                    background: #3B7D69; 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <h1 class="error">❌ ${title}</h1>
            <p>${message}</p>
            <a href="/" class="button">Return to Energy Landscape Theory</a>
        </body>
        </html>
    `;
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
                subscriptionAttempts: 0,
                subscriptionsByMonth: {},
                unsubscriptionsByMonth: {},
                subscriptionAttemptsByMonth: {}
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
        } else if (action === 'subscription_attempt') {
            analytics.subscriptionAttempts++;
            analytics.subscriptionAttemptsByMonth[currentMonth] = 
                (analytics.subscriptionAttemptsByMonth[currentMonth] || 0) + 1;
        }

        await store.set('_analytics', JSON.stringify(analytics));
    } catch (error) {
        console.error('Error updating analytics:', error);
        // Don't throw - analytics failure shouldn't break subscription
    }
}