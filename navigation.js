// Navigation and accessibility functionality
class Navigation {
    constructor() {
        this.accessibilityPanel = document.getElementById('accessibilityPanel');
        this.accessibilityTrigger = document.querySelector('.accessibility-trigger');
        this.fontSizeButtons = {
            increase: document.querySelector('.font-increase'),
            decrease: document.querySelector('.font-decrease')
        };
        this.scrollIndicator = document.getElementById('scrollIndicator');
        
        this.currentFontScale = 1;
        this.fontScaleStep = 0.1;
        this.minFontScale = 0.5;
        this.maxFontScale = 1.5;
        
        this.isDragging = false;
        this.dragStartY = 0;
        this.scrollStartY = 0;
        this.scrollUpdateRequested = false;
        this.autoHideTimeout = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadFontScale();
        this.initScrollIndicator();
    }
    
    bindEvents() {
        // Accessibility panel toggle
        this.accessibilityTrigger?.addEventListener('click', () => {
            this.toggleAccessibilityPanel();
        });
        
        // Font size controls
        this.fontSizeButtons.increase?.addEventListener('click', () => {
            this.adjustFontSize(1);
        });
        
        this.fontSizeButtons.decrease?.addEventListener('click', () => {
            this.adjustFontSize(-1);
        });
        
        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.accessibilityPanel?.contains(e.target) && 
                !this.accessibilityTrigger?.contains(e.target)) {
                this.hideAccessibilityPanel();
            }
        });
        
        // Close panel on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAccessibilityPanel();
            }
        });
    }
    
    toggleAccessibilityPanel() {
        const isVisible = this.accessibilityPanel?.classList.contains('visible');
        if (isVisible) {
            this.hideAccessibilityPanel();
        } else {
            this.showAccessibilityPanel();
            
            // Show info modal on first visit
            const hasSeenAccessibilityInfo = localStorage.getItem('hasSeenAccessibilityInfo');
            if (!hasSeenAccessibilityInfo) {
                // Wait a moment for panel to show, then show info modal
                setTimeout(() => {
                    const infoButton = document.querySelector('.accessibility-info-toggle');
                    if (infoButton) {
                        infoButton.click();
                        localStorage.setItem('hasSeenAccessibilityInfo', 'true');
                    }
                }, 300);
            }
        }
    }
    
    showAccessibilityPanel() {
        this.accessibilityPanel?.classList.add('visible');
    }
    
    hideAccessibilityPanel() {
        this.accessibilityPanel?.classList.remove('visible');
    }
    
    adjustFontSize(direction) {
        const newScale = this.currentFontScale + (direction * this.fontScaleStep);
        
        // Clamp to min/max values
        if (newScale >= this.minFontScale && newScale <= this.maxFontScale) {
            this.currentFontScale = newScale;
            this.applyFontScale();
            this.saveFontScale();
        }
    }
    
    applyFontScale() {
        document.documentElement.style.setProperty('--font-scale', this.currentFontScale);
        
        // Apply to content elements
        const contentElements = document.querySelectorAll('.content h1, .content h2, .content p');
        contentElements.forEach(element => {
            const currentSize = parseFloat(getComputedStyle(element).fontSize);
            element.style.fontSize = `${currentSize * this.currentFontScale / (this.lastAppliedScale || 1)}px`;
        });
        
        this.lastAppliedScale = this.currentFontScale;
    }
    
    saveFontScale() {
        localStorage.setItem('fontScale', this.currentFontScale.toString());
    }
    
    loadFontScale() {
        const saved = localStorage.getItem('fontScale');
        if (saved) {
            this.currentFontScale = parseFloat(saved);
            this.applyFontScale();
        }
    }
    
    initScrollIndicator() {
        if (!this.scrollIndicator) return;
        
        // Update scroll indicator on scroll - maximum speed with requestAnimationFrame
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            // Show indicator when scrolling starts
            this.showScrollIndicator();
            
            if (!this.scrollUpdateRequested) {
                this.scrollUpdateRequested = true;
                // Add scrolling class to disable transitions
                this.scrollIndicator.classList.add('scrolling');
                
                requestAnimationFrame(() => {
                    this.updateScrollIndicator();
                    this.scrollUpdateRequested = false;
                });
                
                // Remove scrolling class after scroll ends
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    this.scrollIndicator.classList.remove('scrolling');
                }, 150);
            }
            
            // Auto-hide after scrolling stops
            clearTimeout(this.autoHideTimeout);
            this.autoHideTimeout = setTimeout(() => {
                this.hideScrollIndicator();
            }, 2000); // Hide after 2 seconds
        }, { passive: true });
        
        // Handle mouse enter/leave for auto-hide prevention
        this.scrollIndicator.addEventListener('mouseenter', () => {
            clearTimeout(this.autoHideTimeout);
            this.showScrollIndicator();
        });
        
        this.scrollIndicator.addEventListener('mouseleave', () => {
            if (!this.isDragging) {
                this.autoHideTimeout = setTimeout(() => {
                    this.hideScrollIndicator();
                }, 1000); // Shorter delay after mouse leave
            }
        });
        
        // Handle scroll indicator dragging - Mouse events
        this.scrollIndicator.addEventListener('mousedown', (e) => {
            this.startDragging(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.handleDragging(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            this.stopDragging();
        });
        
        // Handle scroll indicator dragging - Touch events
        this.scrollIndicator.addEventListener('touchstart', (e) => {
            this.startDragging(e.touches[0]);
            clearTimeout(this.autoHideTimeout);
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                this.handleDragging(e.touches[0]);
                e.preventDefault();
            }
        }, { passive: false });
        
        document.addEventListener('touchend', () => {
            this.stopDragging();
        });
    }
    
    updateScrollIndicator() {
        if (!this.scrollIndicator) return;
        
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        
        if (docHeight <= 0) return;
        
        // Calculate scroll percentage (0 to 1)
        const scrollPercent = Math.max(0, Math.min(1, scrollTop / docHeight));
        
        // Get available space for indicator movement
        const viewportHeight = window.innerHeight;
        const indicatorHeight = 80;
        const margin = 10;
        const availableHeight = viewportHeight - (2 * margin);
        const scrollableHeight = availableHeight - indicatorHeight;
        
        // Position indicator based on scroll percentage
        const topPosition = margin + (scrollPercent * scrollableHeight);
        
        // Immediate update with no transition
        this.scrollIndicator.style.top = `${topPosition}px`;
    }
    
    startDragging(e) {
        this.isDragging = true;
        this.dragStartY = e.clientY;
        this.scrollStartY = window.pageYOffset;
        this.scrollIndicator.classList.add('dragging');
        document.body.classList.add('dragging-scroll');
        
        // Temporarily disable smooth scrolling during drag
        document.documentElement.style.scrollBehavior = 'auto';
        
        clearTimeout(this.autoHideTimeout);
        e.preventDefault();
    }
    
    handleDragging(e) {
        if (!this.isDragging) return;
        
        const deltaY = e.clientY - this.dragStartY;
        const indicatorHeight = 80;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight - windowHeight;
        const margin = 10;
        
        // Use same calculation as updateScrollIndicator for consistency
        const availableHeight = windowHeight - (2 * margin);
        const scrollableHeight = availableHeight - indicatorHeight;
        
        // Convert mouse movement to scroll position
        const scrollDelta = (deltaY / scrollableHeight) * documentHeight;
        const newScrollY = Math.max(0, Math.min(this.scrollStartY + scrollDelta, documentHeight));
        
        window.scrollTo(0, newScrollY);
    }
    
    stopDragging() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.scrollIndicator.classList.remove('dragging');
        document.body.classList.remove('dragging-scroll');
        
        // Restore smooth scrolling
        document.documentElement.style.scrollBehavior = 'smooth';
        
        // Resume auto-hide timer after dragging
        clearTimeout(this.autoHideTimeout);
        this.autoHideTimeout = setTimeout(() => {
            this.hideScrollIndicator();
        }, 2000);
    }
    
    showScrollIndicator() {
        if (!this.scrollIndicator) return;
        this.scrollIndicator.classList.add('visible');
    }
    
    hideScrollIndicator() {
        if (!this.scrollIndicator || this.isDragging) return;
        this.scrollIndicator.classList.remove('visible');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Navigation();
});