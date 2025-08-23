// Simple Notes System - Bilateral Left/Right with Text Selection
// Clean implementation with view/edit modes and text highlighting
// Simplified version without transfer functionality

const NotesSystem = {
    isNotesMode: localStorage.getItem('notesMode') === 'true' || false,
    notes: JSON.parse(localStorage.getItem('userNotes')) || {},
    activeNoteKey: null,
    selectedTextRange: null,
    wasPlainTextModeActive: false, // Track previous plain text state
    
    // Initialize notes system
    init() {
        this.loadSavedState();
        this.initializeNotesButton();
        this.attachEventHandlers();
        
        if (this.isNotesMode) {
            this.enableNotesMode();
        }
    },
    
    // Load saved notes mode state
    loadSavedState() {
        // Reload notes from localStorage
        this.notes = JSON.parse(localStorage.getItem('userNotes')) || {};
        
        if (this.isNotesMode) {
            document.body.classList.add('notes-mode');
        }
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
        } else {
            this.disableNotesMode();
        }
    },
    
    // Enable notes mode
    enableNotesMode() {
        document.body.classList.add('notes-mode');
        
        // Remember if plain text mode was already active
        this.wasPlainTextModeActive = document.body.classList.contains('plain-text-mode');
        
        // Force plain text mode when notes are active
        if (!this.wasPlainTextModeActive) {
            // Use the ViewModeManager to switch to plain text mode
            if (window.viewModeManager) {
                window.viewModeManager.setMode('plain-text');
            } else {
                // Fallback if ViewModeManager not available
                document.body.classList.add('plain-text-mode');
                localStorage.setItem('viewMode', 'plain-text');
            }
        }
        
        this.addNotesToParagraphs();
        this.showAllTextRanges();
        
        // Update all button visibility based on current capacity
        this.updateAllButtonVisibility();
    },
    
    // Disable notes mode
    disableNotesMode() {
        document.body.classList.remove('notes-mode');
        
        // Restore previous plain text mode state
        if (!this.wasPlainTextModeActive) {
            // Use the ViewModeManager to switch back to fade mode
            if (window.viewModeManager) {
                window.viewModeManager.setMode('fade');
            } else {
                // Fallback if ViewModeManager not available
                document.body.classList.remove('plain-text-mode');
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
        paragraphs.forEach((paragraph, index) => {
            // Skip if already initialized, in notes section, or in header
            if (paragraph.dataset.notesInitialized || 
                paragraph.closest('#notes') || 
                paragraph.closest('header') || 
                paragraph.closest('.site-header')) {
                return;
            }
            
            paragraph.dataset.notesInitialized = 'true';
            paragraph.dataset.paragraphIndex = index;
            
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
                    this.showNoteDialog(paragraph, index, null, side);
                });
                
                container.appendChild(addButton);
                paragraph.appendChild(container);
            });
            
            // Load existing notes
            this.loadExistingNotes(paragraph, index);
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
            delete p.dataset.paragraphIndex;
        });
    },
    
    // Load existing notes for a paragraph
    loadExistingNotes(paragraph, paragraphIndex) {
        const paragraphNotes = Object.keys(this.notes)
            .filter(key => key.startsWith(`p${paragraphIndex}-`));
        
        paragraphNotes.forEach(noteKey => {
            const noteData = JSON.parse(this.notes[noteKey]);
            const [, noteId] = noteKey.split('-');
            this.createNoteCircle(paragraph, paragraphIndex, noteId, noteData);
        });
        
        // Update add button visibility for both sides after loading notes
        ['left', 'right'].forEach(side => {
            const container = paragraph.querySelector(`.paragraph-notes-container[data-side="${side}"]`);
            if (container) {
                this.updateAddButtonVisibility(container);
            }
        });
    },
    
    // Create note circle
    createNoteCircle(paragraph, paragraphIndex, noteId, noteData) {
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
            const noteKey = `p${paragraphIndex}-${noteId}`;
            this.deleteNote(paragraph, paragraphIndex, noteKey);
        });
        
        noteCircle.addEventListener('click', (e) => {
            e.stopPropagation();
            const noteKey = `p${paragraphIndex}-${noteId}`;
            
            // Check if this note's dialog is already open
            const existingDialog = document.querySelector('.note-input-container');
            if (existingDialog && this.activeNoteKey === noteKey) {
                // Same note clicked - close the dialog
                this.closeDialog(true);
                return;
            }
            
            // Different note or no dialog open - show this note's dialog
            this.clearHighlights();
            this.showNoteDialog(paragraph, paragraphIndex, noteKey);
        });
        
        noteItem.appendChild(noteCircle);
        noteItem.appendChild(deleteButton);
        container.appendChild(noteItem);
        
        // Update add button visibility after adding note
        this.updateAddButtonVisibility(container);
    },
    
    // Show note dialog
    showNoteDialog(paragraph, paragraphIndex, noteKey = null, selectedSide = null) {
        // Close any existing dialog (including view boxes)
        this.closeDialog(false); // Don't clear highlights yet, we'll show new ones
        
        // Clear all general highlights since we're opening a specific note
        this.clearAllGeneralHighlights();
        
        // Create new dialog
        const dialog = document.createElement('div');
        dialog.className = 'note-input-container';
        dialog.dataset.paragraphIndex = paragraphIndex;
        
        const isNewNote = !noteKey;
        let noteData = null;
        let noteId = null;
        
        if (noteKey) {
            noteData = JSON.parse(this.notes[noteKey]);
            noteId = noteKey.split('-')[1];
            this.activeNoteKey = noteKey;
        } else {
            // Generate new note ID
            noteId = Date.now().toString(36);
            noteKey = `p${paragraphIndex}-${noteId}`;
            noteData = {
                text: '',
                color: '#F0D9EF',
                side: selectedSide || 'right',
                textRange: this.selectedTextRange
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
                    this.switchToEditMode(dialog, paragraph, paragraphIndex, noteKey, noteData);
                });
            }
            
            const moveBtn = dialog.querySelector('.note-move-button');
            if (moveBtn) {
                moveBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.moveNoteSide(paragraph, paragraphIndex, noteKey, noteData);
                    this.closeDialog();
                });
            }
            
        } else {
            // Edit mode
            this.switchToEditMode(dialog, paragraph, paragraphIndex, noteKey, noteData);
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
    switchToEditMode(dialog, paragraph, paragraphIndex, noteKey, noteData) {
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
                        color: selectedColor
                    };
                    this.saveNote(paragraph, paragraphIndex, noteKey, saveData);
                }
                this.closeDialog();
            }
        });
    },
    
    // Save note
    saveNote(paragraph, paragraphIndex, noteKey, noteData) {
        this.notes[noteKey] = JSON.stringify(noteData);
        localStorage.setItem('userNotes', JSON.stringify(this.notes));
        
        const noteId = noteKey.split('-')[1];
        this.createNoteCircle(paragraph, paragraphIndex, noteId, noteData);
    },
    
    // Move note to other side
    moveNoteSide(paragraph, paragraphIndex, noteKey, noteData) {
        const noteId = noteKey.split('-')[1];
        
        // Remove the existing note item from the current side
        paragraph.querySelectorAll(`.note-item[data-note-id="${noteId}"]`).forEach(item => {
            item.remove();
        });
        
        // Update the side and save
        noteData.side = noteData.side === 'left' ? 'right' : 'left';
        this.saveNote(paragraph, paragraphIndex, noteKey, noteData);
    },
    
    // Delete note
    deleteNote(paragraph, paragraphIndex, noteKey) {
        delete this.notes[noteKey];
        localStorage.setItem('userNotes', JSON.stringify(this.notes));
        
        const noteId = noteKey.split('-')[1];
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
        const existingNotes = Object.keys(this.notes)
            .filter(key => key.startsWith(`p${paragraph.dataset.paragraphIndex}-`))
            .map(key => {
                const noteData = JSON.parse(this.notes[key]);
                const noteId = key.split('-')[1];
                return { noteId, noteData };
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
                const paragraphIndex = parseInt(paragraph.dataset.paragraphIndex);
                this.captureSelectedText(paragraph);
                this.showNoteDialog(paragraph, paragraphIndex, null, side);
            });
            
            container.appendChild(addButton);
            paragraph.appendChild(container);
        });
        
        // Restore existing notes and update button visibility
        existingNotes.forEach(({noteId, noteData}) => {
            this.createNoteCircle(paragraph, parseInt(paragraph.dataset.paragraphIndex), noteId, noteData);
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
        
        const paragraphs = document.querySelectorAll('p[data-notes-initialized]');
        paragraphs.forEach(paragraph => {
            const paragraphIndex = parseInt(paragraph.dataset.paragraphIndex);
            const paragraphNotes = Object.keys(this.notes)
                .filter(key => key.startsWith(`p${paragraphIndex}-`));
            
            paragraphNotes.forEach(noteKey => {
                const noteData = JSON.parse(this.notes[noteKey]);
                if (noteData.textRange) {
                    this.highlightTextRange(paragraph, noteData.textRange, '#CDE9DC40', 'general-highlight');
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