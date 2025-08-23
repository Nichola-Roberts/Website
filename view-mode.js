// View Mode Management - Plain Text & Fade Effects
// Handles switching between default fade view and plain text mode

class ViewModeManager {
    constructor() {
        this.currentMode = this.getStoredMode() || 'fade'; // Default to fade mode
        this.elements = {
            body: document.body,
            fadeTop: null,
            fadeBottom: null,
            plainTextToggle: null,
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
        this.createPlainTextButton();
        this.bindEvents();
        this.applyMode(this.currentMode);
        
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
    
    createPlainTextButton() {
        // Find accessibility panel
        this.elements.accessibilityPanel = document.getElementById('accessibilityPanel');
        if (!this.elements.accessibilityPanel) return;
        
        // Find the accessibility panel content
        const panelContent = this.elements.accessibilityPanel.querySelector('.accessibility-panel-content');
        if (!panelContent) return;
        
        // Create plain text toggle button
        this.elements.plainTextToggle = document.createElement('button');
        this.elements.plainTextToggle.className = 'plain-text-toggle font-button';
        this.elements.plainTextToggle.setAttribute('aria-label', 'Plain text mode');
        this.elements.plainTextToggle.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none">
                <path d="M6 6h12M6 10h12M6 14h12M6 18h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        
        // Insert as first button in the panel
        panelContent.insertBefore(this.elements.plainTextToggle, panelContent.firstChild);
    }
    
    bindEvents() {
        if (this.elements.plainTextToggle) {
            this.elements.plainTextToggle.addEventListener('click', () => {
                this.toggleMode();
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
        // Don't show fades in plain text mode
        if (this.currentMode === 'plain-text' || !this.elements.fadeTop || !this.elements.fadeBottom) {
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
        const newMode = this.currentMode === 'fade' ? 'plain-text' : 'fade';
        this.setMode(newMode);
    }
    
    setMode(mode) {
        this.currentMode = mode;
        this.applyMode(mode);
        this.storeMode(mode);
    }
    
    applyMode(mode) {
        if (mode === 'plain-text') {
            // Enable plain text mode
            this.elements.body.classList.add('plain-text-mode');
            
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
            
            // Update button state
            if (this.elements.plainTextToggle) {
                this.elements.plainTextToggle.classList.add('active');
            }
            
        } else {
            // Enable fade mode (default)
            this.elements.body.classList.remove('plain-text-mode');
            
            // Restore fade overlays
            if (this.elements.fadeTop && this.elements.fadeBottom) {
                this.elements.fadeTop.style.opacity = '';
                this.elements.fadeBottom.style.opacity = '';
                // Trigger fade update immediately
                this.updateFadeOverlays();
            }
            
            // Update button state
            if (this.elements.plainTextToggle) {
                this.elements.plainTextToggle.classList.remove('active');
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
            // Auto-switch to plain text mode for accessibility
            this.setMode('plain-text');
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
    
    isPlainTextMode() {
        return this.currentMode === 'plain-text';
    }
    
    isFadeMode() {
        return this.currentMode === 'fade';
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