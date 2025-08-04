// State Management
const state = {
    currentSection: 0,
    sectionStartTime: Date.now(),
    readingTimes: JSON.parse(localStorage.getItem('readingTimes')) || {},
    isMenuOpen: false,
    isHelpOpen: false
};

// DOM Elements
const elements = {
    header: document.querySelector('.site-header'),
    menuTrigger: document.querySelector('.menu-trigger'),
    helpTrigger: document.querySelector('.help-trigger'),
    navMenu: document.getElementById('navMenu'),
    helpModal: document.getElementById('helpModal'),
    navClose: document.querySelector('.nav-close'),
    helpClose: document.querySelector('.help-close'),
    navLinks: document.querySelectorAll('.nav-link'),
    sections: document.querySelectorAll('.content-section'),
    paragraphs: document.querySelectorAll('p')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeHeader();
    initializeNavigation();
    initializeHelp();
    initializeReadingTracking();
    initializeParagraphEffects();
    initializeSmoothScroll();
    loadMarkdownContent();
});

// Header scroll effect
function initializeHeader() {
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 50) {
            elements.header.classList.add('scrolled');
        } else {
            elements.header.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });
}

// Navigation menu
function initializeNavigation() {
    elements.menuTrigger.addEventListener('click', toggleMenu);
    elements.navClose.addEventListener('click', closeMenu);
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (state.isMenuOpen && !elements.navMenu.contains(e.target) && !elements.menuTrigger.contains(e.target)) {
            closeMenu();
        }
    });
    
    // Smooth scroll for nav links
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
                closeMenu();
            }
        });
    });
}

function toggleMenu() {
    state.isMenuOpen = !state.isMenuOpen;
    elements.navMenu.classList.toggle('active');
    updateReadingTimeDisplay();
}

function closeMenu() {
    state.isMenuOpen = false;
    elements.navMenu.classList.remove('active');
}

// Help modal
function initializeHelp() {
    elements.helpTrigger.addEventListener('click', openHelp);
    elements.helpClose.addEventListener('click', closeHelp);
    
    elements.helpModal.addEventListener('click', (e) => {
        if (e.target === elements.helpModal) {
            closeHelp();
        }
    });
}

function openHelp() {
    state.isHelpOpen = true;
    elements.helpModal.classList.add('active');
    updateHelpSections();
}

function closeHelp() {
    state.isHelpOpen = false;
    elements.helpModal.classList.remove('active');
}

function updateHelpSections() {
    const helpSections = document.querySelectorAll('.help-section');
    const currentSection = getCurrentSection();
    
    helpSections.forEach((section, index) => {
        section.classList.remove('past', 'current', 'future');
        
        if (index < currentSection) {
            section.classList.add('past');
        } else if (index === currentSection) {
            section.classList.add('current');
            // Scroll to current section in modal
            setTimeout(() => {
                section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        } else {
            section.classList.add('future');
        }
    });
}

// Reading time tracking
function initializeReadingTracking() {
    window.addEventListener('scroll', trackReadingTime);
    window.addEventListener('beforeunload', saveReadingTime);
    
    // Initial update
    updateReadingTimeDisplay();
}

function getCurrentSection() {
    const scrollPosition = window.pageYOffset + window.innerHeight / 2;
    
    for (let i = elements.sections.length - 1; i >= 0; i--) {
        if (elements.sections[i].offsetTop <= scrollPosition) {
            return i;
        }
    }
    
    return 0;
}

function trackReadingTime() {
    const newSection = getCurrentSection();
    
    if (newSection !== state.currentSection) {
        // Update time for previous section
        updateSectionTime(state.currentSection);
        
        // Start timing new section
        state.currentSection = newSection;
        state.sectionStartTime = Date.now();
    }
}

function updateSectionTime(sectionIndex) {
    if (!state.readingTimes[sectionIndex]) {
        state.readingTimes[sectionIndex] = 0;
    }
    
    const timeSpent = (Date.now() - state.sectionStartTime) / 1000;
    state.readingTimes[sectionIndex] += timeSpent;
    
    localStorage.setItem('readingTimes', JSON.stringify(state.readingTimes));
}

function saveReadingTime() {
    updateSectionTime(state.currentSection);
}

function getReadingLevel(seconds) {
    if (!seconds || seconds === 0) return 0;
    if (seconds < 30) return 1;
    if (seconds < 60) return 2;
    if (seconds < 90) return 3;
    if (seconds < 120) return 4;
    return 5;
}

function updateReadingTimeDisplay() {
    elements.navLinks.forEach((link, index) => {
        const timeSpent = state.readingTimes[index] || 0;
        const level = getReadingLevel(timeSpent);
        const timeElement = link.querySelector('.nav-link-time');
        
        link.setAttribute('data-reading-level', level);
        
        if (timeSpent > 0) {
            const minutes = Math.floor(timeSpent / 60);
            const seconds = Math.floor(timeSpent % 60);
            timeElement.textContent = minutes > 0 ? `${minutes}m` : `${seconds}s`;
        }
    });
}

// Paragraph fade effects
function initializeParagraphEffects() {
    const observerOptions = {
        threshold: [0, 0.5, 1],
        rootMargin: '-10% 0px -10% 0px'
    };
    
    const paragraphObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.intersectionRatio > 0.5) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    elements.paragraphs.forEach(p => {
        paragraphObserver.observe(p);
    });
    
    // Make first paragraph visible immediately
    const firstParagraph = document.querySelector('.content p');
    if (firstParagraph) {
        setTimeout(() => {
            firstParagraph.classList.add('visible');
        }, 500);
    }
}

// Smooth scroll
function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Load markdown content
async function loadMarkdownContent() {
    try {
        // For development, use local path
        // const response = await fetch('./content.md');
        
        // For production, use GitHub raw URL
        const response = await fetch('https://raw.githubusercontent.com/Nichola-Roberts/Website/main/content.md');
        
        if (!response.ok) {
            throw new Error('Failed to load content');
        }
        
        const markdown = await response.text();
        const sections = markdown.split(/^## /m).filter(s => s.trim());
        
        sections.forEach(section => {
            const lines = section.split('\n');
            const title = lines[0].trim().toLowerCase().replace(/\s+/g, '-');
            const content = lines.slice(1).join('\n').trim();
            
            const sectionElement = document.getElementById(title);
            if (sectionElement) {
                const contentDiv = sectionElement.querySelector('.section-content');
                if (contentDiv) {
                    contentDiv.classList.add('loading');
                    
                    // Convert markdown to HTML
                    const html = marked.parse(content);
                    contentDiv.innerHTML = html;
                    contentDiv.classList.remove('loading');
                    
                    // Observe new paragraphs
                    const newParagraphs = contentDiv.querySelectorAll('p');
                    const observerOptions = {
                        threshold: [0, 0.5, 1],
                        rootMargin: '-10% 0px -10% 0px'
                    };
                    
                    const observer = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.intersectionRatio > 0.5) {
                                entry.target.classList.add('visible');
                            }
                        });
                    }, observerOptions);
                    
                    newParagraphs.forEach(p => observer.observe(p));
                }
            }
        });
    } catch (error) {
        console.error('Error loading content:', error);
        
        // Fallback content
        document.querySelectorAll('.section-content').forEach(el => {
            el.innerHTML = '<p>Content is being updated. Please check back soon.</p>';
        });
    }
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Performance optimization for scroll events
const debouncedTrackReading = debounce(trackReadingTime, 100);
window.addEventListener('scroll', debouncedTrackReading);