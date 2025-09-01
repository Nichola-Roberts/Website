// Netlify Function to handle mailing list subscriptions
// Uses Neon PostgreSQL database for subscriber storage with email encryption

const { Pool } = require('pg');
const crypto = require('crypto');
const AWS = require('aws-sdk');

// Configure AWS SES
AWS.config.update({
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY,
    region: process.env.MY_AWS_REGION || 'us-east-1'
});

const ses = new AWS.SES();

// Create connection pool for Neon PostgreSQL
const pool = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Initialize database table on first run
async function initializeDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS subscribers (
                id SERIAL PRIMARY KEY,
                email_hash VARCHAR(64) UNIQUE NOT NULL,
                encrypted_email TEXT NOT NULL,
                subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(20) DEFAULT 'pending',
                source VARCHAR(50) DEFAULT 'website',
                confirmation_token VARCHAR(64),
                confirmation_expires TIMESTAMP WITH TIME ZONE,
                unsubscribed_at TIMESTAMP WITH TIME ZONE
            )
        `);
        
        // Create analytics table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS analytics (
                id SERIAL PRIMARY KEY,
                metric_name VARCHAR(50) NOT NULL,
                metric_value INTEGER DEFAULT 0,
                month VARCHAR(7),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(metric_name, month)
            )
        `);
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

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
        // Test database connection first
        try {
            await pool.query('SELECT 1');
        } catch (dbError) {
            console.error('Database connection error:', dbError.message);
            // Return a user-friendly message when database is unavailable
            return {
                statusCode: 503,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ 
                    error: 'The subscription service is temporarily unavailable. Please try again later or contact support.',
                    message: 'Service temporarily unavailable'
                })
            };
        }
        
        // Initialize database tables
        await initializeDatabase();
        
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

        // Check if email already exists using hash
        const emailHash = hashEmail(email.toLowerCase());
        const existingUser = await pool.query(
            'SELECT id, status FROM subscribers WHERE email_hash = $1',
            [emailHash]
        );
        
        if (existingUser.rows.length > 0) {
            const user = existingUser.rows[0];
            if (user.status === 'active' || user.status === 'pending') {
                return {
                    statusCode: 409,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({ error: 'Email already subscribed' })
                };
            }
        }

        // Encrypt email for storage
        const encryptedEmail = encryptEmail(email.toLowerCase());
        
        // Generate confirmation token
        const confirmationToken = crypto.randomBytes(32).toString('hex');
        const confirmationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        // Insert or update subscriber
        await pool.query(`
            INSERT INTO subscribers (email_hash, encrypted_email, status, source, confirmation_token, confirmation_expires)
            VALUES ($1, $2, 'pending', 'website', $3, $4)
            ON CONFLICT (email_hash) 
            DO UPDATE SET 
                encrypted_email = $2,
                status = 'pending',
                confirmation_token = $3,
                confirmation_expires = $4,
                subscribed_at = CURRENT_TIMESTAMP,
                unsubscribed_at = NULL
        `, [emailHash, encryptedEmail, confirmationToken, confirmationExpires]);

        // Send confirmation email
        await sendConfirmationEmail(email.toLowerCase(), confirmationToken);

        // Update analytics for subscription attempt
        await updateAnalytics('subscription_attempt');

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
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        
        let encrypted = cipher.update(email, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Return IV + Encrypted data (all hex encoded)
        return iv.toString('hex') + ':' + encrypted;
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
        
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted data format');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        
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

async function updateAnalytics(action) {
    try {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        
        // Update total counts
        await pool.query(`
            INSERT INTO analytics (metric_name, metric_value, month)
            VALUES ($1, 1, NULL)
            ON CONFLICT (metric_name, month)
            DO UPDATE SET 
                metric_value = analytics.metric_value + 1,
                updated_at = CURRENT_TIMESTAMP
        `, [`total_${action}s`]);
        
        // Update monthly counts
        await pool.query(`
            INSERT INTO analytics (metric_name, metric_value, month)
            VALUES ($1, 1, $2)
            ON CONFLICT (metric_name, month)
            DO UPDATE SET 
                metric_value = analytics.metric_value + 1,
                updated_at = CURRENT_TIMESTAMP
        `, [`${action}s`, currentMonth]);
        
    } catch (error) {
        console.error('Error updating analytics:', error);
        // Don't throw - analytics failure shouldn't break subscription
    }
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