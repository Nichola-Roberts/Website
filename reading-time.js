// Reading Time Estimator - Shows estimated reading time for current section
// Only displays in fade mode, hidden in focus mode

class ReadingTimeManager {
    constructor() {
        this.averageReadingSpeed = 225; // words per minute
        this.currentSection = null;
        this.elements = {
            bottomTimeDisplay: null,
            timeSpan: null
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
        this.createBottomTimeDisplay();
        this.bindEvents();
        this.startTracking();
    }
    
    createBottomTimeDisplay() {
        // Create reading time display (default to disabled)
        
        // Create bottom reading time display
        this.elements.bottomTimeDisplay = document.createElement('div');
        this.elements.bottomTimeDisplay.className = 'bottom-reading-time';
        this.elements.bottomTimeDisplay.id = 'bottomReadingTime';
        this.elements.bottomTimeDisplay.style.display = 'none'; // Default to hidden
        
        // Create time span
        this.elements.timeSpan = document.createElement('span');
        this.elements.timeSpan.id = 'timeRemaining';
        this.elements.timeSpan.textContent = 'calculating...';
        
        // Create close button (appears on hover)
        const closeButton = document.createElement('button');
        closeButton.className = 'reading-time-close';
        closeButton.innerHTML = '×';
        closeButton.setAttribute('aria-label', 'Hide reading time');
        closeButton.setAttribute('title', 'Hide reading time');
        closeButton.addEventListener('click', () => this.disable());
        
        this.elements.bottomTimeDisplay.appendChild(this.elements.timeSpan);
        this.elements.bottomTimeDisplay.appendChild(closeButton);
        document.body.appendChild(this.elements.bottomTimeDisplay);
    }
    
    
    bindEvents() {
        // Update on scroll with throttling
        let scrollTimeout;
        const scrollUpdateDelay = 100;
        
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => this.updateReadingTime(), scrollUpdateDelay);
        });
        
        // Also update on touch events for mobile
        window.addEventListener('touchmove', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => this.updateReadingTime(), scrollUpdateDelay);
        }, { passive: true });
        
        // Update when view mode changes
        document.addEventListener('viewModeChanged', () => {
            this.handleViewModeChange();
        });
    }
    
    startTracking() {
        // Wait for content to be loaded dynamically
        this.waitForContent();

        // Update regularly until content loads
        const initialInterval = setInterval(() => {
            this.updateReadingTime();
            // Stop checking after content loads or 10 seconds
            const h2Elements = document.querySelectorAll('.content h2[id]');
            if (h2Elements.length > 0 && this.elements.timeSpan && this.elements.timeSpan.textContent !== 'calculating...') {
                clearInterval(initialInterval);
            }
        }, 500);

        // Safety clear after 10 seconds
        setTimeout(() => clearInterval(initialInterval), 10000);
    }
    
    waitForContent() {
        // Check if h2 sections exist yet
        const h2Elements = document.querySelectorAll('.content h2[id]');
        if (h2Elements.length === 0) {
            // Content not loaded yet, check again soon
            setTimeout(() => this.waitForContent(), 200);
            return;
        }

        // Content is loaded, start tracking
        this.updateReadingTime();
    }
    
    updateReadingTime() {
        if (!this.elements.timeSpan) return;
        
        // Find current section based on h1 elements
        const currentSection = this.findCurrentSection();
        if (!currentSection) {
            this.elements.timeSpan.textContent = 'calculating...';
            return;
        }
        
        // Calculate reading time for current section
        const readingTime = this.calculateSectionReadingTime(currentSection);
        this.elements.timeSpan.textContent = readingTime;
    }
    
    findCurrentSection() {
        // Get all h2 sections (with IDs from navigation)
        const h2Elements = document.querySelectorAll('.content h2[id]');
        if (h2Elements.length === 0) return null;

        const viewportTop = window.pageYOffset;
        const viewportMiddle = viewportTop + (window.innerHeight / 2);

        let currentH2 = null;

        // Find which h2 section we're currently in
        for (let i = h2Elements.length - 1; i >= 0; i--) {
            const h2 = h2Elements[i];
            const rect = h2.getBoundingClientRect();
            const h2Top = rect.top + viewportTop;

            if (h2Top <= viewportMiddle) {
                currentH2 = h2;
                break;
            }
        }

        // If no h2 is above middle, use the first one
        if (!currentH2 && h2Elements.length > 0) {
            currentH2 = h2Elements[0];
        }

        return currentH2;
    }
    
    calculateSectionReadingTime(h2Element) {
        if (!h2Element) return 'Complete';

        // Find all paragraphs between this h2 and the next h2
        const paragraphs = [];
        let currentElement = h2Element.nextElementSibling;

        while (currentElement) {
            // Stop when we hit the next h2
            if (currentElement.tagName === 'H2') {
                break;
            }
            // Collect paragraphs
            if (currentElement.tagName === 'P') {
                paragraphs.push(currentElement);
            }
            currentElement = currentElement.nextElementSibling;
        }

        if (paragraphs.length === 0) return 'Complete';

        let totalWords = 0;
        let wordsAboveViewport = 0;

        const viewportTop = window.pageYOffset;
        const windowBottom = viewportTop + window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        // Check if we're at the bottom of the entire document
        const isAtBottom = windowBottom >= documentHeight - 50; // 50px buffer

        paragraphs.forEach(p => {
            const words = this.countWords(p.textContent);
            totalWords += words;

            // Check if paragraph is above current viewport (already read)
            const pRect = p.getBoundingClientRect();

            if (pRect.bottom < 0) {
                // Paragraph is completely above viewport - fully read
                wordsAboveViewport += words;
            } else if (pRect.top < 0 && pRect.bottom > 0) {
                // Paragraph is partially above viewport - partially read
                const visibleHeight = pRect.bottom;
                const totalHeight = pRect.height;
                const readPercent = Math.max(0, Math.min(1, (totalHeight - visibleHeight) / totalHeight));
                wordsAboveViewport += Math.floor(words * readPercent);
            }
        });

        const remainingWords = Math.max(0, totalWords - wordsAboveViewport);
        const remainingMinutes = Math.ceil(remainingWords / this.averageReadingSpeed);

        if (totalWords === 0) {
            return 'calculating...';
        }

        // Only show complete if at bottom of entire document
        if (isAtBottom) {
            return 'Complete';
        } else if (remainingMinutes <= 1) {
            return 'Estimated time left in section ~ 1 min';
        } else {
            return `Estimated time left in section ~ ${remainingMinutes} min`;
        }
    }
    
    countWords(text) {
        if (!text) return 0;
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }
    
    handleViewModeChange() {
        // Reading time display is now independent of view mode
        // Users can toggle reading time on/off regardless of focus/fade mode
    }
    
    // Public API
    updateCurrentSection(section) {
        this.currentSection = section;
        this.updateReadingTime();
    }
    
    show() {
        if (this.elements.bottomTimeDisplay) {
            this.elements.bottomTimeDisplay.style.display = 'block';
        }
    }
    
    hide() {
        if (this.elements.bottomTimeDisplay) {
            this.elements.bottomTimeDisplay.style.display = 'none';
        }
    }
    
    disable() {
        // Hide the display for this page load only
        if (this.elements.bottomTimeDisplay) {
            this.elements.bottomTimeDisplay.style.display = 'none';
        }
        
        // No message needed - users can re-enable via toggle button
        
        // Dispatch event in case other components need to know
        document.dispatchEvent(new CustomEvent('readingTimeDisabled'));
    }
    
    
    enable() {
        // Show the display
        if (this.elements.bottomTimeDisplay) {
            this.elements.bottomTimeDisplay.style.display = 'block';
        }
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('readingTimeEnabled'));
    }
}

// Initialize reading time manager
let readingTimeManager;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        readingTimeManager = new ReadingTimeManager();
        
        // Make it globally available
        window.readingTimeManager = readingTimeManager;
    });
} else {
    readingTimeManager = new ReadingTimeManager();
    window.readingTimeManager = readingTimeManager;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReadingTimeManager;
}