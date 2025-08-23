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
        this.minFontScale = 0.7;
        this.maxFontScale = 1.5;
        
        this.isDragging = false;
        this.dragStartY = 0;
        this.scrollStartY = 0;
        this.scrollUpdateRequested = false;
        
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
        
        // Show scroll indicator immediately
        this.scrollIndicator.classList.add('visible');
        
        // Update scroll indicator on scroll - maximum speed with requestAnimationFrame
        let scrollTimeout;
        window.addEventListener('scroll', () => {
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
        }, { passive: true });
        
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
        
        const scrollPercent = Math.max(0, Math.min(1, scrollTop / docHeight));
        const viewportHeight = window.innerHeight;
        const indicatorHeight = 80;
        const margin = 10;
        const maxTop = viewportHeight - indicatorHeight - margin;
        const minTop = margin;
        const topPosition = minTop + (scrollPercent * (maxTop - minTop));
        
        // Immediate update with no transition
        this.scrollIndicator.style.top = `${topPosition}px`;
    }
    
    startDragging(e) {
        this.isDragging = true;
        this.dragStartY = e.clientY;
        this.scrollStartY = window.pageYOffset;
        this.scrollIndicator.classList.add('dragging');
        document.body.classList.add('dragging-scroll');
        e.preventDefault();
    }
    
    handleDragging(e) {
        if (!this.isDragging) return;
        
        const deltaY = e.clientY - this.dragStartY;
        const indicatorHeight = 80; // Height of the scroll indicator
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight - windowHeight;
        
        // Calculate the usable scroll area (window height minus indicator height and margins)
        const margin = 10;
        const scrollableArea = windowHeight - indicatorHeight - (2 * margin);
        
        // Convert mouse movement to scroll position
        const scrollDelta = (deltaY / scrollableArea) * documentHeight;
        const newScrollY = Math.max(0, Math.min(this.scrollStartY + scrollDelta, documentHeight));
        
        window.scrollTo(0, newScrollY);
    }
    
    stopDragging() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.scrollIndicator.classList.remove('dragging');
        document.body.classList.remove('dragging-scroll');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Navigation();
});