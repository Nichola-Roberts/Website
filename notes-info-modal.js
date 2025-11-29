/**
 * Notes Info Modal
 * Shows information about how the notes system works on first use
 */

class NotesInfoModal {
    constructor() {
        this.modal = null;
        this.backdrop = null;
        this.isOpen = false;
        
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // Create modal HTML if it doesn't exist
        this.createModal();
        
        // Get modal elements
        this.modal = document.getElementById('notesInfoModal');
        this.backdrop = document.getElementById('modalBackdrop');
        
        if (!this.modal || !this.backdrop) {
            console.warn('Notes info modal elements not found');
            return;
        }

        // Set up event listeners
        this.setupEventListeners();
    }

    createModal() {
        // Check if modal already exists
        if (document.getElementById('notesInfoModal')) return;
        
        const modalHTML = `
            <!-- Notes Info Modal -->
            <div class="notes-info-modal" id="notesInfoModal">
                <div class="transfer-modal-inner">
                    <button class="transfer-close" id="notesInfoClose">&times;</button>
                    <div class="transfer-content">
                        <div class="transfer-header">
                            <h2 class="transfer-title">Notes</h2>
                        </div>
                        <div class="notes-info-content">
                            <p>You may add your own notes to the document.</p>
                            <p>Click the pluses on each paragraph to add notes to that paragraph.</p>
                            <p>If text is highlighted the note will attach to that text.</p>
                            <p>Right margin notes can be shared with others (mobile to laptop, or with friends).</p>
                            <p>Use the Share button to generate a code for others to import your notes.</p>
                            <p>Shared notes will appear in the left hand margin.</p>
                            <p>This allows a clear distinction for imported notes.</p>
                            <p>Notes can be moved from margin to the other.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insert before the last script tag
        const lastScript = document.querySelector('script:last-of-type');
        if (lastScript) {
            lastScript.insertAdjacentHTML('beforebegin', modalHTML);
        } else {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    }

    setupEventListeners() {
        // Close button
        const closeButton = document.getElementById('notesInfoClose');
        if (closeButton) {
            closeButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.hide();
            });
        }

        // Modal backdrop click (click on the modal itself, not the content)
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.hide();
                }
            });
        }

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.hide();
            }
        });

        // Prevent modal content click from closing
        const modalContent = this.modal.querySelector('.transfer-modal-inner');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    show() {
        if (!this.modal || !this.backdrop) return;
        
        this.isOpen = true;
        
        // Show backdrop
        this.backdrop.classList.add('active');
        
        // Show modal with transfer modal styling
        this.modal.style.display = 'flex';
        this.modal.classList.add('active');
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Focus close button for accessibility
        setTimeout(() => {
            const closeButton = document.getElementById('notesInfoClose');
            if (closeButton) {
                closeButton.focus();
            }
        }, 100);
    }

    hide() {
        if (!this.modal || !this.backdrop) return;
        
        this.isOpen = false;
        
        // Hide backdrop
        this.backdrop.classList.remove('active');
        
        // Hide modal
        this.modal.classList.remove('active');
        this.modal.style.display = 'none';
        
        // Restore body scroll
        document.body.style.overflow = '';
    }

    // Public method to show modal on first notes use
    showFirstTimeModal() {
        const hasSeenNotesInfo = localStorage.getItem('hasSeenNotesInfo');
        if (!hasSeenNotesInfo) {
            setTimeout(() => {
                this.show();
                localStorage.setItem('hasSeenNotesInfo', 'true');
            }, 300); // Small delay to let notes mode activate first
        }
    }
}

// Initialize when script loads
const notesInfoModal = new NotesInfoModal();

// Make it globally available
window.notesInfoModal = notesInfoModal;