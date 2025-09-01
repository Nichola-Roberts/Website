// Time tracking functionality
class TimeTracker {
    constructor() {
        this.sectionTimes = {}; // Store time spent on each section
        this.currentSection = null;
        this.lastUpdateTime = Date.now();
        this.totalTime = 0;
        this.updateInterval = null;
        
        // Time thresholds
        this.H1_MAX_TIME = 120000; // 2 minutes in milliseconds
        this.H2_MAX_TIME = 30000; // 30 seconds in milliseconds
        
        this.init();
    }
    
    init() {
        this.loadSavedData();
        this.startTracking();
        this.setupIntersectionObserver();
    }
    
    loadSavedData() {
        const saved = localStorage.getItem('sectionTimes');
        if (saved) {
            this.sectionTimes = JSON.parse(saved);
        }
        
        const savedTotal = localStorage.getItem('totalTime');
        if (savedTotal) {
            this.totalTime = parseInt(savedTotal);
        }
    }
    
    saveData() {
        localStorage.setItem('sectionTimes', JSON.stringify(this.sectionTimes));
        localStorage.setItem('totalTime', this.totalTime.toString());
    }
    
    startTracking() {
        // Update every 100ms for smooth transitions
        this.updateInterval = setInterval(() => {
            this.updateCurrentSectionTime();
        }, 100);
    }
    
    updateCurrentSectionTime() {
        if (!this.currentSection) return;
        
        const now = Date.now();
        const elapsed = now - this.lastUpdateTime;
        this.lastUpdateTime = now;
        
        // Update section time
        if (!this.sectionTimes[this.currentSection]) {
            this.sectionTimes[this.currentSection] = 0;
        }
        this.sectionTimes[this.currentSection] += elapsed;
        
        // Update total time
        this.totalTime += elapsed;
        
        // Update UI
        this.updateSectionReadingLevel(this.currentSection);
        
        // Update help sections if available
        if (window.updateHelpSections && typeof window.updateHelpSections === 'function') {
            window.updateHelpSections();
        }
        
        // Save periodically
        if (this.totalTime % 1000 < 100) {
            this.saveData();
        }
    }
    
    setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '-40% 0px -40% 0px', // Section is "active" when in middle 20% of viewport
            threshold: 0
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.setCurrentSection(entry.target.id);
                }
            });
        }, options);
        
        // Observe all sections and H2 headings after content is loaded
        const waitForSections = () => {
            const sections = document.querySelectorAll('.content-section');
            const h2Elements = document.querySelectorAll('.content h2[id]');
            
            if (sections.length > 0) {
                // Observe H1 sections
                sections.forEach(section => {
                    observer.observe(section);
                });
                
                // Also observe H2 elements that have IDs (from navigation)
                h2Elements.forEach(h2 => {
                    observer.observe(h2);
                });
            } else {
                // Keep checking until sections are available
                setTimeout(waitForSections, 100);
            }
        };
        waitForSections();
    }
    
    setCurrentSection(sectionId) {
        if (this.currentSection !== sectionId) {
            this.currentSection = sectionId;
            this.lastUpdateTime = Date.now();
        }
    }
    
    getSectionTime(sectionId) {
        return this.sectionTimes[sectionId] || 0;
    }
    
    getSectionReadingLevel(sectionId, isH1 = true) {
        const time = this.getSectionTime(sectionId);
        const seconds = time / 1000;
        
        // For h1 sections
        if (isH1) {
            if (seconds === 0) return 0;
            if (seconds < 15) return 1;
            if (seconds < 30) return 2;
            if (seconds < 60) return 3;
            if (seconds < 120) return 4;
            return 'complete'; // 2+ minutes = green
        }
        
        // For h2 sections - turn green after 30 seconds
        if (seconds >= 30) {
            return 'complete'; // Green after 30 seconds
        }
        
        // Show progressive levels before 30 seconds
        if (seconds === 0) return 0;
        if (seconds < 10) return 1;
        if (seconds < 20) return 2;
        if (seconds < 30) return 3;
        
        return 0;
    }
    
    updateSectionReadingLevel(sectionId) {
        // Update navigation link if it exists
        const navLink = document.querySelector(`[data-section="${sectionId}"]`);
        if (navLink) {
            const isH1 = navLink.classList.contains('nav-h1');
            const level = this.getSectionReadingLevel(sectionId, isH1);
            navLink.setAttribute('data-reading-level', level);
        }
    }
    
    updateAllSectionLevels() {
        document.querySelectorAll('.nav-link').forEach(link => {
            const sectionId = link.getAttribute('data-section');
            if (sectionId) {
                const isH1 = link.classList.contains('nav-h1');
                const level = this.getSectionReadingLevel(sectionId, isH1);
                link.setAttribute('data-reading-level', level);
            }
        });
    }
    
    getTotalTime() {
        return this.totalTime;
    }
    
    reset() {
        this.sectionTimes = {};
        this.totalTime = 0;
        this.saveData();
        this.updateAllSectionLevels();
    }
    
    // Method to get time spent on a specific section
    getSectionTime(sectionId) {
        return this.sectionTimes[sectionId] || 0;
    }
    
    // Debug method to show all time data
    showTimeData() {
        return this.sectionTimes;
    }
}

// Export for use in other modules
window.TimeTracker = TimeTracker;

// Initialize time tracker when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.timeTracker = new TimeTracker();
});