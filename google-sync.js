/**
 * Google Sync System
 * Handles Google OAuth authentication and syncing notes to/from Google Drive
 */

class GoogleSyncSystem {
    constructor() {
        this.modal = document.getElementById('googleSyncModal');
        this.modalBackdrop = document.getElementById('modalBackdrop');
        this.syncToggle = document.querySelector('.sync-toggle');
        this.closeButton = document.getElementById('googleSyncClose');

        // UI elements
        this.loggedOutSection = document.getElementById('syncLoggedOut');
        this.loggedInSection = document.getElementById('syncLoggedIn');
        this.signInBtn = document.getElementById('googleSignInBtn');
        this.signOutBtn = document.getElementById('syncSignOutBtn');
        this.syncNowBtn = document.getElementById('syncNowBtn');
        this.syncMessage = document.getElementById('syncMessage');
        this.userAvatar = document.getElementById('syncUserAvatar');
        this.userName = document.getElementById('syncUserName');
        this.userEmail = document.getElementById('syncUserEmail');
        this.lastSyncText = document.getElementById('syncLastSync');

        // State
        this.accessToken = localStorage.getItem('googleAccessToken');
        this.refreshToken = localStorage.getItem('googleRefreshToken');
        this.userInfo = JSON.parse(localStorage.getItem('googleUserInfo') || 'null');
        this.lastSyncTime = localStorage.getItem('lastSyncTime');

        // Google OAuth config
        this.clientId = null; // Will be fetched from backend
        this.driveFileId = localStorage.getItem('googleDriveFileId');

        this.init();
    }

    async init() {
        // Add event listeners
        this.syncToggle?.addEventListener('click', () => this.openModal());
        this.closeButton?.addEventListener('click', () => this.closeModal());
        this.modalBackdrop?.addEventListener('click', () => this.closeModal());
        this.signInBtn?.addEventListener('click', () => this.startGoogleAuth());
        this.signOutBtn?.addEventListener('click', () => this.signOut());
        this.syncNowBtn?.addEventListener('click', () => this.syncNow());

        // Check if returning from OAuth redirect
        this.handleOAuthCallback();

        // Update UI based on auth state
        this.updateUI();

        // Auto-sync on page load if logged in
        if (this.accessToken) {
            this.autoSync();
        }
    }

    openModal() {
        this.modal?.classList.add('active');
        this.modalBackdrop?.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.updateUI();
    }

    closeModal() {
        this.modal?.classList.remove('active');
        this.modalBackdrop?.classList.remove('active');
        document.body.style.overflow = '';
    }

    updateUI() {
        if (this.accessToken && this.userInfo) {
            // Show logged in state
            this.loggedOutSection.style.display = 'none';
            this.loggedInSection.style.display = 'block';

            // Update user info
            this.userName.textContent = this.userInfo.name || 'User';
            this.userEmail.textContent = this.userInfo.email || '';
            this.userAvatar.src = this.userInfo.picture || '';

            // Update last sync time
            if (this.lastSyncTime) {
                const lastSync = new Date(parseInt(this.lastSyncTime));
                const now = new Date();
                const diffMinutes = Math.floor((now - lastSync) / 60000);

                if (diffMinutes < 1) {
                    this.lastSyncText.textContent = 'Synced just now';
                } else if (diffMinutes < 60) {
                    this.lastSyncText.textContent = `Synced ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
                } else {
                    const diffHours = Math.floor(diffMinutes / 60);
                    this.lastSyncText.textContent = `Synced ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                }
            } else {
                this.lastSyncText.textContent = 'Never synced';
            }
        } else {
            // Show logged out state
            this.loggedOutSection.style.display = 'block';
            this.loggedInSection.style.display = 'none';
        }
    }

    async startGoogleAuth() {
        try {
            // Check if user wants to join mailing list
            const joinMailingListCheckbox = document.getElementById('joinMailingListCheckbox');
            const shouldJoinMailingList = joinMailingListCheckbox?.checked || false;

            // Store preference for after OAuth callback
            if (shouldJoinMailingList) {
                sessionStorage.setItem('joinMailingList', 'true');
            }

            // Get OAuth URL from backend
            const response = await fetch('/.netlify/functions/google-auth-init');
            const data = await response.json();

            if (data.authUrl) {
                // Redirect to Google OAuth
                window.location.href = data.authUrl;
            } else {
                this.showMessage('Failed to initiate Google sign-in', 'error');
            }
        } catch (error) {
            console.error('Auth error:', error);
            this.showMessage('Failed to connect to Google', 'error');
        }
    }

