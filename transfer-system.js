// Transfer System
// Handles data export/import functionality for notes and reading progress

const TransferSystem = {
    // Generate a random 8-character code (4 digits access + 4 digits encryption)
    generateCode() {
        const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Removed O and 0
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },
    
    // Split 8-digit code into access (first 4) and encryption (last 4)
    splitCode(fullCode) {
        return {
            accessCode: fullCode.substring(0, 4),
            encryptionKey: fullCode.substring(4, 8)
        };
    },
    
    // Export data (only right margin notes + reading progress)
    async exportData() {
        try {
            // Get right margin notes only (for privacy - don't export left/imported notes)
            const allNotes = JSON.parse(localStorage.getItem('userNotes') || '{}');
            const rightMarginNotes = {};
            
            // Filter for right margin notes only
            Object.keys(allNotes).forEach(key => {
                try {
                    const noteData = JSON.parse(allNotes[key]);
                    // Only include notes that are explicitly right side or have no side specified (default right)
                    if (!noteData.side || noteData.side === 'right') {
                        rightMarginNotes[key] = allNotes[key];
                    }
                } catch (e) {
                    // If parsing fails, assume it's a right margin note (backwards compatibility)
                    rightMarginNotes[key] = allNotes[key];
                }
            });
            
            // Get reading progress data
            const exportData = {
                notes: rightMarginNotes,
                readingTimes: JSON.parse(localStorage.getItem('readingTimes') || '{}'),
                totalTimeOnSite: localStorage.getItem('totalTimeOnSite') || '0',
                lastSection: localStorage.getItem('lastSection') || '0',
                fontSize: localStorage.getItem('fontSize') || 'normal',
                plainTextMode: localStorage.getItem('plainTextMode') || 'false',
                notesMode: localStorage.getItem('notesMode') || 'false',
                exportTimestamp: Date.now()
            };
            
            const fullCode = this.generateCode();
            const { accessCode, encryptionKey } = this.splitCode(fullCode);
            const expiresAt = Date.now() + (2 * 60 * 60 * 1000); // 2 hours
            
            // Simple encryption using the encryption key (basic XOR for demo)
            const encryptedData = this.encryptData(JSON.stringify(exportData), encryptionKey);
            
            // Store in Redis via Netlify function using only the access code (first 4 digits)
            const response = await fetch('/.netlify/functions/store-transfer-redis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: accessCode, // Only first 4 digits go to Redis
                    data: encryptedData, // Encrypted data
                    expiresAt: expiresAt
                })
            });
            
            const result = await response.json();
            
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to store transfer data');
            }
            
            console.log('Export data:', exportData);
            console.log(`Data exported with code: ${fullCode} (${Object.keys(rightMarginNotes).length} notes)`);
            
            return {
                success: true,
                code: fullCode, // Return full 8-digit code
                noteCount: Object.keys(rightMarginNotes).length
            };
            
        } catch (error) {
            console.error('Export failed:', error);
            return {
                success: false,
                error: error.message || 'Failed to export data'
            };
        }
    },
    
    // Import data (places notes on left margin)
    async importData(fullCode) {
        try {
            if (!fullCode || fullCode.length !== 8) {
                return {
                    success: false,
                    error: 'Invalid transfer code'
                };
            }
            
            const { accessCode, encryptionKey } = this.splitCode(fullCode);
            
            // Get data from Redis via Netlify function using access code (first 4 digits)
            const response = await fetch(`/.netlify/functions/retrieve-transfer-redis?code=${accessCode.toUpperCase()}`);
            const result = await response.json();
            
            if (!response.ok || !result.success) {
                return {
                    success: false,
                    error: result.error || 'Transfer code not found or expired'
                };
            }
            
            // Decrypt the data using the encryption key (last 4 digits)
            const decryptedDataStr = this.decryptData(result.data, encryptionKey);
            const importedData = JSON.parse(decryptedDataStr);
            
            console.log('Import data:', importedData);
            console.log(`Code ${fullCode} retrieved successfully`);
            
            // Check if there are existing left margin notes
            const existingImportedNotes = JSON.parse(localStorage.getItem('persistentImportedNotes') || '{}');
            const hasExistingImports = Object.keys(existingImportedNotes).length > 0;
            
            return {
                success: true,
                data: importedData,
                hasExistingImports: hasExistingImports,
                noteCount: Object.keys(importedData.notes || {}).length
            };
            
        } catch (error) {
            console.error('Import failed:', error);
            return {
                success: false,
                error: 'Failed to import data'
            };
        }
    },
    
    // Complete the import process (after user confirmation)
    completeImport(importedData, replaceExisting = false) {
        try {
            // Import non-notes data immediately
            const { notes, ...otherData } = importedData;
            
            // Merge reading progress and settings
            if (otherData.readingTimes) {
                const existingTimes = JSON.parse(localStorage.getItem('readingTimes') || '{}');
                const mergedTimes = replaceExisting ? otherData.readingTimes : { ...existingTimes, ...otherData.readingTimes };
                localStorage.setItem('readingTimes', JSON.stringify(mergedTimes));
            }
            
            if (otherData.totalTimeOnSite) {
                const existingTime = parseInt(localStorage.getItem('totalTimeOnSite') || '0');
                const importedTime = parseInt(otherData.totalTimeOnSite);
                const totalTime = replaceExisting ? importedTime : existingTime + importedTime;
                localStorage.setItem('totalTimeOnSite', totalTime.toString());
            }
            
            // Import other settings
            ['lastSection', 'fontSize', 'plainTextMode', 'notesMode'].forEach(key => {
                if (otherData[key] !== undefined) {
                    localStorage.setItem(key, otherData[key]);
                }
            });
            
            // Handle imported notes - place them on left margin (always replace)
            if (notes && Object.keys(notes).length > 0) {
                // Always replace existing imported notes
                localStorage.setItem('persistentImportedNotes', JSON.stringify(notes));
                
                // Set up for notes system to place them in left margins
                window.importedNotesData = notes;
                
                // Refresh notes display if notes mode is active
                if (window.NotesSystem && window.NotesSystem.placeImportedNotesInMargins) {
                    window.NotesSystem.placeImportedNotesInMargins();
                } else {
                    console.log('NotesSystem or placeImportedNotesInMargins not available');
                }
            }
            
            return {
                success: true,
                importedNoteCount: Object.keys(notes || {}).length
            };
            
        } catch (error) {
            console.error('Complete import failed:', error);
            return {
                success: false,
                error: 'Failed to complete import'
            };
        }
    },
    
    // Simple encryption using XOR with the encryption key
    encryptData(data, key) {
        let encrypted = '';
        for (let i = 0; i < data.length; i++) {
            const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            encrypted += String.fromCharCode(charCode);
        }
        // Base64 encode to handle special characters
        return btoa(encrypted);
    },
    
    // Simple decryption using XOR with the encryption key
    decryptData(encryptedData, key) {
        try {
            // Base64 decode first
            const encrypted = atob(encryptedData);
            let decrypted = '';
            for (let i = 0; i < encrypted.length; i++) {
                const charCode = encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                decrypted += String.fromCharCode(charCode);
            }
            return decrypted;
        } catch (error) {
            throw new Error('Failed to decrypt data - invalid encryption key');
        }
    }
};

// Export for use in other modules
window.TransferSystem = TransferSystem;