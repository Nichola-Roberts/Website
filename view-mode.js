// View Mode Management - Focus & Fade Effects
// Handles switching between default focus view and fade mode

class ViewModeManager {
    constructor() {
        this.currentMode = this.getStoredMode() || 'fade'; // Default to fade mode
        this.elements = {
            body: document.body,
            fadeTop: null,
            fadeBottom: null,
            focusToggle: null,
            readingTimeToggle: null,
            accessibilityPanel: null
        };
        
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
        this.createFadeElements();
        this.createFocusButton();
        this.createReadingTimeButton();
        this.bindEvents();
        this.applyMode(this.currentMode);
        this.initializeReadingTime();
        
        // Check for reduced motion preference
        this.handleReducedMotion();
    }
    
    createFadeElements() {
        // Create top fade overlay
        this.elements.fadeTop = document.createElement('div');
        this.elements.fadeTop.className = 'fade-top';
        document.body.appendChild(this.elements.fadeTop);
        
        // Create bottom fade overlay
        this.elements.fadeBottom = document.createElement('div');
        this.elements.fadeBottom.className = 'fade-bottom';
        document.body.appendChild(this.elements.fadeBottom);
        
        // Initialize fade overlay updates on scroll
        this.initializeFadeUpdates();
    }
    
    createFocusButton() {
        // Find accessibility panel
        this.elements.accessibilityPanel = document.getElementById('accessibilityPanel');
        if (!this.elements.accessibilityPanel) return;
        
        // Find the accessibility panel content
        const panelContent = this.elements.accessibilityPanel.querySelector('.accessibility-panel-content');
        if (!panelContent) return;
        
        // Create focus toggle button
        this.elements.focusToggle = document.createElement('button');
        this.elements.focusToggle.className = 'focus-toggle font-button';
        this.elements.focusToggle.setAttribute('aria-label', 'Focus mode');
        this.elements.focusToggle.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none">
                <ellipse cx="12" cy="12" rx="9" ry="6" stroke="currentColor" stroke-width="1"/>
                <line x1="12" y1="2" x2="12" y2="8" stroke="currentColor" stroke-width="1.5"/>
                <line x1="12" y1="16" x2="12" y2="22" stroke="currentColor" stroke-width="1.5"/>
                <line x1="2" y1="12" x2="8" y2="12" stroke="currentColor" stroke-width="1.5"/>
                <line x1="16" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="1.5"/>
                <circle cx="12" cy="12" r="1" fill="currentColor"/>
            </svg>
        `;
        
        // Insert as second button (after the info button)
        const infoButton = panelContent.querySelector('.accessibility-info-toggle');
        if (infoButton) {
            panelContent.insertBefore(this.elements.focusToggle, infoButton.nextSibling);
        } else {
            panelContent.insertBefore(this.elements.focusToggle, panelContent.firstChild);
        }
    }
    
    createReadingTimeButton() {
        // Find accessibility panel
        this.elements.accessibilityPanel = document.getElementById('accessibilityPanel');
        if (!this.elements.accessibilityPanel) return;
        
        // Find the accessibility panel content
        const panelContent = this.elements.accessibilityPanel.querySelector('.accessibility-panel-content');
        if (!panelContent) return;
        
        // Create reading time toggle button
        this.elements.readingTimeToggle = document.createElement('button');
        this.elements.readingTimeToggle.className = 'reading-time-toggle font-button';
        this.elements.readingTimeToggle.setAttribute('aria-label', 'Toggle reading time display');
        this.elements.readingTimeToggle.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke-width="2"/>
                <polyline points="12,6 12,12 16,14" stroke-width="2"/>
            </svg>
        `;
        
        // Insert after the font size buttons
        const fontIncreaseButton = panelContent.querySelector('.font-increase');
        if (fontIncreaseButton) {
            panelContent.insertBefore(this.elements.readingTimeToggle, fontIncreaseButton.nextSibling);
        } else {
            panelContent.appendChild(this.elements.readingTimeToggle);
        }
    }
    
    bindEvents() {
        if (this.elements.focusToggle) {
            this.elements.focusToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMode();
                // Force visual update on mobile
                this.forceButtonRefresh(this.elements.focusToggle);
            });
            