    async handleOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (code && state === 'google_drive_sync') {
            try {
                // Exchange code for tokens
                const response = await fetch('/.netlify/functions/google-auth-callback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });

                const data = await response.json();

                if (data.success) {
                    // Store tokens and user info
                    this.accessToken = data.accessToken;
                    this.refreshToken = data.refreshToken;
                    this.userInfo = data.userInfo;

                    localStorage.setItem('googleAccessToken', this.accessToken);
                    if (this.refreshToken) {
                        localStorage.setItem('googleRefreshToken', this.refreshToken);
                    }
                    localStorage.setItem('googleUserInfo', JSON.stringify(this.userInfo));

                    // Check if user wants to join mailing list
                    const shouldJoinMailingList = sessionStorage.getItem('joinMailingList') === 'true';
                    if (shouldJoinMailingList && this.userInfo.email) {
                        // Subscribe to mailing list
                        try {
                            await fetch('/.netlify/functions/subscribe', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    email: this.userInfo.email,
                                    source: 'google_sync'
                                })
                            });
                        } catch (error) {
                            console.error('Mailing list subscription error:', error);
                        }
                        sessionStorage.removeItem('joinMailingList');
                    }

                    // Clean up URL
                    window.history.replaceState({}, document.title, window.location.pathname);

                    // Initial sync
                    await this.syncNow();

                    this.showMessage('Successfully signed in with Google!', 'success');
                } else {
                    this.showMessage('Failed to sign in: ' + (data.error || 'Unknown error'), 'error');
                }
            } catch (error) {
                console.error('OAuth callback error:', error);
                this.showMessage('Authentication failed', 'error');
            }
        }
    }

    async syncNow() {
        if (!this.accessToken) {
            this.showMessage('Please sign in first', 'error');
            return;
        }

        this.syncNowBtn.disabled = true;
        this.syncNowBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 16px; height: 16px; margin-right: 6px; animation: spin 1s linear infinite;"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Syncing...';

        try {
            // Get all data to sync
            const syncData = {
                notes: JSON.parse(localStorage.getItem('userNotes') || '{}'),
                sectionTimes: JSON.parse(localStorage.getItem('sectionTimes') || '{}'),
                totalTime: localStorage.getItem('totalTime') || '0',
                lastSection: localStorage.getItem('lastSection') || null,
                notesMode: localStorage.getItem('notesMode') === 'true',
                fontScale: parseFloat(localStorage.getItem('fontScale') || '1'),
                viewMode: localStorage.getItem('viewMode') || 'normal',
                syncTimestamp: Date.now()
            };

            // Sync to Google Drive
            const response = await fetch('/.netlify/functions/google-drive-sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify({
                    data: syncData,
                    fileId: this.driveFileId
                })
            });

            const result = await response.json();

            if (result.success) {
                // Store the file ID for future syncs
                if (result.fileId) {
                    this.driveFileId = result.fileId;
                    localStorage.setItem('googleDriveFileId', result.fileId);
                }

                // Update last sync time
                this.lastSyncTime = Date.now().toString();
                localStorage.setItem('lastSyncTime', this.lastSyncTime);

                this.showMessage('Successfully synced to Google Drive!', 'success');
                this.updateUI();
            } else if (result.error === 'token_expired') {
                // Try to refresh token
                await this.refreshAccessToken();
                // Retry sync
                await this.syncNow();
            } else {
                this.showMessage('Sync failed: ' + (result.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Sync error:', error);
            this.showMessage('Failed to sync. Please try again.', 'error');
        } finally {
            this.syncNowBtn.disabled = false;
            this.syncNowBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 16px; height: 16px; margin-right: 6px;"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Sync Now';
        }
    }

    async autoSync() {
        // Auto-sync only if last sync was more than 5 minutes ago
        if (!this.lastSyncTime || (Date.now() - parseInt(this.lastSyncTime)) > 300000) {
            try {
                await this.pullFromDrive();
            } catch (error) {
                console.error('Auto-sync error:', error);
            }
        }
    }

    async pullFromDrive() {
        if (!this.accessToken || !this.driveFileId) {
            return;
        }

        try {
            const response = await fetch(`/.netlify/functions/google-drive-pull?fileId=${this.driveFileId}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            const result = await response.json();

            if (result.success && result.data) {
                const cloudData = result.data;
                const localData = {
                    notes: JSON.parse(localStorage.getItem('userNotes') || '{}'),
                    syncTimestamp: parseInt(localStorage.getItem('lastSyncTime') || '0')
                };

                // Use cloud data if it's newer
                if (cloudData.syncTimestamp > localData.syncTimestamp) {
                    localStorage.setItem('userNotes', JSON.stringify(cloudData.notes || {}));
                    localStorage.setItem('sectionTimes', JSON.stringify(cloudData.sectionTimes || {}));
                    localStorage.setItem('totalTime', cloudData.totalTime || '0');
                    if (cloudData.lastSection) {
                        localStorage.setItem('lastSection', cloudData.lastSection);
                    }
                    localStorage.setItem('notesMode', cloudData.notesMode ? 'true' : 'false');
                    localStorage.setItem('fontScale', cloudData.fontScale?.toString() || '1');
                    localStorage.setItem('viewMode', cloudData.viewMode || 'normal');
                    localStorage.setItem('lastSyncTime', cloudData.syncTimestamp.toString());

                    // Reload page to apply changes
                    console.log('Synced from Google Drive');
                    location.reload();
                }
            } else if (result.error === 'token_expired') {
                await this.refreshAccessToken();
            }
        } catch (error) {
            console.error('Pull from Drive error:', error);
        }
    }

    async refreshAccessToken() {
        if (!this.refreshToken) {
            this.signOut();
            return;
        }

        try {
            const response = await fetch('/.netlify/functions/google-refresh-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            const data = await response.json();

            if (data.success && data.accessToken) {
                this.accessToken = data.accessToken;
                localStorage.setItem('googleAccessToken', this.accessToken);
            } else {
                this.signOut();
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            this.signOut();
        }
    }

    signOut() {
        // Clear all Google-related data
        localStorage.removeItem('googleAccessToken');
        localStorage.removeItem('googleRefreshToken');
        localStorage.removeItem('googleUserInfo');
        localStorage.removeItem('googleDriveFileId');

        this.accessToken = null;
        this.refreshToken = null;
        this.userInfo = null;
        this.driveFileId = null;

        this.updateUI();
        this.showMessage('Signed out successfully', 'info');
    }

    showMessage(text, type = 'info') {
        this.syncMessage.textContent = text;
        this.syncMessage.className = 'sync-message visible ' + type;

        setTimeout(() => {
            this.syncMessage.classList.remove('visible');
        }, 5000);
    }
}

// Add CSS for spin animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.googleSyncSystem = new GoogleSyncSystem();
    });
} else {
    window.googleSyncSystem = new GoogleSyncSystem();
}
