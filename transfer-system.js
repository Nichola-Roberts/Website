// Transfer System - Refactored with Redis Support
// Handles secure data export/import for notes and reading progress

const TransferSystem = {
    // Configuration
    config: {
        codeLength: 8,
        codeChars: 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789', // No O/0 for clarity
        expirationTime: 2 * 60 * 60 * 1000, // 2 hours
        apiEndpoints: {
            // Using Neon PostgreSQL instead of Redis (more reliable, won't get deleted)
            store: '/.netlify/functions/store-transfer-neon',
            retrieve: '/.netlify/functions/retrieve-transfer-neon'
        }
    },

    // Storage keys to export/import
    storageKeys: {
        notes: 'userNotes',
        sectionTimes: 'sectionTimes',
        totalTime: 'totalTime',
        lastSection: 'lastSection',
        notesMode: 'notesMode',
        fontScale: 'fontScale',
        viewMode: 'viewMode'
    },

    // Generate random transfer code
    generateCode() {
        let code = '';
        for (let i = 0; i < this.config.codeLength; i++) {
            const randomIndex = Math.floor(Math.random() * this.config.codeChars.length);
            code += this.config.codeChars.charAt(randomIndex);
        }
        return code;
    },

    // Split code into access key and encryption key
    splitCode(fullCode) {
        const midpoint = Math.floor(fullCode.length / 2);
        return {
            accessCode: fullCode.substring(0, midpoint),    // First half for Redis key
            encryptionKey: fullCode.substring(midpoint)     // Second half for encryption
        };
    },

    // Gather all data for export
    gatherExportData() {
        const data = {
            exportTimestamp: Date.now(),
            version: '2.0'
        };

        // Collect data from localStorage
        Object.entries(this.storageKeys).forEach(([key, storageKey]) => {
            const value = localStorage.getItem(storageKey);
            if (value !== null) {
                // Parse JSON values where needed
                if (key === 'notes') {
                    // Only export right-side notes (personal notes)
                    const allNotes = JSON.parse(value || '{}');
                    const rightNotes = {};
                    
                    Object.entries(allNotes).forEach(([noteKey, noteValue]) => {
                        try {
                            const note = JSON.parse(noteValue);
                            // Only include notes on the right side (personal notes)
                            // Left-side notes are imported from others and shouldn't be re-exported
                            if (note.side === 'right' || !note.side) { // Default to right if side not specified
                                rightNotes[noteKey] = noteValue;
                            }
                        } catch (e) {
                            // If note can't be parsed, include it (assume it's a personal note)
                            rightNotes[noteKey] = noteValue;
                        }
                    });
                    
                    data[key] = rightNotes;
                } else if (key === 'sectionTimes') {
                    data[key] = JSON.parse(value || '{}');
                } else {
                    data[key] = value;
                }
            }
        });

        return data;
    },

    // Export data to Redis
    async exportData(expiryHours = 2) {
        try {
            // Calculate expiration time in milliseconds
            const expirationTime = expiryHours * 60 * 60 * 1000;

            // Gather all data (only right-side notes are included)
            const exportData = this.gatherExportData();
            const noteCount = Object.keys(exportData.notes || {}).length;


            // Generate codes
            const fullCode = this.generateCode();
            const { accessCode, encryptionKey } = this.splitCode(fullCode);

            // Encrypt data
            const encryptedData = this.encryptData(JSON.stringify(exportData), encryptionKey);

            // Send to Redis
            const response = await fetch(this.config.apiEndpoints.store, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: accessCode,
                    data: encryptedData,
                    expiresAt: Date.now() + expirationTime
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to store data');
            }


            return {
                success: true,
                code: fullCode,
                noteCount: noteCount,
                expiresAt: new Date(Date.now() + expirationTime)
            };

        } catch (error) {
            console.error('Export failed:', error);
            return {
                success: false,
                error: error.message || 'Export failed'
            };
        }
    },

    // Import data from Redis
    async importData(fullCode) {
        try {
            // Validate code
            if (!fullCode || fullCode.length !== this.config.codeLength) {
                throw new Error('Invalid transfer code');
            }

            const { accessCode, encryptionKey } = this.splitCode(fullCode);

            // Fetch from Redis
            const response = await fetch(
                `${this.config.apiEndpoints.retrieve}?code=${accessCode.toUpperCase()}`
            );
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Code not found or expired');
            }

            // Decrypt data
            const decryptedData = this.decryptData(result.data, encryptionKey);
            const importedData = JSON.parse(decryptedData);


            // Check for conflicts
            const conflicts = this.checkForConflicts(importedData);

            return {
                success: true,
                data: importedData,
                hasExistingLeftNotes: conflicts.hasLeftNotes,
                existingLeftNotesCount: conflicts.leftNoteCount,
                noteCount: Object.keys(importedData.notes || {}).length
            };

        } catch (error) {
            console.error('Import failed:', error);
            return {
                success: false,
                error: error.message || 'Import failed'
            };
        }
    },

    // Check for existing data conflicts
    checkForConflicts(importedData) {
        const conflicts = {
            hasLeftNotes: false,
            leftNoteCount: 0,
            hasRightNotes: false,
            rightNoteCount: 0
        };

        const existingNotes = JSON.parse(localStorage.getItem(this.storageKeys.notes) || '{}');
        
        Object.entries(existingNotes).forEach(([key, value]) => {
            try {
                const note = JSON.parse(value);
                if (note.side === 'left') {
                    conflicts.hasLeftNotes = true;
                    conflicts.leftNoteCount++;
                } else {
                    conflicts.hasRightNotes = true;
                    conflicts.rightNoteCount++;
                }
            } catch (e) {
                // Default to right for unparseable notes
                conflicts.hasRightNotes = true;
                conflicts.rightNoteCount++;
            }
        });

        return conflicts;
    },

    // Complete the import process (maintains compatibility with transfer-modal.js)
    completeImport(importedData, replaceExisting = false) {
        try {
            // Handle notes
            if (importedData.notes) {
                this.mergeNotes(importedData.notes, replaceExisting);
            }

            // Handle reading times (additive)
            if (importedData.sectionTimes) {
                this.mergeReadingTimes(importedData.sectionTimes);
            }

            // Handle total time (always additive)
            if (importedData.totalTime) {
                this.mergeTotalTime(importedData.totalTime);
            }

            // Apply other settings
            this.applySettings(importedData);

            return {
                success: true,
                importedNoteCount: Object.keys(importedData.notes || {}).length
            };

        } catch (error) {
            console.error('Failed to apply imported data:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // Import notes to left margin (always replaces existing left notes when replaceLeft=true)
    mergeNotes(importedNotes, replaceLeft) {
        const existingNotes = JSON.parse(localStorage.getItem(this.storageKeys.notes) || '{}');
        
        // Remove left notes if replacing
        if (replaceLeft) {
            Object.keys(existingNotes).forEach(key => {
                try {
                    const note = JSON.parse(existingNotes[key]);
                    if (note.side === 'left') {
                        delete existingNotes[key];
                    }
                } catch (e) {
                    // Keep unparseable notes
                }
            });
        }

        // Add imported notes to left margin
        Object.entries(importedNotes).forEach(([key, value]) => {
            try {
                const noteStr = typeof value === 'string' ? value : JSON.stringify(value);
                const note = JSON.parse(noteStr);
                note.side = 'left'; // Force to left margin
                
                // Generate new key to avoid conflicts
                const timestamp = Date.now().toString(36);
                const random = Math.random().toString(36).substr(2, 5);
                const paragraphIndex = key.split('-')[0];
                const newKey = `${paragraphIndex}-${timestamp}${random}`;
                
                existingNotes[newKey] = JSON.stringify(note);
            } catch (e) {
                console.error('Failed to process note:', key, e);
            }
        });

        localStorage.setItem(this.storageKeys.notes, JSON.stringify(existingNotes));
    },

    // Merge reading times (additive)
    mergeReadingTimes(importedTimes) {
        const existingTimes = JSON.parse(localStorage.getItem(this.storageKeys.sectionTimes) || '{}');
        
        Object.entries(importedTimes).forEach(([section, time]) => {
            existingTimes[section] = (parseInt(existingTimes[section] || 0) + parseInt(time)).toString();
        });

        localStorage.setItem(this.storageKeys.sectionTimes, JSON.stringify(existingTimes));
    },

    // Merge total time (always additive)
    mergeTotalTime(importedTime) {
        const existingTime = parseInt(localStorage.getItem(this.storageKeys.totalTime) || '0');
        const newTotalTime = existingTime + parseInt(importedTime);
        localStorage.setItem(this.storageKeys.totalTime, newTotalTime.toString());
    },

    // Apply non-data settings
    applySettings(importedData) {
        const settingKeys = ['lastSection', 'notesMode', 'fontScale', 'viewMode'];
        
        settingKeys.forEach(key => {
            if (importedData[key] !== undefined) {
                localStorage.setItem(this.storageKeys[key], importedData[key]);
            }
        });
    },

    // Delete all local data
    deleteAllData() {
        try {
            // Clear all storage keys
            Object.values(this.storageKeys).forEach(key => {
                localStorage.removeItem(key);
            });

            
            // Clear imported notes data
            window.importedNotesData = null;

            // Reset time tracker if available
            if (window.timeTracker && typeof window.timeTracker.reset === 'function') {
                window.timeTracker.reset();
            }

            return { success: true };

        } catch (error) {
            console.error('Delete failed:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    },

    // Encryption utilities
    encryptData(data, key) {
        let encrypted = '';
        for (let i = 0; i < data.length; i++) {
            encrypted += String.fromCharCode(
                data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        return btoa(encrypted); // Base64 encode
    },

    decryptData(encryptedData, key) {
        try {
            const decoded = atob(encryptedData); // Base64 decode
            let decrypted = '';
            for (let i = 0; i < decoded.length; i++) {
                decrypted += String.fromCharCode(
                    decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
                );
            }
            return decrypted;
        } catch (error) {
            throw new Error('Invalid encryption key');
        }
    }
};

// Export for use
window.TransferSystem = TransferSystem;