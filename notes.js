// Simple Notes System - Symmetric Left/Right with Text Selection
// Clean implementation with view/edit modes and text highlighting

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
    
    // Update notes button visibility based on time threshold
    updateNotesButtonVisibility() {
        if (!window.state) return;
        
        const totalTime = window.state.totalTimeOnSite + (Date.now() - window.state.siteStartTime);
        const twentyMinutes = 20 * 60 * 1000;
        
        const notesButtons = document.querySelectorAll('.notes-toggle');
        notesButtons.forEach(button => {
            // Temporarily always show for testing
            button.style.display = 'flex';
            // button.style.display = totalTime >= twentyMinutes ? 'flex' : 'none';
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
        console.log('Enabling notes mode');
        document.body.classList.add('notes-mode');
        
        // Remember if plain text mode was already active
        this.wasPlainTextModeActive = document.body.classList.contains('plain-text-mode');
        
        // Force plain text mode when notes are active
        if (!this.wasPlainTextModeActive) {
            document.body.classList.add('plain-text-mode');
            localStorage.setItem('plainTextMode', 'true');
        }
        
        this.addNotesToParagraphs();
    },
    
    // Disable notes mode
    disableNotesMode() {
        document.body.classList.remove('notes-mode');
        
        // Restore previous plain text mode state
        if (!this.wasPlainTextModeActive) {
            document.body.classList.remove('plain-text-mode');
            localStorage.setItem('plainTextMode', 'false');
        }
        
        this.removeNotesFromParagraphs();
        this.clearHighlights();
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
    
    // Capture selected text when creating a note
    captureSelectedText(paragraph) {
        const selection = window.getSelection();
        console.log('Capturing selection:', selection.toString(), 'Range count:', selection.rangeCount);
        
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
                console.log('Selected text captured:', JSON.stringify(this.selectedTextRange, null, 2));
            } else {
                this.selectedTextRange = null;
                console.log('Selection not within paragraph');
            }
        } else {
            this.selectedTextRange = null;
            console.log('No selection or collapsed selection');
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
            this.showNoteDialog(paragraph, paragraphIndex, noteKey);
        });
        
        noteItem.appendChild(noteCircle);
        noteItem.appendChild(deleteButton);
        container.appendChild(noteItem);
    },
    
    // Show note dialog
    showNoteDialog(paragraph, paragraphIndex, noteKey = null, selectedSide = null) {
        // Close any existing dialog
        this.closeDialog();
        
        // Create new dialog
        const dialog = document.createElement('div');
        dialog.className = 'note-input-container';
        dialog.dataset.paragraphIndex = paragraphIndex;
        
        const isNewNote = !noteKey;
        let noteData = null;
        let noteId = null;
        
        if (noteKey) {
            noteData = JSON.parse(this.notes[noteKey]);
            console.log('Loading existing note data:', JSON.stringify(noteData, null, 2));
            noteId = noteKey.split('-')[1];
            this.activeNoteKey = noteKey;
        } else {
            // Generate new note ID
            noteId = Date.now().toString(36);
            noteKey = `p${paragraphIndex}-${noteId}`;
            noteData = {
                text: this.selectedTextRange ? this.selectedTextRange.text : '',
                color: '#f0d9ef',
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
        if (paragraph.nextSibling) {
            paragraph.parentNode.insertBefore(dialog, paragraph.nextSibling);
        } else {
            paragraph.parentNode.appendChild(dialog);
        }
        
        // Highlight associated text
        console.log('Checking for text range to highlight:', noteData.textRange);
        if (noteData.textRange) {
            this.highlightText(paragraph, noteData.textRange, noteData.color);
        } else {
            console.log('No text range found in noteData for highlighting');
        }
    },
    
    // Switch dialog to edit mode
    switchToEditMode(dialog, paragraph, paragraphIndex, noteKey, noteData) {
        dialog.innerHTML = `
            <textarea class="note-input" placeholder="">${noteData.text}</textarea>
            <div class="note-color-picker">
                ${['#f0d9ef', '#d9f0ef', '#f0efd9', '#efd9f0', '#d9eff0'].map(color => 
                    `<button class="color-option ${noteData.color === color ? 'selected' : ''}" 
                            style="background-color: ${color}" 
                            data-color="${color}"></button>`
                ).join('')}
            </div>
        `;
        
        // Focus textarea
        const textarea = dialog.querySelector('.note-input');
        textarea.focus();
        
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
                console.log('Enter pressed - noteData before save:', JSON.stringify(noteData, null, 2));
                if (text || noteData.textRange) {
                    const saveData = {
                        ...noteData,
                        text: text,
                        color: selectedColor
                    };
                    console.log('Data being saved:', JSON.stringify(saveData, null, 2));
                    this.saveNote(paragraph, paragraphIndex, noteKey, saveData);
                }
                this.closeDialog();
            }
        });
    },
    
    // Save note
    saveNote(paragraph, paragraphIndex, noteKey, noteData) {
        console.log('Saving note with data:', JSON.stringify(noteData, null, 2));
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
            item.remove();
        });
    },
    
    // Highlight text in paragraph
    highlightText(paragraph, textRange, color) {
        console.log('Highlighting text:', textRange, 'with color:', color);
        this.clearHighlights();
        
        if (!textRange) {
            console.log('No text range to highlight');
            return;
        }
        
        const text = paragraph.textContent;
        const before = text.substring(0, textRange.startOffset);
        const highlighted = text.substring(textRange.startOffset, textRange.endOffset);
        const after = text.substring(textRange.endOffset);
        
        console.log('Text breakdown - before:', before.length, 'highlighted:', highlighted, 'after:', after.length);
        
        if (highlighted) {
            paragraph.innerHTML = 
                this.escapeHtml(before) + 
                `<span class="note-highlight" style="background-color: ${color}80">${this.escapeHtml(highlighted)}</span>` +
                this.escapeHtml(after);
            console.log('Highlight applied to paragraph');
        } else {
            console.log('No highlighted text found');
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
    
    // Close dialog
    closeDialog() {
        document.querySelector('.note-input-container')?.remove();
        this.clearHighlights();
        this.activeNoteKey = null;
        this.selectedTextRange = null;
    },
    
    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Attach global event handlers
    attachEventHandlers() {
        // Update button visibility periodically
        if (window.state) {
            setInterval(() => this.updateNotesButtonVisibility(), 30000);
        }
        
        // Click outside to close dialog
        document.addEventListener('click', (e) => {
            const dialog = document.querySelector('.note-input-container');
            if (dialog && !dialog.contains(e.target) && !e.target.closest('.note-circle') && !e.target.closest('.note-add-button')) {
                this.closeDialog();
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
                this.closeDialog();
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
        console.log('Refreshing paragraphs after content load');
        NotesSystem.addNotesToParagraphs();
    }
};