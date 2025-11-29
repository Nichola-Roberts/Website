// Transfer Modal System - Conditional UI Version
// Shows different content based on whether notes are available

const TransferModal = {
    modal: null,
    modalInner: null,
    closeButton: null,
    toggleButtons: null,
    isOpen: false,
    hasNotes: false,
    
    // Initialize the transfer modal system
    init() {
        this.modal = document.getElementById('transferModal');
        this.modalInner = document.querySelector('.transfer-modal-inner');
        this.closeButton = document.querySelector('.transfer-close');
        this.toggleButtons = document.querySelectorAll('.transfer-toggle');
        
        if (!this.modal || !this.toggleButtons.length) {
            return;
        }
        
        this.attachEventHandlers();
        this.checkForImportParameter();
    },
    
    // Check URL for import parameter and auto-open modal if present
    checkForImportParameter() {
        const urlParams = new URLSearchParams(window.location.search);
        const importCode = urlParams.get('import');
        
        if (importCode && importCode.length === 8) {
            // Auto-open the transfer modal
            setTimeout(() => {
                this.show();
                
                // Wait for modal to be set up, then fill in the import code
                setTimeout(() => {
                    const importInput = document.getElementById('importCode');
                    const importBtn = document.getElementById('importDataBtn');
                    
                    if (importInput) {
                        importInput.value = importCode.toUpperCase();
                        // Focus the import button for easy confirmation
                        if (importBtn) {
                            importBtn.focus();
                            // Add visual highlight
                            importBtn.style.animation = 'pulse 1s ease-in-out';
                        }
                    }
                }, 200);
            }, 500); // Small delay to ensure page is fully loaded
            
            // Clean up URL without reload
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    },
    
    // Check if user has notes (determines modal content)
    checkForNotes() {
        const userNotes = JSON.parse(localStorage.getItem('userNotes') || '{}');
        this.hasNotes = Object.keys(userNotes).length > 0;
        return this.hasNotes;
    },
    
    // Attach all event handlers
    attachEventHandlers() {
        // Transfer toggle buttons
        this.toggleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.show();
            });
        });
        
        
        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
        
        // Prevent closing when clicking inside modal content
        if (this.modalInner) {
            this.modalInner.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.hide();
            }
        });
    },
    
    // Show modal with appropriate content
    show() {
        if (!this.modal) return;
        
        // Check for notes to determine content
        this.checkForNotes();
        
        // Set up modal content based on notes availability
        this.setupModalContent();
        
        // Show modal
        this.modal.classList.add('active');
        this.isOpen = true;
        
        // Focus first input if available
        const firstInput = this.modal.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    },
    
    // Hide modal
    hide() {
        if (!this.modal) return;
        
        this.modal.classList.remove('active');
        this.isOpen = false;
        
    },
    
    // Setup modal content based on whether user has notes
    setupModalContent() {
        if (!this.modalInner) return;
        
        if (this.hasNotes) {
            // Full transfer modal with both import and export
            this.setupFullTransferModal();
        } else {
            // Minimal import-only modal
            this.setupImportOnlyModal();
        }
    },
    
    // Setup full transfer modal (when user has notes)
    setupFullTransferModal() {
        this.modalInner.innerHTML = `
            <button class="transfer-close" aria-label="Close transfer">&times;</button>
            
            <div class="transfer-content">
                <div class="transfer-header">
                    <h3 class="transfer-title">Share notes between devices</h3>
                    <button class="info-icon" id="infoIconBtn">?</button>
                </div>
                
                <!-- Tooltip Overlay - Outside button for proper positioning -->
                <div class="custom-tooltip" id="customTooltip">
                    <div class="tooltip-content">
                        <button class="tooltip-close" id="tooltipClose">&times;</button>
                        <ul>
                            <li>Data is stored on your device</li>
                            <li>To share notes between devices click generate</li>
                            <li>This will save a copy of your notes on our servers</li>
                            <li>Data on our servers is encrypted</li>
                            <li>Only notes on the right margin are exported</li>
                            <li>Imported notes always go to the left margin</li>
                            <li>Importing will override existing left notes</li>
                        </ul>
                    </div>
                </div>

                <!-- Generate Code Button -->
                <button class="transfer-button" id="generateCodeBtn">
                    Generate Code
                </button>
                
                <!-- Generated Code Result -->
                <div class="transfer-result" id="exportResult" style="display: none;">
                    <div class="transfer-methods">
                        <div class="transfer-code-display">
                            <div class="code-display" id="transferCode"></div>
                            <button class="copy-code-btn" id="copyCodeBtn">Copy Code</button>
                        </div>
                        <div class="transfer-qr-section">
                            <div class="qr-code-container" id="qrCodeContainer">QR placeholder</div>
                            <p class="qr-label">Or scan QR code</p>
                        </div>
                    </div>
                    <p class="transfer-expiry" id="transferExpiry"></p>
                </div>

                <!-- Input Code Section -->
                <div class="transfer-input-section" id="inputSection">
                    <input type="text" id="importCode" class="transfer-code-input" 
                           placeholder="enter share code" maxlength="8" 
                           style="text-transform: uppercase">
                    <button class="transfer-button" id="importDataBtn">
                        Import Data
                    </button>
                </div>
                
                <!-- Custom Message Display -->
                <div class="transfer-message" id="transferMessage" style="display: none;"></div>

                <!-- Import Results -->
                <div class="transfer-result" id="importResult" style="display: none;">
                </div>

                <!-- Expiry Duration Selection -->
                <div class="expiry-selection">
                    <label for="expiryDuration" class="expiry-label">Transfer link active for:</label>
                    <select id="expiryDuration" class="expiry-dropdown">
                        <option value="2">2 hours</option>
                        <option value="12">12 hours</option>
                        <option value="24">24 hours</option>
                        <option value="72">3 days</option>
                        <option value="168">7 days</option>
                    </select>
                </div>

                <!-- Delete Local Data Section -->
                <div class="delete-section">
                    <button class="delete-button" id="deleteLocalDataBtn">
                        Delete Local Data
                    </button>
                </div>
            </div>
        `;

        this.attachModalEventHandlers();
    },

    // Setup minimal import-only modal (when user has no notes)
    setupImportOnlyModal() {
        this.modalInner.innerHTML = `
            <button class="transfer-close" aria-label="Close">&times;</button>
            
            <div class="transfer-content">
                <h3 class="transfer-title">Import Data</h3>
                
                <!-- Input Code Section -->
                <div class="transfer-input-section" id="inputSection">
                    <input type="text" id="importCode" class="transfer-code-input" 
                           placeholder="enter share code" maxlength="8" 
                           style="text-transform: uppercase">
                    <button class="transfer-button" id="importDataBtn">
                        Import Data
                    </button>
                </div>
                
                <!-- Custom Message Display -->
                <div class="transfer-message" id="transferMessage" style="display: none;"></div>
                
                <!-- Import Results -->
                <div class="transfer-result" id="importResult" style="display: none;">
                </div>

                <!-- Delete Local Data Section -->
                <div class="delete-section">
                    <button class="delete-button" id="deleteLocalDataBtn">
                        Delete Local Data
                    </button>
                </div>
            </div>
        `;
        
        this.attachModalEventHandlers();
    },
    
    // Attach event handlers after content is set up
    attachModalEventHandlers() {
        // Close button
        const closeBtn = this.modal.querySelector('.transfer-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hide();
            });
        }
        
        // Info icon and tooltip handlers
        const infoBtn = document.getElementById('infoIconBtn');
        const tooltip = document.getElementById('customTooltip');
        const tooltipClose = document.getElementById('tooltipClose');
        
        if (infoBtn && tooltip) {
            // Show tooltip on click
            infoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                tooltip.classList.add('active');
            });
            
            // Close tooltip on close button click
            if (tooltipClose) {
                tooltipClose.addEventListener('click', (e) => {
                    e.preventDefault();
                    tooltip.classList.remove('active');
                });
            }
            
            // Close tooltip on clicking outside
            tooltip.addEventListener('click', (e) => {
                if (e.target === tooltip) {
                    tooltip.classList.remove('active');
                }
            });
        }
        
        // Generate Code button (only in full modal)
        const generateBtn = document.getElementById('generateCodeBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleGenerateCode();
            });
        }
        
        // Import Data button
        const importBtn = document.getElementById('importDataBtn');
        if (importBtn) {
            importBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleImportData();
            });
        }
        
        // Copy Code button
        const copyBtn = document.getElementById('copyCodeBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.copyTransferCode();
            });
        }
        
        // Delete Local Data button
        const deleteBtn = document.getElementById('deleteLocalDataBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleDeleteAllData();
            });
        }
    },
    
    // Handle generate code button
    async handleGenerateCode() {
        const generateBtn = document.getElementById('generateCodeBtn');
        if (!generateBtn || !window.TransferSystem) return;

        // Get selected expiry duration (in hours)
        const expirySelect = document.getElementById('expiryDuration');
        const expiryHours = parseInt(expirySelect.value) || 2;

        // Show loading state
        const originalText = generateBtn.textContent;
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';

        try {
            const result = await window.TransferSystem.exportData(expiryHours);

            if (result.success) {
                // Show the code
                const transferCodeEl = document.getElementById('transferCode');
                if (transferCodeEl) {
                    transferCodeEl.textContent = result.code;
                }

                // Update expiry text dynamically
                const expiryEl = document.getElementById('transferExpiry');
                if (expiryEl) {
                    const expiryText = this.formatExpiryDuration(expiryHours);
                    expiryEl.textContent = `Active for ${expiryText}`;
                }
                
                // Generate QR code with URL containing the import code
                const qrContainer = document.getElementById('qrCodeContainer');
                
                if (qrContainer) {
                    if (typeof window.qrcode !== 'undefined') {
                        qrContainer.innerHTML = ''; // Clear placeholder text
                        
                        // Create URL with import parameter
                        const baseUrl = window.location.origin + window.location.pathname;
                        const importUrl = `${baseUrl}?import=${result.code}`;
                        
                        // Generate QR code using qrcode-generator
                        const typeNumber = 0; // 0 = auto detect
                        const errorCorrectionLevel = 'M';
                        const qr = qrcode(typeNumber, errorCorrectionLevel);
                        qr.addData(importUrl);
                        qr.make();
                        
                        // Create the QR code as an image
                        const size = 4; // module size in pixels
                        qrContainer.innerHTML = qr.createImgTag(size, 0);
                        
                    } else {
                        console.error('qrcode library not loaded');
                        qrContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">QR library not loaded</div>';
                    }
                }
                
                // Hide input section and show export result
                const inputSection = document.getElementById('inputSection');
                const exportResult = document.getElementById('exportResult');
                
                if (inputSection) inputSection.style.display = 'none';
                if (exportResult) exportResult.style.display = 'block';
            } else {
                this.showMessage('Failed to generate share code: ' + result.error, 'error');
            }
        } catch (error) {
            this.showMessage('Failed to generate share code. Please try again.', 'error');
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = originalText;
        }
    },
    
    // Handle import data button
    async handleImportData() {
        const importBtn = document.getElementById('importDataBtn');
        const importCodeInput = document.getElementById('importCode');
        
        if (!importBtn || !importCodeInput || !window.TransferSystem) return;
        
        const code = importCodeInput.value.trim().toUpperCase();
        if (!code || code.length !== 8) {
            this.showMessage('Please enter a valid 8-character share code', 'error');
            return;
        }
        
        // Show loading state
        const originalText = importBtn.textContent;
        importBtn.disabled = true;
        importBtn.textContent = 'Importing...';
        
        try {
            const result = await window.TransferSystem.importData(code);
            
            if (result.success) {
                // Check if there are existing left margin notes
                if (result.hasExistingLeftNotes) {
                    this.showImportWarning(result);
                } else {
                    this.completeImport(result, false);
                }
            } else {
                this.showMessage(result.error, 'error');
            }
        } catch (error) {
            this.showMessage('Import failed. Please check the code and try again.', 'error');
        } finally {
            importBtn.disabled = false;
            importBtn.textContent = originalText;
        }
    },
    
    // Show import warning for existing notes
    showImportWarning(importResult) {
        const inputSection = document.getElementById('inputSection');
        const importResultSection = document.getElementById('importResult');
        
        if (inputSection) inputSection.style.display = 'none';
        if (importResultSection) {
            importResultSection.style.display = 'block';
            importResultSection.innerHTML = `
                <div class="import-warning">
                    <h4>Existing Notes in Left Margin</h4>
                    <p>You have ${importResult.existingLeftNotesCount} notes in the left margin.</p>
                    <p>This import contains ${importResult.noteCount} notes.</p>
                    <p class="import-note"><strong>Move any personal notes to the RIGHT margin before importing.</strong></p>
                    <p>Importing will override all left margin notes.</p>
                    <div class="import-choices">
                        <button class="transfer-button" id="replaceNotesBtn">Override Left Notes</button>
                        <button class="transfer-button cancel" id="cancelImportBtn">Cancel</button>
                    </div>
                </div>
            `;
            
            // Add event handlers for choice buttons
            document.getElementById('replaceNotesBtn')?.addEventListener('click', () => {
                this.completeImport(importResult, true); // Always replace left notes
            });
            
            document.getElementById('cancelImportBtn')?.addEventListener('click', () => {
                this.hide();
            });
        }
    },
    
    // Complete the import process
    completeImport(importResult, replaceExisting) {
        if (!window.TransferSystem) return;
        
        // Call the TransferSystem's completeImport method
        const result = window.TransferSystem.completeImport(importResult.data, replaceExisting);
        
        if (result.success) {
            this.showImportSuccess(result.importedNoteCount);
        } else {
            this.showMessage('Failed to complete import: ' + result.error, 'error');
        }
    },
    
    // Show import success
    showImportSuccess(noteCount) {
        const importResultSection = document.getElementById('importResult');
        if (importResultSection) {
            importResultSection.style.display = 'block';
            importResultSection.innerHTML = `
                <div class="import-success">
                    <h4>Import Successful!</h4>
                    <p>Imported ${noteCount} notes and reading progress.</p>
                    <p class="refresh-note">Refreshing page...</p>
                </div>
            `;
        }
        
        // Auto-refresh after 2 seconds
        setTimeout(() => {
            location.reload();
        }, 2000);
    },
    
    // Copy transfer code to clipboard
    async copyTransferCode() {
        const codeElement = document.getElementById('transferCode');
        if (!codeElement) return;
        
        const code = codeElement.textContent;
        const copyBtn = document.getElementById('copyCodeBtn');
        
        try {
            await navigator.clipboard.writeText(code);
            if (copyBtn) {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 1500);
            }
        } catch (error) {
            this.showMessage('Failed to copy code', 'error');
        }
    },
    
    // Handle delete all data
    handleDeleteAllData() {
        // Show confirmation in modal instead of using confirm()
        const deleteSection = document.querySelector('.delete-section');
        if (!deleteSection) return;
        
        deleteSection.innerHTML = `
            <div class="delete-confirmation">
                <h4>Delete All Local Data?</h4>
                <p>This will permanently delete all your notes and reading progress.</p>
                <p><strong>This action cannot be undone.</strong></p>
                <div class="delete-choices">
                    <button class="transfer-button danger" id="confirmDeleteBtn">Yes, Delete Everything</button>
                    <button class="transfer-button" id="cancelDeleteBtn">Cancel</button>
                </div>
            </div>
        `;
        
        // Add event handlers for confirmation buttons
        document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
            this.performDelete();
        });
        
        document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => {
            // Restore the original delete button
            this.restoreDeleteButton();
        });
    },
    
    // Actually perform the delete
    performDelete() {
        if (!window.TransferSystem) return;
        
        const result = window.TransferSystem.deleteAllData();
        
        if (result.success) {
            // Also reset the TimeTracker if it exists
            if (window.timeTracker && typeof window.timeTracker.reset === 'function') {
                window.timeTracker.reset();
            }
            
            const deleteSection = document.querySelector('.delete-section');
            if (deleteSection) {
                deleteSection.innerHTML = `
                    <div class="delete-success">
                        <p>All local data has been deleted.</p>
                        <p>Refreshing page...</p>
                    </div>
                `;
            }
            setTimeout(() => {
                location.reload();
            }, 2000);
        } else {
            this.showMessage('Failed to delete data: ' + result.error, 'error');
            this.restoreDeleteButton();
        }
    },
    
    // Restore the original delete button
    restoreDeleteButton() {
        const deleteSection = document.querySelector('.delete-section');
        if (deleteSection) {
            deleteSection.innerHTML = `
                <button class="delete-button" id="deleteLocalDataBtn">
                    Delete Local Data
                </button>
            `;
            // Re-attach event handler
            document.getElementById('deleteLocalDataBtn')?.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleDeleteAllData();
            });
        }
    },

    // Format expiry duration for display
    formatExpiryDuration(hours) {
        if (hours < 24) {
            return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
        } else {
            const days = hours / 24;
            return `${days} ${days === 1 ? 'day' : 'days'}`;
        }
    },

    // Show message to user
    showMessage(message, type = 'info') {
        const messageEl = document.getElementById('transferMessage');
        if (!messageEl) return;
        
        messageEl.textContent = message;
        messageEl.className = `transfer-message ${type}`;
        messageEl.style.display = 'block';
        
        // Hide after 5 seconds unless it's an error
        if (type !== 'error') {
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        }
    },
    
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TransferModal.init());
} else {
    TransferModal.init();
}

// Export for external access
window.TransferModal = TransferModal;