            // Better mobile touch handling
            this.elements.focusToggle.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleMode();
                this.forceButtonRefresh(this.elements.focusToggle);
            });
        }
        
        if (this.elements.readingTimeToggle) {
            this.elements.readingTimeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleReadingTime();
                // Force visual update on mobile
                this.forceButtonRefresh(this.elements.readingTimeToggle);
            });
            
            // Better mobile touch handling
            this.elements.readingTimeToggle.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleReadingTime();
                this.forceButtonRefresh(this.elements.readingTimeToggle);
            });
        }
        
        // Listen for scroll events to update fade overlays
        window.addEventListener('scroll', () => this.updateFadeOverlays());
        
        // Listen for window resize to recalculate fade positions
        window.addEventListener('resize', () => this.updateFadeOverlays());
    }
    
    initializeFadeUpdates() {
        let ticking = false;
        
        const updateFades = () => {
            this.updateFadeOverlays();
            ticking = false;
        };
        
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(updateFades);
                ticking = true;
            }
        });
    }
    
    updateFadeOverlays() {
        // Don't show fades in focus mode
        if (this.currentMode === 'focus' || !this.elements.fadeTop || !this.elements.fadeBottom) {
            return;
        }
        
        const scrollY = window.pageYOffset;
        
        // Get hero bottom position
        const hero = document.querySelector('.hero');
        const heroBottom = hero ? hero.offsetTop + hero.offsetHeight : 0;
        
        // Only show top fade after scrolling past hero image
        if (scrollY > heroBottom) {
            const fadeProgress = Math.min(1, (scrollY - heroBottom) / 200);
            this.elements.fadeTop.style.opacity = fadeProgress;
        } else {
            this.elements.fadeTop.style.opacity = 0;
        }
        
        // Bottom fade management
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const maxScroll = documentHeight - windowHeight;
        const scrollProgress = scrollY / maxScroll;
        
        // Reduce bottom fade near the end
        const bottomOpacity = scrollProgress > 0.9 ? (1 - scrollProgress) * 10 : 1;
        this.elements.fadeBottom.style.opacity = Math.max(0, bottomOpacity);
    }
    
    toggleMode() {
        const newMode = this.currentMode === 'focus' ? 'fade' : 'focus';
        this.setMode(newMode);
    }
    
    setMode(mode) {
        this.currentMode = mode;
        this.applyMode(mode);
        this.storeMode(mode);
    }
    
    applyMode(mode) {
        if (mode === 'focus') {
            // Enable focus mode (default) - no fades, all content visible
            this.elements.body.classList.add('focus-mode');
            
            // Hide fade overlays immediately
            if (this.elements.fadeTop && this.elements.fadeBottom) {
                this.elements.fadeTop.style.opacity = '0';
                this.elements.fadeBottom.style.opacity = '0';
            }
            
            // Ensure all content is visible
            setTimeout(() => {
                document.querySelectorAll('p, h1, h2, h3, h4, h5, h6').forEach(element => {
                    element.classList.add('visible');
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                });
            }, 100);
            
            // Update button state - button should NOT be active in default focus mode
            if (this.elements.focusToggle) {
                this.elements.focusToggle.classList.remove('active');
            }
            
        } else {
            // Enable fade mode (toggled state)
            this.elements.body.classList.remove('focus-mode');
            
            // Restore fade overlays
            if (this.elements.fadeTop && this.elements.fadeBottom) {
                this.elements.fadeTop.style.opacity = '';
                this.elements.fadeBottom.style.opacity = '';
                // Trigger fade update immediately
                this.updateFadeOverlays();
            }
            
            // Update button state - button IS active when fade mode is on
            if (this.elements.focusToggle) {
                this.elements.focusToggle.classList.add('active');
            }
        }
        
        // Dispatch event for other components to listen to
        document.dispatchEvent(new CustomEvent('viewModeChanged', {
            detail: { mode: mode }
        }));
    }
    
    handleReducedMotion() {
        // Check for prefers-reduced-motion
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (prefersReducedMotion && this.currentMode === 'fade') {
            // Auto-switch to focus mode for accessibility
            this.setMode('focus');
        }
    }
    
    getStoredMode() {
        return localStorage.getItem('viewMode');
    }
    
    storeMode(mode) {
        localStorage.setItem('viewMode', mode);
    }
    
    // Public API
    getCurrentMode() {
        return this.currentMode;
    }
    
    isFocusMode() {
        return this.currentMode === 'focus';
    }
    
    isFadeMode() {
        return this.currentMode === 'fade';
    }
    
    initializeReadingTime() {
        // Wait for reading time manager to be ready
        setTimeout(() => {
            // Check if reading time was previously enabled (default to false)
            const isEnabled = localStorage.getItem('readingTimeEnabled') === 'true';
            
            if (window.readingTimeManager) {
                if (isEnabled) {
                    window.readingTimeManager.enable();
                    if (this.elements.readingTimeToggle) {
                        this.elements.readingTimeToggle.classList.add('active');
                    }
                } else {
                    // Default to disabled
                    window.readingTimeManager.disable();
                    if (this.elements.readingTimeToggle) {
                        this.elements.readingTimeToggle.classList.remove('active');
                    }
                    localStorage.setItem('readingTimeEnabled', 'false');
                }
            }
        }, 100);
    }
    
    toggleReadingTime() {
        // Check if reading time is currently enabled
        const readingTimeDisplay = document.querySelector('.bottom-reading-time');
        const isEnabled = readingTimeDisplay && readingTimeDisplay.style.display !== 'none';
        
        if (window.readingTimeManager) {
            if (isEnabled) {
                // Disable reading time
                window.readingTimeManager.disable();
                this.elements.readingTimeToggle.classList.remove('active');
                localStorage.setItem('readingTimeEnabled', 'false');
            } else {
                // Enable reading time
                window.readingTimeManager.enable();
                this.elements.readingTimeToggle.classList.add('active');
                localStorage.setItem('readingTimeEnabled', 'true');
            }
        }
    }
    
    forceButtonRefresh(button) {
        // Force a reflow to ensure visual updates on mobile
        if (button) {
            button.style.transform = 'scale(0.98)';
            setTimeout(() => {
                button.style.transform = '';
            }, 150);
        }
    }
}

// Initialize view mode manager
let viewModeManager;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        viewModeManager = new ViewModeManager();
        
        // Make it globally available
        window.viewModeManager = viewModeManager;
    });
} else {
    viewModeManager = new ViewModeManager();
    window.viewModeManager = viewModeManager;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ViewModeManager;
}