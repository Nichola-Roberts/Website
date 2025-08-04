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
    loadGuideContent();
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
        
        // Set reading level for text darkening (no time display)
        link.setAttribute('data-reading-level', level);
    });
}

// Paragraph and heading fade effects
function initializeParagraphEffects() {
    const observerOptions = {
        threshold: [0, 0.3, 1],
        rootMargin: '-15% 0px -15% 0px'
    };
    
    const contentObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.intersectionRatio > 0.3) {
                const element = entry.target;
                
                if (element.tagName === 'H2') {
                    // For headings, show them more quickly
                    const section = element.closest('.content-section');
                    const sectionId = section?.id;
                    
                    // Special case for energy-landscape - show immediately
                    if (sectionId === 'energy-landscape') {
                        setTimeout(() => {
                            element.classList.add('visible');
                        }, 300);
                    } else {
                        setTimeout(() => {
                            element.classList.add('visible');
                        }, 400);
                    }
                } else {
                    // For paragraphs, add a slight delay for dreamlike effect
                    setTimeout(() => {
                        element.classList.add('visible');
                    }, Math.random() * 200 + 200);
                }
            }
        });
    }, observerOptions);
    
    // Observe all paragraphs and headings
    elements.paragraphs.forEach(p => {
        contentObserver.observe(p);
    });
    
    document.querySelectorAll('.content-section h2').forEach(h => {
        contentObserver.observe(h);
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
        const response = await fetch('./content.md');
        
        if (!response.ok) {
            throw new Error('Failed to load content');
        }
        
        const markdown = await response.text();
        // Split by ## but keep the first part (intro) separate
        const parts = markdown.split(/^## /m);
        const introContent = parts[0].trim();
        const sections = parts.slice(1).filter(s => s.trim());
        
        // Handle introduction section specially
        if (introContent) {
            const introElement = document.getElementById('introduction');
            if (introElement) {
                const contentDiv = introElement.querySelector('.section-content');
                if (contentDiv) {
                    contentDiv.innerHTML = introContent.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '').join('');
                }
            }
        }
        
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
                    
                    // Observe new paragraphs and headings
                    const newParagraphs = contentDiv.querySelectorAll('p');
                    const newHeadings = contentDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
                    const observerOptions = {
                        threshold: [0, 0.3, 1],
                        rootMargin: '-15% 0px -15% 0px'
                    };
                    
                    const observer = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.intersectionRatio > 0.3) {
                                const element = entry.target;
                                
                                if (element.tagName.startsWith('H')) {
                                    setTimeout(() => {
                                        element.classList.add('visible');
                                    }, 200);
                                } else {
                                    setTimeout(() => {
                                        element.classList.add('visible');
                                    }, Math.random() * 100 + 50);
                                }
                            }
                        });
                    }, observerOptions);
                    
                    newParagraphs.forEach(p => observer.observe(p));
                    newHeadings.forEach(h => observer.observe(h));
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

// Load guide content
async function loadGuideContent() {
    try {
        const response = await fetch('./guide.md');
        
        if (!response.ok) {
            throw new Error('Failed to load guide');
        }
        
        const markdown = await response.text();
        // Skip the main title (# Quick Guide) and get only ## sections
        const sections = markdown.split(/^## /m).slice(1).filter(s => s.trim());
        
        // Clear existing help sections
        const helpSections = document.querySelector('.help-sections');
        if (helpSections) {
            helpSections.innerHTML = '';
        }
        
        sections.forEach((section, index) => {
            const lines = section.split('\n');
            const title = lines[0].trim();
            const content = lines.slice(1).join('\n').trim();
            
            // Create help section element
            const helpSection = document.createElement('div');
            helpSection.className = 'help-section';
            helpSection.setAttribute('data-section', index.toString());
            
            const heading = document.createElement('h3');
            heading.textContent = title;
            
            const paragraph = document.createElement('p');
            paragraph.textContent = content;
            
            helpSection.appendChild(heading);
            helpSection.appendChild(paragraph);
            
            if (helpSections) {
                helpSections.appendChild(helpSection);
            }
        });
        
    } catch (error) {
        console.error('Error loading guide:', error);
    }
}