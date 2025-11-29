# Google Sync Setup Instructions

This guide explains how to set up Google OAuth authentication for the sync feature.

## Overview

The sync feature allows users to:
- Sign in with their Google account
- Automatically sync notes, reading progress, and settings to their Google Drive
- Access their data from any device
- Optionally join the mailing list during sign-up

**Privacy Note:** User notes are stored in THEIR Google Drive, not your server. You only have access to files created by your app.

## Prerequisites

- Google Cloud Platform account
- Netlify account with your site deployed
- Access to your Netlify environment variables

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Energy Landscape Theory Sync" (or your preferred name)
4. Click "Create"

## Step 2: Enable Required APIs

1. In your project, go to "APIs & Services" → "Library"
2. Search for and enable these APIs:
   - **Google Drive API** (for storing user notes)
   - **Google+ API** (for user profile info)

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select **External** (unless you have a Google Workspace account)
3. Fill in the required fields:
   - **App name:** Energy Landscape Theory
   - **User support email:** [your email]
   - **Developer contact email:** [your email]
4. Click "Save and Continue"
5. **Scopes:** Click "Add or Remove Scopes" and add:
   - `https://www.googleapis.com/auth/drive.file` (Create files only)
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
6. Click "Save and Continue"
7. **Test users:** Add your email for testing
8. Click "Save and Continue"

## Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: **Web application**
4. Name: "Energy Landscape Theory Web Client"
5. **Authorized JavaScript origins:**
   ```
   https://www.energylandscapetheory.com
   https://energylandscapetheory.com
   http://localhost:8888
   ```
6. **Authorized redirect URIs:**
   ```
   https://www.energylandscapetheory.com/.netlify/functions/google-auth-callback
   https://energylandscapetheory.com/.netlify/functions/google-auth-callback
   http://localhost:8888/.netlify/functions/google-auth-callback
   ```
7. Click "Create"
8. **SAVE YOUR CREDENTIALS:**
   - Client ID (looks like: `123456789-abc123.apps.googleusercontent.com`)
   - Client Secret (looks like: `GOCSPX-abc123def456`)

## Step 5: Add Environment Variables to Netlify

1. Go to your Netlify dashboard
2. Select your site
3. Go to "Site configuration" → "Environment variables"
4. Add these variables:

   | Variable Name | Value | Description |
   |--------------|-------|-------------|
   | `GOOGLE_CLIENT_ID` | Your Client ID from Step 4 | OAuth client ID |
   | `GOOGLE_CLIENT_SECRET` | Your Client Secret from Step 4 | OAuth client secret |
   | `GOOGLE_REDIRECT_URI` | `https://www.energylandscapetheory.com/.netlify/functions/google-auth-callback` | OAuth callback URL |

5. Click "Save"

## Step 6: Deploy

1. Deploy your changes to Netlify:
   ```bash
   git add .
   git commit -m "Add Google Drive sync feature"
   git push
   ```

2. Wait for Netlify to rebuild (usually 1-2 minutes)

## Step 7: Test

1. Visit your site: `https://www.energylandscapetheory.com`
2. Click the accessibility controls
3. Click the "Sync" button (rocket icon)
4. Click "Sign in with Google"
5. You should see Google's consent screen
6. After authorizing:
   - Your notes should sync automatically
   - If you checked the mailing list box, you should receive a confirmation email

## Troubleshooting

### "Error 400: redirect_uri_mismatch"
- Check that your redirect URI in Google Cloud Console exactly matches your Netlify environment variable
- Make sure there are no trailing slashes
- Ensure the protocol (http/https) matches

### "Access blocked: This app's request is invalid"
- Make sure you've added yourself as a test user in the OAuth consent screen
- Check that all required scopes are added

### "Failed to fetch file from Drive"
- User might need to re-authorize
- Check that Google Drive API is enabled in your project

### "Token expired" errors
- This is normal - the refresh token should automatically renew it
- If it persists, user should sign out and sign in again

## Security Notes

1. **Never commit credentials to git** - they should only be in Netlify environment variables
2. **Scope limitation** - The app can only access files it creates, not other Drive files
3. **Tokens stored client-side** - Access tokens are in user's browser localStorage, not your database
4. **HTTPS required** - OAuth won't work over HTTP in production

## Publishing the App

The app starts in "Testing" mode (max 100 users). To make it public:

1. Go to Google Cloud Console → "OAuth consent screen"
2. Click "Publish App"
3. Submit for verification (required for production)
   - Google will review your app (usually 2-3 weeks)
   - You'll need to provide:
     - Privacy policy URL
     - Terms of service URL
     - Homepage URL
     - YouTube video demo (optional but helpful)

Until verified, you can add up to 100 test users manually.

## Monitoring

Check your Netlify function logs for errors:
```bash
netlify logs:function google-auth-callback
netlify logs:function google-drive-sync
```

## Need Help?

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
