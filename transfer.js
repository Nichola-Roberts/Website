// Device Transfer System for Notes and User Data

class DeviceTransfer {
    constructor() {
        this.STORAGE_KEYS = [
            'userNotes',
            'notesMode', 
            'totalTimeOnSite',
            'readingTimes',
            'lastSection',
            'plainTextMode'
        ];
    }

    // Generate a split transfer code - first half for storage key, second half for encryption
    generateTransferCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'; // Full alphanumeric for maximum combinations
        let code = '';
        for (let i = 0; i < 8; i++) { // 8 characters total: 4 for storage, 4 for encryption
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // Split the 8-character code into storage key and encryption key
    splitTransferCode(code) {
        return {
            storageKey: code.substring(0, 4),  // First 4 chars: what we store in backend
            encryptionKey: code.substring(4, 8) // Last 4 chars: what encrypts the data
        };
    }

    // Encrypt data using a simple XOR cipher with the transfer code as key
    async encryptData(data, code) {
        const jsonStr = JSON.stringify(data);
        const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
        
        // Simple obfuscation - in production, use Web Crypto API
        let encrypted = '';
        for (let i = 0; i < encoded.length; i++) {
            encrypted += String.fromCharCode(
                encoded.charCodeAt(i) ^ code.charCodeAt(i % code.length)
            );
        }
        return btoa(encrypted);
    }

    // Decrypt data
    async decryptData(encryptedData, code) {
        try {
            const decoded = atob(encryptedData);
            let decrypted = '';
            for (let i = 0; i < decoded.length; i++) {
                decrypted += String.fromCharCode(
                    decoded.charCodeAt(i) ^ code.charCodeAt(i % code.length)
                );
            }
            const jsonStr = decodeURIComponent(escape(atob(decrypted)));
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }

    // Gather all user data for transfer
    gatherUserData() {
        const data = {
            timestamp: Date.now(),
            version: '1.0',
            data: {}
        };

        // Collect all localStorage data
        this.STORAGE_KEYS.forEach(key => {
            const value = localStorage.getItem(key);
            if (value !== null) {
                data.data[key] = value;
            }
        });

        // Add current session time to total
        if (window.state && window.state.siteStartTime) {
            const currentSessionTime = Date.now() - window.state.siteStartTime;
            const totalTime = parseInt(data.data.totalTimeOnSite || '0') + currentSessionTime;
            data.data.totalTimeOnSite = totalTime.toString();
        }

        return data;
    }

    // Export data to backend
    async exportData() {
        const fullCode = this.generateTransferCode();
        const { storageKey, encryptionKey } = this.splitTransferCode(fullCode);
        const userData = this.gatherUserData();
        const encryptedData = await this.encryptData(userData, encryptionKey);

        try {
            const response = await fetch('/.netlify/functions/store-transfer-redis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: storageKey, // Only send the storage key to backend
                    data: encryptedData,
                    expiresAt: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
                })
            });

            if (!response.ok) {
                throw new Error('Failed to store transfer data');
            }

            return {
                success: true,
                code: fullCode, // Return the full 8-character code to user
                expiresAt: new Date(Date.now() + (2 * 60 * 60 * 1000))
            };
        } catch (error) {
            console.error('Export failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Import data from backend
    async importData(code) {
        try {
            const { storageKey, encryptionKey } = this.splitTransferCode(code);
            const response = await fetch(`/.netlify/functions/retrieve-transfer-redis?code=${storageKey}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Transfer code not found or expired');
                }
                throw new Error('Failed to retrieve transfer data');
            }

            const { data: encryptedData } = await response.json();
            const decryptedData = await this.decryptData(encryptedData, encryptionKey);

            if (!decryptedData) {
                throw new Error('Invalid transfer code');
            }

            // Verify data is not too old (24 hours max)
            if (Date.now() - decryptedData.timestamp > 24 * 60 * 60 * 1000) {
                throw new Error('Transfer data is too old');
            }

            return {
                success: true,
                data: decryptedData
            };
        } catch (error) {
            console.error('Import failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Apply imported data to current device
    applyImportedData(importedData) {
        const conflicts = [];
        
        // Check for existing data conflicts
        Object.keys(importedData.data).forEach(key => {
            const existingValue = localStorage.getItem(key);
            if (existingValue && existingValue !== importedData.data[key]) {
                conflicts.push(key);
            }
        });

        if (conflicts.length > 0) {
            return {
                success: false,
                conflicts: conflicts
            };
        }

        // Apply all data
        Object.keys(importedData.data).forEach(key => {
            localStorage.setItem(key, importedData.data[key]);
        });

        // Update current state if available
        if (window.state) {
            window.state.notes = JSON.parse(importedData.data.userNotes || '{}');
            window.state.isNotesMode = importedData.data.notesMode === 'true';
            window.state.totalTimeOnSite = parseInt(importedData.data.totalTimeOnSite || '0');
            window.state.readingTimes = JSON.parse(importedData.data.readingTimes || '{}');
            window.state.currentSection = parseInt(importedData.data.lastSection || '0');
        }

        return {
            success: true,
            itemsImported: Object.keys(importedData.data).length
        };
    }

    // Merge imported data with existing (for conflict resolution)
    mergeImportedData(importedData, strategy = 'newer') {
        Object.keys(importedData.data).forEach(key => {
            const existingValue = localStorage.getItem(key);
            
            if (key === 'totalTimeOnSite') {
                // Always add times together
                const existingTime = parseInt(existingValue || '0');
                const importedTime = parseInt(importedData.data[key] || '0');
                localStorage.setItem(key, (existingTime + importedTime).toString());
            } else if (key === 'userNotes') {
                // Merge notes
                const existingNotes = JSON.parse(existingValue || '{}');
                const importedNotes = JSON.parse(importedData.data[key] || '{}');
                const mergedNotes = { ...existingNotes, ...importedNotes };
                localStorage.setItem(key, JSON.stringify(mergedNotes));
            } else if (key === 'readingTimes') {
                // Merge reading times, keeping the higher value
                const existingTimes = JSON.parse(existingValue || '{}');
                const importedTimes = JSON.parse(importedData.data[key] || '{}');
                const mergedTimes = {};
                
                const allKeys = new Set([...Object.keys(existingTimes), ...Object.keys(importedTimes)]);
                allKeys.forEach(k => {
                    mergedTimes[k] = Math.max(existingTimes[k] || 0, importedTimes[k] || 0);
                });
                
                localStorage.setItem(key, JSON.stringify(mergedTimes));
            } else {
                // Use imported value for other keys
                localStorage.setItem(key, importedData.data[key]);
            }
        });

        return {
            success: true,
            merged: true
        };
    }
}

// Export for use in main script
window.DeviceTransfer = DeviceTransfer;