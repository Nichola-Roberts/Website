// Netlify Function to send emails via AWS SES
// Requires AWS SES credentials in environment variables

const AWS = require('aws-sdk');
const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

// Configure AWS SES
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
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

    // SECURITY: Require admin authentication
    const authToken = event.headers.authorization || event.headers.Authorization;
    if (!authToken || !isValidAdminToken(authToken)) {
        return {
            statusCode: 401,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Unauthorized: Admin access required' })
        };
    }

    // SECURITY: Rate limiting check
    const rateLimitCheck = await checkRateLimit();
    if (!rateLimitCheck.allowed) {
        return {
            statusCode: 429,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'Rate limit exceeded',
                retryAfter: rateLimitCheck.retryAfter
            })
        };
    }

    try {
        const { subject, htmlBody, textBody, type } = JSON.parse(event.body);

        // Validate input
        if (!subject || (!htmlBody && !textBody)) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Subject and body content are required' })
            };
        }

        // Get active subscribers from Netlify Blobs
        const store = getStore('subscribers');
        const subscribersList = await store.list();
        
        const activeSubscribers = [];
        for (const key of subscribersList.blobs) {
            // Skip analytics blob
            if (key.key === '_analytics') continue;
            
            try {
                const subscriberData = JSON.parse(await store.get(key.key));
                // Only send to confirmed active subscribers (double opt-in)
                if (subscriberData.status === 'active' && subscriberData.confirmedAt) {
                    // Decrypt email before adding to send list
                    const decryptedEmail = decryptEmail(subscriberData.email);
                    activeSubscribers.push(decryptedEmail);
                }
            } catch (err) {
                console.error(`Error processing subscriber ${key.key}:`, err);
            }
        }

        if (activeSubscribers.length === 0) {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ 
                    success: true,
                    message: 'No active subscribers to send to',
                    sentCount: 0
                })
            };
        }

        // Email configuration
        const fromEmail = process.env.FROM_EMAIL || 'noreply@yoursite.com';
        const replyToEmail = process.env.REPLY_TO_EMAIL || fromEmail;
        
        let sentCount = 0;
        const errors = [];

        // Send emails in batches to avoid SES rate limits
        const batchSize = 10;
        for (let i = 0; i < activeSubscribers.length; i += batchSize) {
            const batch = activeSubscribers.slice(i, i + batchSize);
            
            const sendPromises = batch.map(async (email) => {
                try {
                    const unsubscribeUrl = `${process.env.URL || 'https://yoursite.netlify.app'}/.netlify/functions/unsubscribe?email=${encodeURIComponent(email)}`;
                    
                    const emailHtml = htmlBody ? htmlBody + `
                        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 12px;">
                            <p>You're receiving this because you subscribed to our mailing list.</p>
                            <p><a href="${unsubscribeUrl}">Unsubscribe</a></p>
                        </div>
                    ` : undefined;

                    const emailText = textBody ? textBody + `\n\n---\nYou're receiving this because you subscribed to our mailing list.\nTo unsubscribe, visit: ${unsubscribeUrl}` : undefined;

                    const params = {
                        Destination: {
                            ToAddresses: [email]
                        },
                        Message: {
                            Body: {
                                ...(emailHtml && { Html: { Data: emailHtml } }),
                                ...(emailText && { Text: { Data: emailText } })
                            },
                            Subject: { Data: subject }
                        },
                        Source: fromEmail,
                        ReplyToAddresses: [replyToEmail]
                    };

                    await ses.sendEmail(params).promise();
                    sentCount++;
                } catch (error) {
                    console.error(`Error sending email to ${email}:`, error);
                    errors.push({ email, error: error.message });
                }
            });

            await Promise.all(sendPromises);
            
            // Add delay between batches to respect SES rate limits
            if (i + batchSize < activeSubscribers.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: `Email sent to ${sentCount} subscribers`,
                sentCount,
                totalSubscribers: activeSubscribers.length,
                errors: errors.length > 0 ? errors : undefined
            })
        };

    } catch (error) {
        console.error('Error sending emails:', error);
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

function isValidAdminToken(token) {
    // SECURITY: Check admin authentication token
    const expectedToken = process.env.ADMIN_EMAIL_TOKEN;
    if (!expectedToken) {
        console.warn('ADMIN_EMAIL_TOKEN not set - email sending disabled');
        return false;
    }
    
    // Remove "Bearer " prefix if present
    const cleanToken = token.replace(/^Bearer\s+/, '');
    return cleanToken === expectedToken;
}

async function checkRateLimit() {
    try {
        const store = getStore('subscribers');
        const rateLimitKey = '_email_rate_limit';
        
        let rateLimitData;
        try {
            const data = await store.get(rateLimitKey);
            rateLimitData = JSON.parse(data);
        } catch (err) {
            // No rate limit data exists
            rateLimitData = {
                lastSent: 0,
                sentToday: 0,
                lastReset: new Date().toISOString().slice(0, 10) // YYYY-MM-DD
            };
        }

        const today = new Date().toISOString().slice(0, 10);
        const now = Date.now();
        
        // Reset daily counter if new day
        if (rateLimitData.lastReset !== today) {
            rateLimitData.sentToday = 0;
            rateLimitData.lastReset = today;
        }

        // SECURITY: Daily limit (adjust as needed)
        const DAILY_LIMIT = 10; // Maximum 10 email campaigns per day
        
        // SECURITY: Minimum time between sends (5 minutes)
        const MIN_INTERVAL = 5 * 60 * 1000; 
        
        if (rateLimitData.sentToday >= DAILY_LIMIT) {
            return {
                allowed: false,
                retryAfter: 'tomorrow'
            };
        }

        if (now - rateLimitData.lastSent < MIN_INTERVAL) {
            const retryAfter = Math.ceil((MIN_INTERVAL - (now - rateLimitData.lastSent)) / 1000);
            return {
                allowed: false,
                retryAfter: `${retryAfter} seconds`
            };
        }

        // Update rate limit data
        rateLimitData.lastSent = now;
        rateLimitData.sentToday++;
        await store.set(rateLimitKey, JSON.stringify(rateLimitData));

        return { allowed: true };

    } catch (error) {
        console.error('Rate limit check error:', error);
        // On error, be conservative and deny
        return { allowed: false, retryAfter: '1 hour' };
    }
}

function decryptEmail(encryptedData) {
    try {
        const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-please-change-in-production!', 'utf8');
        const parts = encryptedData.split(':');
        
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        
        const decipher = crypto.createDecipher('aes-256-gcm', key);
        decipher.setAuthTag(authTag);
        decipher.setAutoPadding(true);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt email');
    }
}