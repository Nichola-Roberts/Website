// Navigation menu functionality
class NavigationMenu {
    constructor() {
        this.menu = document.getElementById('navMenu');
        this.menuTrigger = document.querySelector('.menu-trigger');
        this.closeButton = document.querySelector('.nav-close');
        this.backdrop = document.getElementById('modalBackdrop');
        this.navLinks = document.getElementById('navLinks');
        this.timeTracker = null;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        // Listen for content ready event
        document.addEventListener('contentReady', () => {
            this.populateMenu();
            this.initTimeTracker();
            this.initScrollTracking();
        });
    }
    
    bindEvents() {
        // Open menu
        this.menuTrigger?.addEventListener('click', () => {
            this.openMenu();
        });
        
        // Close menu
        this.closeButton?.addEventListener('click', () => {
            this.closeMenu();
        });
        
        // Close on backdrop click
        this.backdrop?.addEventListener('click', () => {
            this.closeMenu();
        });
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.closeMenu();
            }
        });
    }
    
    openMenu() {
        this.menu?.classList.add('open');
        this.backdrop?.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Highlight and scroll to current section
        this.highlightCurrentSection();
        this.scrollToCurrentSection();
    }
    
    closeMenu() {
        this.menu?.classList.remove('open');
        this.backdrop?.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    isOpen() {
        return this.menu?.classList.contains('open');
    }
    
    populateMenu() {
        if (!this.navLinks) return;
        
        const sections = document.querySelectorAll('.content-section');
        const navHTML = [];
        
        sections.forEach(section => {
            const sectionId = section.id;
            
            // Check for h1 in the section
            const h1 = section.querySelector('h1');
            if (h1) {
                navHTML.push(this.createNavLink(h1.textContent, sectionId, 'h1'));
                
                // Look for h2 elements in this section
                const h2Elements = section.querySelectorAll('h2');
                h2Elements.forEach((h2, index) => {
                    const h2Id = `${sectionId}-h2-${index}`;
                    h2.id = h2Id; // Add ID to h2 for navigation
                    navHTML.push(this.createNavLink(h2.textContent, h2Id, 'h2'));
                });
            } else {
                // Introduction section (no h1)
                const firstParagraph = section.querySelector('p');
                if (firstParagraph) {
                    const introText = 'Introduction';
                    navHTML.push(this.createNavLink(introText, sectionId, 'h1'));
                }
            }
        });
        
        this.navLinks.innerHTML = navHTML.join('');
        
        // Add click handlers to nav links
        this.navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('data-section');
                this.scrollToSection(targetId);
                this.closeMenu();
            });
        });
    }
    
    createNavLink(text, sectionId, type) {
        const className = type === 'h1' ? 'nav-link nav-h1' : 'nav-link nav-h2';
        return `<a href="#${sectionId}" class="${className}" data-section="${sectionId}" data-reading-level="0">
                    ${text}
                </a>`;
    }
    
    scrollToSection(sectionId) {
        const element = document.getElementById(sectionId);
        if (element) {
            // Calculate position to place element 1/3 down the viewport
            const elementRect = element.getBoundingClientRect();
            const elementTop = elementRect.top + window.pageYOffset;
            const viewportHeight = window.innerHeight;
            const targetPosition = elementTop - (viewportHeight / 3);
            
            // Add fade overlay for content in top 1/3 (only in focus mode)
            if (document.body.classList.contains('focus-mode')) {
                this.showNavigationFadeOverlay();
            }
            
            window.scrollTo({
                top: Math.max(0, targetPosition),
                behavior: 'smooth'
            });
        }
    }
    
    showNavigationFadeOverlay() {
        // Remove any existing overlay
        const existingOverlay = document.querySelector('.navigation-fade-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Create overlay element that covers top 1/3 of viewport
        const overlay = document.createElement('div');
        overlay.className = 'navigation-fade-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 33.33vh;
            background: linear-gradient(to bottom, 
                rgba(255, 255, 255, 0.95) 0%, 
                rgba(255, 255, 255, 0.8) 50%, 
                rgba(255, 255, 255, 0.4) 90%, 
                transparent 100%);
            z-index: 1000;
            pointer-events: none;
            opacity: 1;
            transition: opacity 2s ease-out;
        `;
        
        // Add to body
        document.body.appendChild(overlay);
        
        // Start fade out after scroll completes
        setTimeout(() => {
            overlay.style.opacity = '0';
            
            // Remove overlay after animation completes
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 2000);
        }, 800); // Delay to let scroll animation finish
    }
    
    highlightCurrentSection() {
        if (!this.navLinks) return;
        
        // Remove any existing current section highlights
        this.navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('current-section');
        });
        
        // Use the existing time tracker's current section (same as help modal)
        const timeTracker = window.timeTracker;
        const currentSectionId = timeTracker ? timeTracker.currentSection : null;
        
        if (currentSectionId) {
            // Find the H1 nav link for this section (not H2 subsections)
            const currentLink = this.navLinks.querySelector(`[data-section="${currentSectionId}"].nav-h1`);
            if (currentLink) {
                currentLink.classList.add('current-section');
            }
        }
    }
    
    initScrollTracking() {
        // Track scroll to update current section highlighting
        let scrollTimeout;
        
        window.addEventListener('scroll', () => {
            // Debounce scroll events for better performance
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.highlightCurrentSection();
            }, 50);
        });
        
        // Initial highlight
        this.highlightCurrentSection();
    }
    
    scrollToCurrentSection() {
        // Find the highlighted current section
        const currentLink = this.navLinks.querySelector('.current-section');
        if (currentLink) {
            // Scroll the navigation menu to show the current section
            currentLink.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }
    
    initTimeTracker() {
        // Initialize time tracker
        this.timeTracker = new window.TimeTracker();
        
        // Make time tracker globally accessible for help modal
        window.timeTracker = this.timeTracker;
        
        // Update all reading levels
        setTimeout(() => {
            this.timeTracker.updateAllSectionLevels();
        }, 100);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new NavigationMenu();
});