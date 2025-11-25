// Simple Notes System - Bilateral Left/Right with Text Selection
// Clean implementation with view/edit modes and text highlighting
// Simplified version without transfer functionality

const NotesSystem = {
    isNotesMode: localStorage.getItem('notesMode') === 'true' || false,
    notes: JSON.parse(localStorage.getItem('userNotes')) || {},
    orphanedNotes: JSON.parse(localStorage.getItem('orphanedNotes')) || {},
    activeNoteKey: null,
    selectedTextRange: null,
    wasFocusModeActive: false, // Track previous focus state
    paragraphHashList: null, // Cached hash list loaded from paragraph-hashes.json

    // Generate hash from paragraph content
    hashContent(text) {
        // Normalize text: trim, lowercase, collapse whitespace
        const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
        // Use first 200 chars for hash to balance stability with uniqueness
        const content = normalized.substring(0, 200);

        // Simple but effective hash function
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        // Convert to positive hex string
        return Math.abs(hash).toString(36);
    },

    // Generate context hashes for a paragraph (current + 2 before + 2 after)
    generateContextHashes(paragraph) {
        const allParagraphs = Array.from(document.querySelectorAll('p:not(#notes p):not(header p):not(.site-header p)'));
        const currentIndex = allParagraphs.indexOf(paragraph);

        const hashes = [];
        // Get hashes for -2, -1, 0, +1, +2 positions
        for (let offset = -2; offset <= 2; offset++) {
            const targetIndex = currentIndex + offset;
            if (targetIndex >= 0 && targetIndex < allParagraphs.length) {
                hashes.push(this.hashContent(allParagraphs[targetIndex].textContent));
            } else {
                hashes.push(null); // Placeholder for out-of-bounds
            }
        }
        return hashes;
    },

    // Initialize notes system
    async init() {
        this.loadSavedState();
        await this.loadParagraphHashList(); // Load pre-computed hash list
        this.migrateOldFormatNotes();
        this.initializeNotesButton();
        this.attachEventHandlers();

        if (this.isNotesMode) {
            this.enableNotesMode();
        }
    },

    // Load pre-computed paragraph hash list from paragraph-hashes.json
    async loadParagraphHashList() {
        try {
            const response = await fetch('paragraph-hashes.json');
            if (response.ok) {
                const data = await response.json();
                this.paragraphHashList = data.hashes;
                console.log(`Loaded paragraph hash list: ${data.paragraphCount} paragraphs`);
            } else {
                console.warn('paragraph-hashes.json not found, will build hash list on demand');
                this.paragraphHashList = null;
            }
        } catch (e) {
            console.warn('Failed to load paragraph-hashes.json, will build hash list on demand:', e);
            this.paragraphHashList = null;
        }
    },

    // Get or build paragraph hash list
    getParagraphHashList() {
        if (this.paragraphHashList) {
            return this.paragraphHashList;
        }

        // Fallback: build hash list from current DOM
        const allParagraphs = Array.from(document.querySelectorAll('p:not(#notes p):not(header p):not(.site-header p)'));
        return allParagraphs.map(p => this.hashContent(p.textContent));
    },
    
    // Load saved notes mode state
    loadSavedState() {
        // Reload notes from localStorage
        this.notes = JSON.parse(localStorage.getItem('userNotes')) || {};
        this.orphanedNotes = JSON.parse(localStorage.getItem('orphanedNotes')) || {};

        if (this.isNotesMode) {
            document.body.classList.add('notes-mode');
        }
    },

    // Migrate old paragraph-index format (p0-noteId) to hash-based format (h-hash-noteId)
    migrateOldFormatNotes() {
        const notesToMigrate = Object.keys(this.notes).filter(key => key.startsWith('p') && key.match(/^p\d+-/));

        if (notesToMigrate.length === 0) {
            return; // No migration needed
        }

        console.log(`Migrating ${notesToMigrate.length} notes from index-based to hash-based format...`);

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.performMigration());
        } else {
            this.performMigration();
        }
    },

    // Perform the actual migration
    performMigration() {
        const paragraphs = Array.from(document.querySelectorAll('p:not(#notes p):not(header p):not(.site-header p)'));
        const notesToMigrate = Object.keys(this.notes).filter(key => key.startsWith('p') && key.match(/^p\d+-/));
        let migratedCount = 0;
        let orphanedCount = 0;

        notesToMigrate.forEach(oldKey => {
            try {
                const noteData = JSON.parse(this.notes[oldKey]);
                const oldIndex = parseInt(oldKey.split('-')[0].substring(1)); // Extract index from p0-noteId
                const noteId = oldKey.split('-').slice(1).join('-'); // Everything after first dash

                if (oldIndex < paragraphs.length) {
                    // Paragraph still exists at this position
                    const paragraph = paragraphs[oldIndex];
                    const contentHash = this.hashContent(paragraph.textContent);
                    const contextHashes = this.generateContextHashes(paragraph);
                    const newKey = `h-${contentHash}-${noteId}`;

                    // Add context hashes for resilience
                    noteData.contextHashes = contextHashes;
                    this.notes[newKey] = JSON.stringify(noteData);
                    migratedCount++;
                } else {
                    // Paragraph doesn't exist - make orphaned
                    noteData.originalKey = oldKey;
                    noteData.originalIndex = oldIndex;
                    this.orphanedNotes[oldKey] = JSON.stringify(noteData);
                    orphanedCount++;
                }

                // Remove old key
                delete this.notes[oldKey];
            } catch (e) {
                console.error('Failed to migrate note:', oldKey, e);
            }
        });

        // Save updated notes
        localStorage.setItem('userNotes', JSON.stringify(this.notes));
        localStorage.setItem('orphanedNotes', JSON.stringify(this.orphanedNotes));

        if (migratedCount > 0 || orphanedCount > 0) {
            console.log(`Migration complete: ${migratedCount} notes migrated, ${orphanedCount} orphaned`);
            if (orphanedCount > 0) {
                this.showOrphanedNotesNotification(orphanedCount);
            }
        }
    },

    // Show notification for relocated notes
    showRelocatedNotesNotification(count) {
        const notification = document.createElement('div');
        notification.className = 'relocated-notes-notification';
        notification.innerHTML = `
            <div style="background-color: #d1ecf1; border: 1px solid #17a2b8; padding: 12px; border-radius: 4px; margin: 10px; font-size: 14px;">
                ℹ️ ${count} note${count > 1 ? 's were' : ' was'} moved to the closest matching paragraph${count > 1 ? 's' : ''}
                (the original paragraph${count > 1 ? 's were' : ' was'} edited).
            </div>
        `;

        // Insert at top of content
        const contentArea = document.querySelector('#content') || document.body;
        contentArea.insertBefore(notification, contentArea.firstChild);

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            notification.style.transition = 'opacity 0.5s';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 500);
        }, 10000);
    },

    // Show notification for orphaned notes
    showOrphanedNotesNotification(count) {
        const notification = document.createElement('div');
        notification.className = 'orphaned-notes-notification';
        notification.innerHTML = `
            <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 4px; margin: 10px; font-size: 14px;">
                ⚠️ ${count} note${count > 1 ? 's' : ''} couldn't be linked to current content (paragraph no longer exists).
                They've been preserved in storage.
            </div>
        `;

        // Insert at top of content
        const contentArea = document.querySelector('#content') || document.body;
        contentArea.insertBefore(notification, contentArea.firstChild);

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            notification.style.transition = 'opacity 0.5s';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 500);
        }, 10000);
    },
    
    // Create and initialize notes button
    initializeNotesButton() {
        const notesButtons = document.querySelectorAll('.notes-toggle');
        notesButtons.forEach(button => {
            button.addEventListener('click', () => this.toggleNotesMode());
        });
        
        this.updateNotesButtonVisibility();
    },
    
    // Update notes button visibility - set to 0 for testing
    updateNotesButtonVisibility() {
        const notesButtons = document.querySelectorAll('.notes-toggle');
        notesButtons.forEach(button => {
            // Always show for testing (set to 0 minutes)
            button.style.display = 'flex';
        });
    },
    
    // Toggle notes mode on/off
    toggleNotesMode() {
        this.isNotesMode = !this.isNotesMode;
        localStorage.setItem('notesMode', this.isNotesMode);
        
        if (this.isNotesMode) {
            this.enableNotesMode();
            // Show notes info modal on first use
            this.showNotesInfoModalOnFirstUse();
        } else {
            this.disableNotesMode();
        }
    },

    // Show notes info modal on first use
    showNotesInfoModalOnFirstUse() {
        if (window.notesInfoModal) {
            window.notesInfoModal.showFirstTimeModal();
        }
    },
    
    // Enable notes mode
    enableNotesMode() {
        document.body.classList.add('notes-mode');

        // Remember if focus mode was already active
        this.wasFocusModeActive = document.body.classList.contains('focus-mode');

        // Force focus mode when notes are active
        if (!this.wasFocusModeActive) {
            // Use the ViewModeManager to switch to focus mode
            if (window.viewModeManager) {
                window.viewModeManager.setMode('focus');
            } else {
                // Fallback if ViewModeManager not available
                document.body.classList.add('focus-mode');
                localStorage.setItem('viewMode', 'focus');
            }
        }

        // Small delay to ensure DOM is ready
        setTimeout(() => {
            this.addNotesToParagraphs();

            // Load all notes with fuzzy matching fallback
            this.loadAllExistingNotes();

            this.showAllTextRanges();

            // Update all button visibility based on current capacity
            this.updateAllButtonVisibility();
        }, 100);
    },
    
    // Disable notes mode
    disableNotesMode() {
        document.body.classList.remove('notes-mode');
        
        // Restore previous focus mode state
        if (!this.wasFocusModeActive) {
            // Use the ViewModeManager to switch back to fade mode
            if (window.viewModeManager) {
                window.viewModeManager.setMode('fade');
            } else {
                // Fallback if ViewModeManager not available
                document.body.classList.remove('focus-mode');
                localStorage.setItem('viewMode', 'fade');
            }
        }
        
        this.removeNotesFromParagraphs();
        this.clearHighlights();
        this.clearAllGeneralHighlights();
    },
    
    // Add note UI to all paragraphs
    addNotesToParagraphs() {
        const paragraphs = document.querySelectorAll('p');
        paragraphs.forEach((paragraph) => {
            // Skip if already initialized, in notes section, or in header
            if (paragraph.dataset.notesInitialized ||
                paragraph.closest('#notes') ||
                paragraph.closest('header') ||
                paragraph.closest('.site-header')) {
                return;
            }

            paragraph.dataset.notesInitialized = 'true';
            const contentHash = this.hashContent(paragraph.textContent);
            paragraph.dataset.contentHash = contentHash;

            // Create containers and add buttons for both sides
            ['left', 'right'].forEach(side => {
                const container = document.createElement('div');
                container.className = 'paragraph-notes-container';
                container.dataset.side = side;

                // Add button for this side
                const addButton = document.createElement('button');
                addButton.className = 'note-add-button';
                addButton.innerHTML = '+';
                addButton.title = `Add note (${side} side)`;
                addButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Check if at capacity before allowing new note
                    if (this.isContainerAtCapacity(container)) {
                        return;
                    }
                    this.captureSelectedText(paragraph);
                    this.showNoteDialog(paragraph, contentHash, null, side);
                });

                container.appendChild(addButton);
                paragraph.appendChild(container);
            });

            // Load existing notes
            this.loadExistingNotes(paragraph, contentHash);
        });
    },
    
    // Check if container is at capacity based on paragraph height
    isContainerAtCapacity(container) {
        const paragraph = container.closest('p');
        if (!paragraph) return false;
        
        const paragraphHeight = paragraph.offsetHeight;
        const noteHeight = 1.25 * 16 + 4; // 1.25rem + gap in pixels (assuming 16px root font size)
        const addButtonHeight = 1.25 * 16; // Add button height
        
        // Calculate how many notes can fit in the paragraph height
        const maxNotes = Math.floor((paragraphHeight - addButtonHeight) / noteHeight);
        
        // Add 1 more to the calculation and ensure reasonable limits
        const cappedMaxNotes = Math.max(2, Math.min(13, maxNotes + 1));
        
        const noteItems = container.querySelectorAll('.note-item');
        return noteItems.length >= cappedMaxNotes;
    },
    
    // Update add button visibility based on capacity
    updateAddButtonVisibility(container) {
        const addButton = container.querySelector('.note-add-button');
        if (addButton) {
            if (this.isContainerAtCapacity(container)) {
                addButton.style.setProperty('display', 'none', 'important');
            } else {
                addButton.style.setProperty('display', 'flex', 'important');
            }
        }
    },
    
    // Update all add button visibility across all paragraphs
    updateAllButtonVisibility() {
        const containers = document.querySelectorAll('.paragraph-notes-container');
        containers.forEach(container => {
            this.updateAddButtonVisibility(container);
        });
    },
    
    // Capture selected text when creating a note
    captureSelectedText(paragraph) {
        const selection = window.getSelection();
        
        if (selection.rangeCount > 0 && !selection.isCollapsed) {
            const range = selection.getRangeAt(0);
            const selectedText = selection.toString().trim();
            
            // Check if selection is within the paragraph
            if (paragraph.contains(range.commonAncestorContainer)) {
                this.selectedTextRange = {
                    text: selectedText,
                    startOffset: this.getTextOffset(paragraph, range.startContainer, range.startOffset),
                    endOffset: this.getTextOffset(paragraph, range.endContainer, range.endOffset)
                };
            } else {
                this.selectedTextRange = null;
            }
        } else {
            this.selectedTextRange = null;
        }
        
        // Clear selection
        selection.removeAllRanges();
    },
    
    // Get text offset within paragraph
    getTextOffset(paragraph, node, offset) {
        let textOffset = 0;
        let walker = document.createTreeWalker(
            paragraph,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let currentNode;
        while (currentNode = walker.nextNode()) {
            if (currentNode === node) {
                return textOffset + offset;
            }
            textOffset += currentNode.textContent.length;
        }
        return textOffset;
    },
    
    // Remove notes from all paragraphs
    removeNotesFromParagraphs() {
        document.querySelectorAll('.note-add-button').forEach(btn => btn.remove());
        document.querySelectorAll('.paragraph-notes-container').forEach(container => container.remove());
        document.querySelectorAll('p[data-notes-initialized]').forEach(p => {
            delete p.dataset.notesInitialized;
            delete p.dataset.contentHash;
        });
    },

    // Calculate text similarity between two strings (0-1, higher = more similar)
    calculateSimilarity(text1, text2) {
        // Normalize both texts
        const normalize = (str) => str.trim().toLowerCase().replace(/\s+/g, ' ');
        const s1 = normalize(text1);
        const s2 = normalize(text2);

        if (s1 === s2) return 1.0;
        if (s1.length === 0 || s2.length === 0) return 0.0;

        // Simple word-based similarity (Jaccard similarity)
        const words1 = new Set(s1.split(' '));
        const words2 = new Set(s2.split(' '));

        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size;
    },

    // Find best paragraph match using fuzzy text matching
    findBestFuzzyMatch(noteData, allParagraphs) {
        // Extract original text from textRange if available
        let originalText = noteData.text || '';

        if (noteData.textRange && noteData.textRange.text) {
            originalText = noteData.textRange.text;
        }

        if (!originalText || originalText.length < 10) {
            return null; // Not enough text to match
        }

        let bestMatch = null;
        let bestScore = 0.7; // Minimum threshold - must be at least 70% similar

        allParagraphs.forEach((paragraph, index) => {
            const paragraphText = paragraph.textContent;
            const score = this.calculateSimilarity(originalText, paragraphText);

            if (score > bestScore) {
                bestScore = score;
                bestMatch = { paragraph, index, score };
            }
        });

        return bestMatch;
    },
    doesNoteMatchParagraph(noteData, contentHash, currentIndex, paragraphHashList) {
        if (!noteData.contextHashes || noteData.contextHashes.length !== 5) return false;

        const [hashM2, hashM1, hashPrimary, hashP1, hashP2] = noteData.contextHashes;

        // Priority 1: Check if PRIMARY hash matches current
        if (contentHash === hashPrimary) return true;

        // Priority 2: Check ±1 neighbors
        const m1Index = hashM1 ? paragraphHashList.indexOf(hashM1) : -1;
        const p1Index = hashP1 ? paragraphHashList.indexOf(hashP1) : -1;

        if (m1Index !== -1 && p1Index !== -1) {
            // Both ±1 found
            const distance = p1Index - m1Index;
            if (distance === 2 && currentIndex === m1Index + 1) {
                // They're 1 apart and current is in the middle → primary was rewritten
                return true;
            } else if (currentIndex === Math.min(m1Index, p1Index)) {
                // More than 1 apart → put on earliest
                return true;
            }
        } else if (m1Index !== -1 && currentIndex === m1Index) {
            // Only -1 found and it's current
            return true;
        } else if (p1Index !== -1 && currentIndex === p1Index) {
            // Only +1 found and it's current
            return true;
        }

        // Priority 3: Check ±2 neighbors
        const m2Index = hashM2 ? paragraphHashList.indexOf(hashM2) : -1;
        const p2Index = hashP2 ? paragraphHashList.indexOf(hashP2) : -1;

        if (m2Index !== -1 && p2Index !== -1) {
            // Both ±2 found
            const distance = p2Index - m2Index;
            if (distance === 4 && currentIndex === m2Index + 2) {
                // They're 3 apart and current is in the middle → primary was rewritten
                return true;
            } else if (currentIndex === Math.min(m2Index, p2Index)) {
                // More than 3 apart → put on earliest
                return true;
            }
        } else if (m2Index !== -1 && currentIndex === m2Index) {
            // Only -2 found and it's current
            return true;
        } else if (p2Index !== -1 && currentIndex === p2Index) {
            // Only +2 found and it's current
            return true;
        }

        return false;
    },

    // Load existing notes for all paragraphs using sophisticated hash-based matching
    loadAllExistingNotes() {
        // Use pre-loaded hash list (or build on demand as fallback)
        const paragraphHashList = this.getParagraphHashList();
        const allParagraphs = Array.from(document.querySelectorAll('p[data-notes-initialized]'));

        const unmatchedNotes = [];
        const relocatedNotes = [];

        // First pass: try exact and neighbor matching for all notes
        Object.keys(this.notes).forEach(noteKey => {
            try {
                const noteData = JSON.parse(this.notes[noteKey]);
                let matched = false;

                // Try to match with any paragraph
                for (let i = 0; i < allParagraphs.length; i++) {
                    const paragraph = allParagraphs[i];
                    const contentHash = paragraph.dataset.contentHash;
                    const currentIndex = paragraphHashList.indexOf(contentHash);

                    if (currentIndex !== -1 && this.doesNoteMatchParagraph(noteData, contentHash, currentIndex, paragraphHashList)) {
                        const noteId = noteKey.split('-').slice(2).join('-');
                        this.createNoteCircle(paragraph, contentHash, noteId, noteData);
                        matched = true;
                        break;
                    }
                }

                if (!matched) {
                    unmatchedNotes.push({ noteKey, noteData });
                }
            } catch (e) {
                console.error('Error loading note:', noteKey, e);
            }
        });

        // Second pass: fuzzy matching for unmatched notes
        if (unmatchedNotes.length > 0) {
            const allParaElements = Array.from(document.querySelectorAll('p:not(#notes p):not(header p):not(.site-header p)'));

            unmatchedNotes.forEach(({ noteKey, noteData }) => {
                const fuzzyMatch = this.findBestFuzzyMatch(noteData, allParaElements);

                if (fuzzyMatch) {
                    // Found a fuzzy match - relocate the note
                    const matchedPara = fuzzyMatch.paragraph;
                    const newContentHash = this.hashContent(matchedPara.textContent);
                    const noteId = noteKey.split('-').slice(2).join('-');

                    // Update note's context hashes to new location
                    noteData.contextHashes = this.generateContextHashes(matchedPara);
                    const newNoteKey = `h-${newContentHash}-${noteId}`;

                    // Save with new key
                    this.notes[newNoteKey] = JSON.stringify(noteData);
                    delete this.notes[noteKey]; // Remove old key

                    // Find the initialized paragraph element
                    const initPara = Array.from(document.querySelectorAll('p[data-notes-initialized]'))
                        .find(p => p === matchedPara);

                    if (initPara) {
                        this.createNoteCircle(initPara, newContentHash, noteId, noteData);
                        relocatedNotes.push({ noteId, score: fuzzyMatch.score });
                    }
                } else {
                    // No fuzzy match - orphan the note
                    noteData.originalKey = noteKey;
                    this.orphanedNotes[noteKey] = JSON.stringify(noteData);
                    delete this.notes[noteKey];
                }
            });

            // Save updated notes
            localStorage.setItem('userNotes', JSON.stringify(this.notes));
            localStorage.setItem('orphanedNotes', JSON.stringify(this.orphanedNotes));

            // Show notifications
            if (relocatedNotes.length > 0) {
                this.showRelocatedNotesNotification(relocatedNotes.length);
            }

            const newOrphans = unmatchedNotes.length - relocatedNotes.length;
            if (newOrphans > 0) {
                this.showOrphanedNotesNotification(newOrphans);
            }
        }

        // Update button visibility for all containers
        allParagraphs.forEach(paragraph => {
            ['left', 'right'].forEach(side => {
                const container = paragraph.querySelector(`.paragraph-notes-container[data-side="${side}"]`);
                if (container) {
                    this.updateAddButtonVisibility(container);
                }
            });
        });
    },

    // Load existing notes for a single paragraph (used when adding notes UI)
    loadExistingNotes(paragraph, contentHash) {
        // This is called per-paragraph during UI initialization
        // The actual note loading happens in loadAllExistingNotes() after all paragraphs are initialized
        // This function is kept for compatibility but does nothing
        // Notes will be loaded by loadAllExistingNotes() called from enableNotesMode()
    },
    
    // Create note circle
    createNoteCircle(paragraph, contentHash, noteId, noteData) {
        const side = noteData.side || 'left';
        const container = paragraph.querySelector(`.paragraph-notes-container[data-side="${side}"]`);
        if (!container) return;

        // Remove existing circle if any
        const existing = container.querySelector(`[data-note-id="${noteId}"]`);
        if (existing) existing.remove();

        // Create note item container
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        noteItem.dataset.noteId = noteId;

        const noteCircle = document.createElement('div');
        noteCircle.className = 'note-circle';
        noteCircle.style.backgroundColor = noteData.color || '#f0d9ef';
        noteCircle.title = noteData.text ? noteData.text.substring(0, 50) + '...' : 'Note';

        // Create delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'note-delete';
        deleteButton.innerHTML = '🗑';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const noteKey = `h-${contentHash}-${noteId}`;
            this.deleteNote(paragraph, contentHash, noteKey);
        });

        noteCircle.addEventListener('click', (e) => {
            e.stopPropagation();
            const noteKey = `h-${contentHash}-${noteId}`;

            // Check if this note's dialog is already open
            const existingDialog = document.querySelector('.note-input-container');
            if (existingDialog && this.activeNoteKey === noteKey) {
                // Same note clicked - close the dialog
                this.closeDialog(true);
                return;
            }

            // Different note or no dialog open - show this note's dialog
            this.clearHighlights();
            this.showNoteDialog(paragraph, contentHash, noteKey);
        });

        noteItem.appendChild(noteCircle);
        noteItem.appendChild(deleteButton);
        container.appendChild(noteItem);

        // Update add button visibility after adding note
        this.updateAddButtonVisibility(container);
    },
    
    // Show note dialog
    showNoteDialog(paragraph, contentHash, noteKey = null, selectedSide = null) {
        // Close any existing dialog (including view boxes)
        this.closeDialog(false); // Don't clear highlights yet, we'll show new ones

        // Clear all general highlights since we're opening a specific note
        this.clearAllGeneralHighlights();

        // Create new dialog
        const dialog = document.createElement('div');
        dialog.className = 'note-input-container';
        dialog.dataset.contentHash = contentHash;

        const isNewNote = !noteKey;
        let noteData = null;
        let noteId = null;

        if (noteKey) {
            noteData = JSON.parse(this.notes[noteKey]);
            noteId = noteKey.split('-').slice(2).join('-'); // Extract noteId from h-hash-noteId
            this.activeNoteKey = noteKey;
        } else {
            // Generate new note ID
            noteId = Date.now().toString(36);
            noteKey = `h-${contentHash}-${noteId}`;
            noteData = {
                text: '',
                color: '#F0D9EF',
                side: selectedSide || 'right',
                textRange: this.selectedTextRange,
                contextHashes: this.generateContextHashes(paragraph)
            };
        }
        
        // Start in view mode if note exists, edit mode if new
        const startInEditMode = isNewNote || !noteData.text;
        
        if (!startInEditMode) {
            // View mode - Clean design using original CSS
            const moveArrow = noteData.side === 'left' ? '→' : '←';
            dialog.innerHTML = `
                <div class="note-edit-container" style="background-color: ${noteData.color};">
                    <div class="note-edit-text">${noteData.text.replace(/\n/g, '<br>')}</div>
                    <button class="note-edit-button">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="note-move-button">${moveArrow}</button>
                </div>
            `;

            // Add event handlers for view mode
            const editBtn = dialog.querySelector('.note-edit-button');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.switchToEditMode(dialog, paragraph, contentHash, noteKey, noteData);
                });
            }

            const moveBtn = dialog.querySelector('.note-move-button');
            if (moveBtn) {
                moveBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.moveNoteSide(paragraph, contentHash, noteKey, noteData);
                    this.closeDialog();
                });
            }

        } else {
            // Edit mode
            this.switchToEditMode(dialog, paragraph, contentHash, noteKey, noteData);
        }
        
        // Common handlers
        dialog.querySelector('.note-dialog-close')?.addEventListener('click', () => {
            this.closeDialog();
        });
        
        // Position below paragraph - insert directly after the paragraph
        // Remove all spacing to eliminate line gaps - use !important to override CSS
        dialog.style.setProperty('margin', '0', 'important');
        dialog.style.setProperty('margin-top', '0', 'important');
        dialog.style.setProperty('margin-bottom', '0', 'important');
        dialog.style.setProperty('padding', '0', 'important');
        dialog.style.setProperty('clear', 'none', 'important');
        dialog.style.setProperty('display', 'block', 'important');
        dialog.style.setProperty('vertical-align', 'top', 'important');
        dialog.style.setProperty('position', 'relative', 'important');
        dialog.style.setProperty('width', 'auto', 'important');
        dialog.style.setProperty('max-width', '100%', 'important');
        
        // Remove bottom margin from the paragraph when dialog is attached
        paragraph.style.setProperty('margin-bottom', '0', 'important');
        
        if (paragraph.nextSibling) {
            paragraph.parentNode.insertBefore(dialog, paragraph.nextSibling);
        } else {
            paragraph.parentNode.appendChild(dialog);
        }
        
        // Highlight associated text immediately when dialog opens
        if (noteData.textRange) {
            this.highlightText(paragraph, noteData.textRange, noteData.color);
        } else {
        }
    },
    
    // Switch dialog to edit mode
    switchToEditMode(dialog, paragraph, contentHash, noteKey, noteData) {
        dialog.innerHTML = `
            <textarea class="note-input" placeholder="">${noteData.text}</textarea>
            <div class="note-color-picker">
                ${['#F0D9EF', '#FCDCE1', '#FFE6BB', '#E9ECCE', '#CDE9DC', '#C4DFE5'].map(color =>
                    `<button class="color-option ${noteData.color === color ? 'selected' : ''}"
                            style="background-color: ${color}"
                            data-color="${color}"></button>`
                ).join('')}
            </div>
        `;

        // Focus textarea
        const textarea = dialog.querySelector('.note-input');
        textarea.focus();

        // Show initial highlighting if there's selected text
        if (noteData.textRange) {
            this.highlightText(paragraph, noteData.textRange, noteData.color);
        }

        // Color picker
        let selectedColor = noteData.color;
        dialog.querySelectorAll('.color-option').forEach(btn => {
            btn.addEventListener('click', () => {
                dialog.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedColor = btn.dataset.color;

                // Update highlight color in real-time
                if (noteData.textRange) {
                    this.highlightText(paragraph, noteData.textRange, selectedColor);
                }
            });
        });

        // Enter key to save
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = textarea.value.trim();
                if (text || noteData.textRange) {
                    const saveData = {
                        ...noteData,
                        text: text,
                        color: selectedColor,
                        contextHashes: noteData.contextHashes || this.generateContextHashes(paragraph)
                    };
                    this.saveNote(paragraph, contentHash, noteKey, saveData);
                }
                this.closeDialog();
            }
        });
    },
    
    // Save note
    saveNote(paragraph, contentHash, noteKey, noteData) {
        this.notes[noteKey] = JSON.stringify(noteData);
        localStorage.setItem('userNotes', JSON.stringify(this.notes));

        const noteId = noteKey.split('-').slice(2).join('-');
        this.createNoteCircle(paragraph, contentHash, noteId, noteData);
    },

    // Move note to other side
    moveNoteSide(paragraph, contentHash, noteKey, noteData) {
        const noteId = noteKey.split('-').slice(2).join('-');

        // Remove the existing note item from the current side
        paragraph.querySelectorAll(`.note-item[data-note-id="${noteId}"]`).forEach(item => {
            item.remove();
        });

        // Update the side and save
        noteData.side = noteData.side === 'left' ? 'right' : 'left';
        this.saveNote(paragraph, contentHash, noteKey, noteData);
    },

    // Delete note
    deleteNote(paragraph, contentHash, noteKey) {
        delete this.notes[noteKey];
        localStorage.setItem('userNotes', JSON.stringify(this.notes));

        const noteId = noteKey.split('-').slice(2).join('-');
        paragraph.querySelectorAll(`.note-item[data-note-id="${noteId}"]`).forEach(item => {
            const container = item.parentElement;
            item.remove();
            // Update add button visibility after removing note
            this.updateAddButtonVisibility(container);
        });
    },
    
    // Highlight text in paragraph
    highlightText(paragraph, textRange, color) {
        this.clearHighlights();
        
        if (!textRange) {
            return;
        }
        
        const text = paragraph.textContent;
        const before = text.substring(0, textRange.startOffset);
        const highlighted = text.substring(textRange.startOffset, textRange.endOffset);
        const after = text.substring(textRange.endOffset);
        
        
        if (highlighted) {
            // Create the highlight span without touching the note containers
            const walker = document.createTreeWalker(
                paragraph,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let currentOffset = 0;
            let textNode;
            let startNode = null;
            let endNode = null;
            let startNodeOffset = 0;
            let endNodeOffset = 0;
            
            // Find the text nodes that contain our range
            while (textNode = walker.nextNode()) {
                const nodeLength = textNode.textContent.length;
                
                if (startNode === null && currentOffset + nodeLength > textRange.startOffset) {
                    startNode = textNode;
                    startNodeOffset = textRange.startOffset - currentOffset;
                }
                
                if (endNode === null && currentOffset + nodeLength >= textRange.endOffset) {
                    endNode = textNode;
                    endNodeOffset = textRange.endOffset - currentOffset;
                    break;
                }
                
                currentOffset += nodeLength;
            }
            
            if (startNode && endNode) {
                const range = document.createRange();
                range.setStart(startNode, startNodeOffset);
                range.setEnd(endNode, endNodeOffset);
                
                const highlightSpan = document.createElement('span');
                highlightSpan.className = 'note-highlight';
                highlightSpan.style.backgroundColor = color + '80';
                
                try {
                    range.surroundContents(highlightSpan);
                } catch (e) {
                    // Fallback to original method if range spans multiple elements
                    paragraph.innerHTML = 
                        this.escapeHtml(before) + 
                        `<span class="note-highlight" style="background-color: ${color}80">${this.escapeHtml(highlighted)}</span>` +
                        this.escapeHtml(after);
                    this.restoreNoteContainers(paragraph);
                }
            }
        } else {
        }
    },
    
    // Clear all highlights
    clearHighlights() {
        document.querySelectorAll('.note-highlight').forEach(highlight => {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        });
    },
    
    // Restore note containers after innerHTML replacement
    restoreNoteContainers(paragraph) {
        const contentHash = paragraph.dataset.contentHash;
        const existingNotes = [];

        // Use pre-loaded hash list
        const paragraphHashList = this.getParagraphHashList();
        const currentIndex = paragraphHashList.indexOf(contentHash);

        if (currentIndex === -1) return; // Current paragraph not found

        // Find notes matching this paragraph's hash
        Object.keys(this.notes).forEach(key => {
            try {
                const noteData = JSON.parse(this.notes[key]);

                if (this.doesNoteMatchParagraph(noteData, contentHash, currentIndex, paragraphHashList)) {
                    const noteId = key.split('-').slice(2).join('-');
                    existingNotes.push({ noteId, noteData });
                }
            } catch (e) {
                console.error('Error restoring note:', key, e);
            }
        });

        // Recreate containers
        ['left', 'right'].forEach(side => {
            const container = document.createElement('div');
            container.className = 'paragraph-notes-container';
            container.dataset.side = side;

            // Add button for this side
            const addButton = document.createElement('button');
            addButton.className = 'note-add-button';
            addButton.innerHTML = '+';
            addButton.title = `Add note (${side} side)`;
            addButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.captureSelectedText(paragraph);
                this.showNoteDialog(paragraph, contentHash, null, side);
            });

            container.appendChild(addButton);
            paragraph.appendChild(container);
        });

        // Restore existing notes and update button visibility
        existingNotes.forEach(({noteId, noteData}) => {
            this.createNoteCircle(paragraph, contentHash, noteId, noteData);
        });

        // Update add button visibility for both sides after restoring
        ['left', 'right'].forEach(side => {
            const sideContainer = paragraph.querySelector(`.paragraph-notes-container[data-side="${side}"]`);
            if (sideContainer) {
                this.updateAddButtonVisibility(sideContainer);
            }
        });
    },
    
    // Close dialog
    closeDialog(clearHighlights = true) {
        const dialog = document.querySelector('.note-input-container');
        if (dialog) {
            // Restore paragraph margin before removing dialog
            const paragraphs = document.querySelectorAll('p');
            paragraphs.forEach(p => {
                if (p.style.marginBottom === '0px') {
                    p.style.removeProperty('margin-bottom');
                }
            });
            dialog.remove();
        }
        if (clearHighlights) {
            this.clearHighlights();
        }
        this.activeNoteKey = null;
        if (clearHighlights) {
            this.selectedTextRange = null;
        }
        
        // Show all text ranges in light green when no dialog is open
        this.showAllTextRanges();
    },
    
    // Show all text ranges in light green when no dialog is open
    showAllTextRanges() {
        if (this.activeNoteKey) return; // Don't show if a dialog is open

        // Use pre-loaded hash list
        const paragraphHashList = this.getParagraphHashList();

        const paragraphs = document.querySelectorAll('p[data-notes-initialized]');
        paragraphs.forEach(paragraph => {
            const contentHash = paragraph.dataset.contentHash;
            const currentIndex = paragraphHashList.indexOf(contentHash);

            if (currentIndex === -1) return;

            // Find notes matching this paragraph
            Object.keys(this.notes).forEach(noteKey => {
                try {
                    const noteData = JSON.parse(this.notes[noteKey]);

                    if (this.doesNoteMatchParagraph(noteData, contentHash, currentIndex, paragraphHashList)) {
                        if (noteData.textRange) {
                            this.highlightTextRange(paragraph, noteData.textRange, '#a4cbb840', 'general-highlight');
                        }
                    }
                } catch (e) {
                    console.error('Error showing text range:', noteKey, e);
                }
            });
        });
    },
    
    // Clear all general (light green) highlights
    clearAllGeneralHighlights() {
        document.querySelectorAll('.general-highlight').forEach(highlight => {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        });
    },
    
    // Highlight text range with custom class
    highlightTextRange(paragraph, textRange, color, className = 'note-highlight') {
        if (!textRange) return;
        
        const text = paragraph.textContent;
        const before = text.substring(0, textRange.startOffset);
        const highlighted = text.substring(textRange.startOffset, textRange.endOffset);
        const after = text.substring(textRange.endOffset);
        
        if (highlighted) {
            // Use TreeWalker approach for precise highlighting
            const walker = document.createTreeWalker(
                paragraph,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let currentOffset = 0;
            let textNode;
            let startNode = null;
            let endNode = null;
            let startNodeOffset = 0;
            let endNodeOffset = 0;
            
            while (textNode = walker.nextNode()) {
                const nodeLength = textNode.textContent.length;
                
                if (startNode === null && currentOffset + nodeLength > textRange.startOffset) {
                    startNode = textNode;
                    startNodeOffset = textRange.startOffset - currentOffset;
                }
                
                if (endNode === null && currentOffset + nodeLength >= textRange.endOffset) {
                    endNode = textNode;
                    endNodeOffset = textRange.endOffset - currentOffset;
                    break;
                }
                
                currentOffset += nodeLength;
            }
            
            if (startNode && endNode) {
                const range = document.createRange();
                range.setStart(startNode, startNodeOffset);
                range.setEnd(endNode, endNodeOffset);
                
                const highlightSpan = document.createElement('span');
                highlightSpan.className = className;
                highlightSpan.style.backgroundColor = color;
                
                try {
                    range.surroundContents(highlightSpan);
                } catch (e) {
                    // Fallback for complex cases - skip this highlight
                }
            }
        }
    },
    
    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Attach global event handlers
    attachEventHandlers() {
        // Update button visibility periodically - removed time tracking dependency
        setInterval(() => this.updateNotesButtonVisibility(), 30000);
        
        // Click outside to close dialog
        document.addEventListener('click', (e) => {
            const dialog = document.querySelector('.note-input-container');
            if (dialog && !dialog.contains(e.target) && !e.target.closest('.note-circle') && !e.target.closest('.note-add-button')) {
                this.closeDialog(true); // Clear highlights when clicking outside
            }
        });
        
        // Click on another circle switches to that note
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('note-circle')) {
                // The circle click handler will show the new dialog
            }
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeDialog(true); // Clear highlights when pressing escape
            }
        });
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NotesSystem.init());
} else {
    NotesSystem.init();
}

// Export for external access
window.NotesSystem = NotesSystem;

// Hook for content loading - call this when new content is loaded
window.NotesSystem.refreshParagraphs = function() {
    if (NotesSystem.isNotesMode) {
        NotesSystem.addNotesToParagraphs();
    }
};

// Hook for import - reload notes from localStorage and refresh display
window.NotesSystem.reloadNotes = function() {
    NotesSystem.notes = JSON.parse(localStorage.getItem('userNotes')) || {};
    if (NotesSystem.isNotesMode) {
        NotesSystem.removeNotesFromParagraphs();
        NotesSystem.addNotesToParagraphs();
    }
};