// Netlify Function to handle mailing list subscriptions
// Uses Netlify Blobs for subscriber storage with email encryption

// const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');
const AWS = require('aws-sdk');

// Configure AWS SES
AWS.config.update({
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY,
    region: process.env.MY_AWS_REGION || 'us-east-1'
});

const ses = new AWS.SES();

exports.handler = async (event, context) => {
    // Only allow POST requests
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

        // TODO: Implement proper storage later
        console.log('Email subscription request for:', email.toLowerCase());
        
        // Generate confirmation token
        const confirmationToken = crypto.randomBytes(32).toString('hex');

        // Send confirmation email
        await sendConfirmationEmail(email.toLowerCase(), confirmationToken);

        // TODO: Update analytics later
        console.log('Subscription attempt logged');

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                success: true,
                message: 'Please check your email and click the confirmation link to complete your subscription'
            })
        };

    } catch (error) {
        console.error('Error subscribing email:', error);
        console.error('Error stack:', error.stack);
        console.error('Error message:', error.message);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error.message // Remove this in production
            })
        };
    }
};

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function encryptEmail(email) {
    try {
        const keyString = process.env.ENCRYPTION_KEY || 'default-key-please-change-in-production!';
        const key = crypto.createHash('sha256').update(keyString).digest(); // Ensure 32 bytes
        const iv = crypto.randomBytes(16); // Random initialization vector
        const cipher = crypto.createCipherGCM('aes-256-gcm', key, iv);
        
        let encrypted = cipher.update(email, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        // Return IV + AuthTag + Encrypted data (all hex encoded)
        return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt email');
    }
}

function decryptEmail(encryptedData) {
    try {
        const keyString = process.env.ENCRYPTION_KEY || 'default-key-please-change-in-production!';
        const key = crypto.createHash('sha256').update(keyString).digest(); // Ensure 32 bytes
        const parts = encryptedData.split(':');
        
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        
        const decipher = crypto.createDecipherGCM('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt email');
    }
}

function hashEmail(email) {
    // Create a consistent hash of the email for use as storage key
    return crypto.createHash('sha256').update(email).digest('hex');
}

async function sendConfirmationEmail(email, confirmationToken) {
    try {
        const fromEmail = process.env.SES_FROM_ADDRESS || process.env.FROM_EMAIL || 'noreply@yoursite.com';
        const confirmationUrl = `${process.env.MY_URL || 'https://yoursite.netlify.app'}/.netlify/functions/confirm?token=${confirmationToken}`;
        
        const subject = 'Please confirm your subscription - Energy Landscape Theory';
        
        const htmlBody = `
            <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #3B7D69;">Confirm Your Subscription</h2>
                
                <p>Thank you for subscribing to updates about the Energy Landscape Theory</p>
                
                <p>To complete your subscription please confirm your email address by clicking the button below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${confirmationUrl}" 
                       style="background: #3B7D69; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
                        Confirm Subscription
                    </a>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${confirmationUrl}</p>
                
                <p style="color: #888; font-size: 14px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
                    This confirmation link will expire in 24 hours. If you didn't request this subscription, you can safely ignore this email.
                </p>
            </div>
        `;
        
        const textBody = `
Confirm Your Subscription - Energy Landscape Theory

Thank you for subscribing to updates about the Energy Landscape Theory

To complete your subscription please confirm your email address by visiting this link:

${confirmationUrl}

This confirmation link will expire in 24 hours. If you didn't request this subscription, you can safely ignore this email.
        `;

        const params = {
            Destination: {
                ToAddresses: [email]
            },
            Message: {
                Body: {
                    Html: { Data: htmlBody },
                    Text: { Data: textBody }
                },
                Subject: { Data: subject }
            },
            Source: fromEmail
        };

        await ses.sendEmail(params).promise();
    } catch (error) {
        console.error('Error sending confirmation email:', error);
        throw error; // Re-throw to handle in main function
    }
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