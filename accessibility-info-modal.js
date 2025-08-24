/**
 * Accessibility Info Modal
 * Shows information about accessibility controls available in the panel
 */

class AccessibilityInfoModal {
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
        // Get modal elements
        this.modal = document.getElementById('accessibilityInfoModal');
        this.backdrop = document.getElementById('modalBackdrop');
        
        if (!this.modal || !this.backdrop) {
            console.warn('Accessibility info modal elements not found');
            return;
        }

        // Set up event listeners
        this.setupEventListeners();
        
        // Check if notes button exists and show/hide notes section
        this.updateNotesSection();
    }

    setupEventListeners() {
        // Info button click
        const infoButton = document.querySelector('.accessibility-info-toggle');
        if (infoButton) {
            infoButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.show();
            });
        }

        // Close button
        const closeButton = document.getElementById('accessibilityInfoClose');
        if (closeButton) {
            closeButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.hide();
            });
        }

        // Click outside modal content to close
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
        
        // Keep accessibility panel visible and interactive
        const accessibilityPanel = document.getElementById('accessibilityPanel');
        if (accessibilityPanel) {
            accessibilityPanel.style.zIndex = '10001'; // Above modal
        }
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Focus close button for accessibility
        setTimeout(() => {
            const closeButton = document.getElementById('accessibilityInfoClose');
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
        
        // Restore accessibility panel z-index
        const accessibilityPanel = document.getElementById('accessibilityPanel');
        if (accessibilityPanel) {
            accessibilityPanel.style.zIndex = ''; // Reset to CSS default
        }
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Return focus to info button
        const infoButton = document.querySelector('.accessibility-info-toggle');
        if (infoButton) {
            infoButton.focus();
        }
    }

    updateNotesSection() {
        // Check if notes toggle button exists in the accessibility panel
        const notesButton = document.querySelector('.notes-toggle');
        const notesSection = this.modal.querySelector('.notes-section');
        
        if (notesButton && notesSection) {
            // Notes button exists, show the section
            notesSection.style.display = 'block';
        } else if (notesSection) {
            // Notes button doesn't exist, hide the section
            notesSection.style.display = 'none';
        }
    }
}

// Initialize when script loads
new AccessibilityInfoModal();