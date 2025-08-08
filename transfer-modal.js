// Transfer Modal System
// Basic dialog functionality for data transfer between devices

const TransferModal = {
    modal: null,
    modalInner: null,
    closeButton: null,
    toggleButtons: null,
    isOpen: false,
    
    // Initialize the transfer modal system
    init() {
        this.modal = document.getElementById('transferModal');
        this.modalInner = document.querySelector('.transfer-modal-inner');
        this.closeButton = document.querySelector('.transfer-close');
        this.toggleButtons = document.querySelectorAll('.transfer-toggle');
        
        if (!this.modal || !this.toggleButtons.length) {
            console.log('Transfer modal elements not found');
            return;
        }
        
        this.attachEventHandlers();
        console.log('Transfer modal initialized');
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
        
        // Close button
        if (this.closeButton) {
            this.closeButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.hide();
            });
        }
        
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
        
        // Generate Code button
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
    
    // Show the modal
    show() {
        if (!this.modal) return;
        
        this.isOpen = true;
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Reset modal to initial state
        this.resetModalState();
        
        console.log('Transfer modal opened');
    },
    
    // Hide the modal
    hide() {
        if (!this.modal) return;
        
        this.isOpen = false;
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
        
        console.log('Transfer modal closed');
    },
    
    // Reset modal to initial state
    resetModalState() {
        const transferContent = document.querySelector('.transfer-content');
        
        if (transferContent) {
            // Restore original modal content
            transferContent.innerHTML = `
                <h3 class="transfer-title">Transfer data between devices</h3>
                <p class="privacy-note" style="margin-top: 0; margin-bottom: 0;">Only right margin notes are transferred.</p>
                
                <!-- Generate Code Button -->
                <button class="transfer-button" id="generateCodeBtn" style="margin-top: 0;">
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
                            <div class="qr-code-container" id="qrCodeContainer"></div>
                            <p class="qr-label">Or scan QR code</p>
                        </div>
                    </div>
                    <p class="transfer-expiry">Active for 2 hours</p>
                </div>

                <!-- Input Code Section -->
                <div class="transfer-input-section" id="inputSection">
                    <input type="text" id="importCode" class="transfer-code-input" 
                           placeholder="enter transfer code" maxlength="8" 
                           style="text-transform: uppercase">
                    <button class="transfer-button" id="importDataBtn">
                        Import
                    </button>
                </div>
                
                <!-- Custom Message Display -->
                <div class="transfer-message" id="transferMessage" style="display: none;"></div>
                
                <!-- Import Results -->
                <div class="transfer-result" id="importResult" style="display: none;">
                    <div class="import-success" id="importSuccess" style="display: none;">
                        <h4>✅ Import Successful!</h4>
                        <p>Your data has been transferred successfully.</p>
                        <p class="refresh-note">Refresh the page to see your imported notes and progress.</p>
                    </div>
                    
                    <div class="notes-management" id="notesManagement" style="display: none;">
                        <h4>📝 Import Notes</h4>
                        <p>Imported notes will be added to the left side. Move them right to keep them in your main collection, or delete to remove them.</p>
                        <div class="notes-sides">
                            <div class="notes-left">
                                <h5>Imported Notes (Left)</h5>
                                <div id="importedNotesList"></div>
                            </div>
                            <div class="notes-right">
                                <h5>Keep These (Right)</h5>
                                <div id="keepNotesList"></div>
                            </div>
                        </div>
                        <div class="notes-actions">
                            <button class="transfer-button" id="finishNotesBtn">Finish</button>
                        </div>
                    </div>
                    
                    <div class="import-error" id="importError" style="display: none;">
                        <h4>❌ Import Failed</h4>
                        <p id="importErrorMessage"></p>
                    </div>
                </div>

                <!-- Privacy Note -->
                <p class="privacy-note">Data is encrypted and cannot be accessed by anyone without the code.</p>

                <!-- Delete Local Data Section -->
                <div class="delete-section">
                    <button class="delete-button" id="deleteLocalDataBtn">
                        Delete Local Data
                    </button>
                </div>
            `;
            
            // Reattach event handlers after content restoration
            this.attachEventHandlers();
        }
        
        console.log('Modal state reset');
    },
    
    // Handle generate code button
    async handleGenerateCode() {
        const generateBtn = document.getElementById('generateCodeBtn');
        if (!generateBtn || !window.TransferSystem) return;
        
        // Show loading state
        const originalText = generateBtn.textContent;
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        
        try {
            const result = await window.TransferSystem.exportData();
            
            if (result.success) {
                // Show the code
                const transferCodeEl = document.getElementById('transferCode');
                if (transferCodeEl) {
                    transferCodeEl.textContent = result.code;
                }
                
                // Hide input section and show export result
                const inputSection = document.getElementById('inputSection');
                const exportResult = document.getElementById('exportResult');
                
                if (inputSection) inputSection.style.display = 'none';
                if (exportResult) exportResult.style.display = 'block';
                
                console.log(`Generated transfer code: ${result.code} (${result.noteCount} notes)`);
            } else {
                this.showMessage('Failed to generate transfer code: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Generate code error:', error);
            this.showMessage('Failed to generate transfer code. Please try again.', 'error');
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
            this.showMessage('Please enter a valid 8-character transfer code', 'error');
            return;
        }
        
        // Show loading state
        const originalText = importBtn.textContent;
        importBtn.disabled = true;
        importBtn.textContent = 'Importing...';
        
        try {
            const result = await window.TransferSystem.importData(code);
            
            if (result.success) {
                // Check if there are existing imported notes
                if (result.hasExistingImports) {
                    this.showImportWarning(result);
                } else {
                    this.completeImport(result, false);
                }
            } else {
                this.showMessage(result.error, 'error');
            }
        } catch (error) {
            console.error('Import error:', error);
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
                    <h4>⚠️ Existing Imported Notes Found</h4>
                    <p>Notes will import on the left margin, replacing current notes on the left.</p>
                    <p><strong>Found:</strong> ${importResult.noteCount} notes to import</p>
                    <div class="import-choices">
                        <button class="transfer-button" id="replaceNotesBtn">Continue (Replace Left Notes)</button>
                        <button class="transfer-button cancel" id="cancelImportBtn">Cancel</button>
                    </div>
                </div>
            `;
            
            // Add event handlers for choice buttons
            document.getElementById('replaceNotesBtn')?.addEventListener('click', () => {
                this.completeImport(importResult, true); // Always replace
            });
            
            document.getElementById('cancelImportBtn')?.addEventListener('click', () => {
                this.resetModalState();
            });
        }
    },
    
    // Complete the import process
    completeImport(importResult, replace) {
        const result = window.TransferSystem.completeImport(importResult.data, replace);
        
        if (result.success) {
            const importResultSection = document.getElementById('importResult');
            if (importResultSection) {
                importResultSection.innerHTML = `
                    <div class="import-success">
                        <h4>✅ Import Successful!</h4>
                        <p>${result.importedNoteCount} notes imported to left margins.</p>
                        <p class="refresh-note">The page will refresh to show your imported data.</p>
                    </div>
                `;
            }
            
            // Refresh after a delay
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            this.showMessage('Import failed: ' + result.error, 'error');
        }
    },
    
    // Copy transfer code to clipboard
    copyTransferCode() {
        const transferCodeEl = document.getElementById('transferCode');
        const copyBtn = document.getElementById('copyCodeBtn');
        
        if (!transferCodeEl || !copyBtn) return;
        
        const code = transferCodeEl.textContent;
        if (!code) return;
        
        navigator.clipboard.writeText(code).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            this.showMessage('Failed to copy code to clipboard', 'error');
        });
    },
    
    // Show message in the modal
    showMessage(message, type = 'info') {
        const messageEl = document.getElementById('transferMessage');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `transfer-message ${type}`;
            messageEl.style.display = 'block';
        }
    },
    
    // Handle delete all data
    handleDeleteAllData() {
        this.showDeleteWarning();
    },
    
    // Show delete warning in modal
    showDeleteWarning() {
        const transferContent = document.querySelector('.transfer-content');
        
        if (transferContent) {
            transferContent.innerHTML = `
                <div class="delete-warning">
                    <h4>⚠️ Delete All Data</h4>
                    <p>This will permanently delete ALL your data including:</p>
                    <ul class="delete-list">
                        <li>All your notes and annotations (both right and left margins)</li>
                        <li>Reading progress and time tracking</li>
                        <li>All preferences and settings</li>
                        <li>All transfer codes</li>
                    </ul>
                    <p><strong>This action cannot be undone. Are you sure?</strong></p>
                    <div class="delete-choices">
                        <button class="transfer-button danger" id="confirmDeleteBtn">Yes, Delete Everything</button>
                        <button class="transfer-button cancel" id="cancelDeleteBtn">Cancel</button>
                    </div>
                </div>
            `;
            
            // Add event handlers
            document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
                this.showFinalDeleteConfirmation();
            });
            
            document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => {
                this.resetModalState();
            });
        }
    },
    
    // Show final delete confirmation
    showFinalDeleteConfirmation() {
        const transferContent = document.querySelector('.transfer-content');
        
        if (transferContent) {
            transferContent.innerHTML = `
                <div class="delete-warning final">
                    <h4>🚨 Final Confirmation</h4>
                    <p><strong>Are you absolutely sure?</strong></p>
                    <p>This will permanently delete everything and cannot be undone.</p>
                    <div class="delete-choices">
                        <button class="transfer-button danger" id="finalDeleteBtn">Delete Everything Now</button>
                        <button class="transfer-button" id="backToFirstWarning">Back</button>
                        <button class="transfer-button cancel" id="cancelFinalDeleteBtn">Cancel</button>
                    </div>
                </div>
            `;
            
            // Add event handlers
            document.getElementById('finalDeleteBtn')?.addEventListener('click', () => {
                this.executeDelete();
            });
            
            document.getElementById('backToFirstWarning')?.addEventListener('click', () => {
                this.showDeleteWarning();
            });
            
            document.getElementById('cancelFinalDeleteBtn')?.addEventListener('click', () => {
                this.resetModalState();
            });
        }
    },
    
    // Execute the actual deletion
    executeDelete() {
        try {
            // Define all keys to remove
            const keysToRemove = [
                'userNotes',           // Right margin notes
                'persistentImportedNotes', // Left margin (imported) notes
                'readingTimes',        // Reading progress
                'totalTimeOnSite',     // Time tracking
                'lastSection',         // Last read section
                'fontSize',            // Font preferences
                'plainTextMode',       // Display preferences
                'notesMode'           // Notes mode state
            ];
            
            // Remove all user data
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
            
            // Remove all transfer codes
            const transferKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('transfer_')) {
                    transferKeys.push(key);
                }
            }
            transferKeys.forEach(key => localStorage.removeItem(key));
            
            // Reset window state if it exists
            if (window.state) {
                window.state.notes = {};
                window.state.readingTimes = {};
                window.state.totalTimeOnSite = 0;
                window.state.currentSection = 0;
            }
            
            // Clear imported notes data
            if (window.importedNotesData) {
                window.importedNotesData = {};
            }
            
            console.log('All data deleted successfully');
            
            // Show success message in modal
            const transferContent = document.querySelector('.transfer-content');
            if (transferContent) {
                transferContent.innerHTML = `
                    <div class="delete-success">
                        <h4>✅ Data Deleted Successfully</h4>
                        <p>All your data has been permanently deleted.</p>
                        <p class="refresh-note">The page will reload in a moment...</p>
                    </div>
                `;
            }
            
            // Close modal and reload after delay
            setTimeout(() => {
                this.hide();
                window.location.reload();
            }, 2500);
            
        } catch (error) {
            console.error('Error deleting data:', error);
            
            // Show error in modal
            const transferContent = document.querySelector('.transfer-content');
            if (transferContent) {
                transferContent.innerHTML = `
                    <div class="delete-error">
                        <h4>❌ Delete Failed</h4>
                        <p>Failed to delete all data. Please try again.</p>
                        <div class="delete-choices">
                            <button class="transfer-button" id="retryDeleteBtn">Try Again</button>
                            <button class="transfer-button cancel" id="cancelAfterErrorBtn">Cancel</button>
                        </div>
                    </div>
                `;
                
                // Add event handlers for error state
                document.getElementById('retryDeleteBtn')?.addEventListener('click', () => {
                    this.showDeleteWarning();
                });
                
                document.getElementById('cancelAfterErrorBtn')?.addEventListener('click', () => {
                    this.resetModalState();
                });
            }
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TransferModal.init());
} else {
    TransferModal.init();
}

// Export for external access
window.TransferModal = TransferModal;