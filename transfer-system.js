// Transfer System
// Handles data export/import functionality for notes and reading progress

const TransferSystem = {
    // Generate a random 8-character code (avoiding 0, O for clarity)
    generateCode() {
        const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Removed O and 0
        let code = '';
        let attempts = 0;
        const maxAttempts = 50;
        
        do {
            code = '';
            for (let i = 0; i < 8; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            attempts++;
        } while (this.codeExists(code) && attempts < maxAttempts);
        
        if (attempts >= maxAttempts) {
            throw new Error('Failed to generate unique code after multiple attempts');
        }
        
        return code;
    },
    
    // Check if transfer code already exists
    codeExists(code) {
        const existingData = localStorage.getItem(`transfer_${code}`);
        if (!existingData) return false;
        
        try {
            const parsedData = JSON.parse(existingData);
            // Check if expired
            if (Date.now() > parsedData.expires) {
                // Clean up expired code
                localStorage.removeItem(`transfer_${code}`);
                return false;
            }
            return true;
        } catch (error) {
            // Clean up corrupted data
            localStorage.removeItem(`transfer_${code}`);
            return false;
        }
    },
    
    // Clean up expired transfer codes
    cleanupExpiredCodes() {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('transfer_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (Date.now() > data.expires) {
                        keysToRemove.push(key);
                    }
                } catch (error) {
                    // Clean up corrupted data
                    keysToRemove.push(key);
                }
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`Cleaned up ${keysToRemove.length} expired transfer codes`);
    },
    
    // Export data (only right margin notes + reading progress)
    async exportData() {
        try {
            // Clean up expired codes first
            this.cleanupExpiredCodes();
            
            // Get right margin notes only
            const allNotes = JSON.parse(localStorage.getItem('userNotes') || '{}');
            const rightMarginNotes = {};
            
            // Filter for right margin notes (these are the main notes, not imported ones)
            Object.keys(allNotes).forEach(key => {
                // Include all userNotes as these are the right margin notes
                rightMarginNotes[key] = allNotes[key];
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
            
            const code = this.generateCode();
            
            // Store data with expiration (2 hours) - persistent until used or expired
            const storageData = {
                data: exportData,
                expires: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
                created: Date.now(),
                usageCount: 0 // Track how many times this code has been used
            };
            
            // Store in localStorage (simulating Redis persistence)
            // In production, this would be stored in Redis with TTL
            localStorage.setItem(`transfer_${code}`, JSON.stringify(storageData));
            
            console.log('Export data:', exportData);
            console.log(`Data exported with code: ${code} (${Object.keys(rightMarginNotes).length} notes)`);
            
            return {
                success: true,
                code: code,
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
    async importData(code) {
        try {
            if (!code || code.length !== 8) {
                return {
                    success: false,
                    error: 'Invalid transfer code'
                };
            }
            
            // Get stored data
            const storedData = localStorage.getItem(`transfer_${code.toUpperCase()}`);
            if (!storedData) {
                return {
                    success: false,
                    error: 'Transfer code not found or expired'
                };
            }
            
            const parsedData = JSON.parse(storedData);
            
            // Check expiration
            if (Date.now() > parsedData.expires) {
                localStorage.removeItem(`transfer_${code.toUpperCase()}`);
                return {
                    success: false,
                    error: 'Transfer code has expired'
                };
            }
            
            // Track usage (but don't remove - allow multiple uses within 2 hours)
            parsedData.usageCount = (parsedData.usageCount || 0) + 1;
            localStorage.setItem(`transfer_${code.toUpperCase()}`, JSON.stringify(parsedData));
            
            const importedData = parsedData.data;
            console.log('Import data:', importedData);
            console.log(`Code ${code} used ${parsedData.usageCount} times`);
            
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
            
            // Handle imported notes - place them on left margin
            if (notes && Object.keys(notes).length > 0) {
                if (replaceExisting) {
                    // Replace all existing imported notes
                    localStorage.setItem('persistentImportedNotes', JSON.stringify(notes));
                } else {
                    // Merge with existing imported notes
                    const existingImported = JSON.parse(localStorage.getItem('persistentImportedNotes') || '{}');
                    const mergedNotes = { ...existingImported, ...notes };
                    localStorage.setItem('persistentImportedNotes', JSON.stringify(mergedNotes));
                }
                
                // Set up for notes system to place them in left margins
                window.importedNotesData = JSON.parse(localStorage.getItem('persistentImportedNotes') || '{}');
                
                // Refresh notes display if notes mode is active
                if (window.NotesSystem && window.NotesSystem.isNotesMode) {
                    window.NotesSystem.placeImportedNotesInMargins();
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
    }
};

// Export for use in other modules
window.TransferSystem = TransferSystem;