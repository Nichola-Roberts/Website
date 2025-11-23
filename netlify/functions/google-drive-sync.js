/**
 * Google Drive Sync
 * Syncs user data to Google Drive
 */

const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Get access token from Authorization header
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Missing or invalid authorization header'
                })
            };
        }

        const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
        const { data, fileId } = JSON.parse(event.body);

        if (!data) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Data is required'
                })
            };
        }

        const folderName = '.energylandscapetheory';
        const fileName = 'notes.json';

        let resultFileId = fileId;

        if (fileId) {
            // Update existing file
            const updateResponse = await fetch(
                `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                }
            );

            if (updateResponse.status === 401) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'token_expired'
                    })
                };
            }

            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                console.error('Drive update error:', errorData);

                // If file not found, create new one
                if (errorData.error?.code === 404) {
                    resultFileId = null;
                } else {
                    return {
                        statusCode: updateResponse.status,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            error: 'Failed to update file in Drive'
                        })
                    };
                }
            }
        }

        if (!resultFileId) {
            // Check if folder exists
            const searchResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            const searchData = await searchResponse.json();
            let folderId = null;

            if (searchData.files && searchData.files.length > 0) {
                folderId = searchData.files[0].id;
            } else {
                // Create folder
                const folderResponse = await fetch(
                    'https://www.googleapis.com/drive/v3/files',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: folderName,
                            mimeType: 'application/vnd.google-apps.folder'
                        })
                    }
                );

                if (!folderResponse.ok) {
                    const errorData = await folderResponse.json();
                    console.error('Folder creation error:', errorData);
                    return {
                        statusCode: folderResponse.status,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            error: 'Failed to create folder in Drive'
                        })
                    };
                }

                const folderData = await folderResponse.json();
                folderId = folderData.id;
            }

            // Create new file
            const metadata = {
                name: fileName,
                parents: [folderId],
                mimeType: 'application/json'
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }));

            // Use multipart upload
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";

            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(data) +
                close_delim;

            const createResponse = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': `multipart/related; boundary=${boundary}`
                    },
                    body: multipartRequestBody
                }
            );

            if (!createResponse.ok) {
                const errorData = await createResponse.json();
                console.error('File creation error:', errorData);
                return {
                    statusCode: createResponse.status,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Failed to create file in Drive'
                    })
                };
            }

            const fileData = await createResponse.json();
            resultFileId = fileData.id;
        }

        // Record anonymous sync stats (async, don't wait for it)
        recordSyncStats(accessToken).catch(err => {
            console.error('Stats recording error:', err);
            // Don't fail sync if stats recording fails
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                fileId: resultFileId,
                message: 'Successfully synced to Google Drive'
            })
        };
    } catch (error) {
        console.error('Drive sync error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};

/**
 * Record anonymous sync stats
 * @param {string} accessToken - Google access token
 */
async function recordSyncStats(accessToken) {
    const databaseUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
    if (!databaseUrl) {
        return; // No database configured, skip stats
    }

    try {
        // Fetch user info from Google to get the user ID
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!userInfoResponse.ok) {
            console.error('Failed to fetch user info for stats');
            return;
        }

        const userInfo = await userInfoResponse.json();
        const googleId = userInfo.id;

        const sql = neon(databaseUrl);

        // Hash the Google ID (SHA-256 for anonymity)
        const userHash = crypto.createHash('sha256').update(googleId).digest('hex');

        // Update sync count and last_sync time
        await sql`
            INSERT INTO sync_stats (user_hash, first_sync, last_sync, sync_count)
            VALUES (${userHash}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
            ON CONFLICT (user_hash)
            DO UPDATE SET
                last_sync = CURRENT_TIMESTAMP,
                sync_count = sync_stats.sync_count + 1
        `;
    } catch (error) {
        console.error('Failed to record sync stats:', error);
        // Don't throw - we don't want to break sync if stats fail
    }
}
