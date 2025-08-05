// Energy Landscape Theory - Sleek Interactions

// State Management
const state = {
    currentSection: parseInt(localStorage.getItem('lastSection')) || 0,
    sectionStartTime: Date.now(),
    readingTimes: JSON.parse(localStorage.getItem('readingTimes')) || {},
    isMenuOpen: false,
    isHelpOpen: false,
    scrollPosition: 0,
    readingSpeed: 0
};

// DOM Elements
const elements = {
    header: document.querySelector('.site-header'),
    menuTrigger: document.querySelector('.menu-trigger'),
    helpTrigger: document.querySelector('.help-trigger'),
    plainTextToggle: document.querySelector('.plain-text-toggle'),
    fontDecrease: document.querySelector('.font-decrease'),
    fontIncrease: document.querySelector('.font-increase'),
    floatingFontControls: document.getElementById('floatingFontControls'),
    scrollIndicator: document.getElementById('scrollIndicator'),
    navMenu: document.getElementById('navMenu'),
    helpModal: document.getElementById('helpModal'),
    helpClose: document.querySelector('.help-close'),
    navLinks: document.querySelectorAll('.nav-link'),
    sections: document.querySelectorAll('.content-section'),
    fadeTop: document.querySelector('.fade-top'),
    fadeBottom: document.querySelector('.fade-bottom')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeHeader();
    initializeNavigation();
    initializeHelp();
    initializePlainTextToggle();
    initializeFontSizeControls();
    initializeScrollIndicator();
    initializeReadingTracking();
    initializeContentReveal();
    initializeSmoothScroll();
    loadMarkdownContent();
    loadGuideContent();
    
    // Restore reading position
    setTimeout(restoreLastPosition, 800);
});

// Header - Subtle scroll effect
function initializeHeader() {
    let lastScroll = 0;
    let ticking = false;
    
    function updateHeader() {
        const currentScroll = window.pageYOffset;
        
        // Add scrolled class for subtle border
        if (currentScroll > 50) {
            elements.header.classList.add('scrolled');
        } else {
            elements.header.classList.remove('scrolled');
        }
        
        // Update fade overlays opacity based on scroll
        updateFadeOverlays(currentScroll);
        
        lastScroll = currentScroll;
        ticking = false;
    }
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(updateHeader);
            ticking = true;
        }
    });
}

// Fade overlays - Very subtle
function updateFadeOverlays(scrollY) {
    if (document.body.classList.contains('plain-text-mode')) return;
    
    // Get hero bottom position
    const hero = document.querySelector('.hero');
    const heroBottom = hero ? hero.offsetTop + hero.offsetHeight : 0;
    
    // Only show top fade after scrolling past hero image
    if (scrollY > heroBottom) {
        const fadeProgress = Math.min(1, (scrollY - heroBottom) / 200);
        elements.fadeTop.style.opacity = fadeProgress * 0.8; // Max 80% opacity
    } else {
        elements.fadeTop.style.opacity = 0;
    }
    
    // Bottom fade is always visible but subtle
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const maxScroll = documentHeight - windowHeight;
    const scrollProgress = scrollY / maxScroll;
    
    // Reduce bottom fade near the end
    const bottomOpacity = scrollProgress > 0.9 ? (1 - scrollProgress) * 10 : 1;
    elements.fadeBottom.style.opacity = bottomOpacity;
}

// Make updateFadeOverlays globally available
window.updateFadeOverlays = updateFadeOverlays;

// Navigation
function initializeNavigation() {
    elements.menuTrigger.addEventListener('click', toggleMenu);
    
    // Close on outside click
    document.addEventListener('click', (e) => {
        if (state.isMenuOpen && 
            !elements.navMenu.contains(e.target) && 
            !elements.menuTrigger.contains(e.target)) {
            closeMenu();
        }
    });
    
    // Smooth scroll navigation
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                // Calculate position with offset for header
                const headerHeight = elements.header.offsetHeight;
                const targetPosition = targetSection.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                closeMenu();
            }
        });
    });
}

function toggleMenu() {
    state.isMenuOpen = !state.isMenuOpen;
    elements.navMenu.classList.toggle('active');
    updateReadingProgress();
}

function closeMenu() {
    state.isMenuOpen = false;
    elements.navMenu.classList.remove('active');
}

// Help modal
function initializeHelp() {
    elements.helpTrigger.addEventListener('click', toggleHelp);
    
    // Close when clicking outside the modal content
    document.addEventListener('click', (e) => {
        if (state.isHelpOpen && 
            !elements.helpModal.contains(e.target) && 
            !elements.helpTrigger.contains(e.target)) {
            closeHelp();
        }
    });
    
    // Prevent closing when clicking inside the modal
    const helpInner = document.querySelector('.help-modal-inner');
    if (helpInner) {
        helpInner.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
}

function toggleHelp() {
    state.isHelpOpen = !state.isHelpOpen;
    if (state.isHelpOpen) {
        elements.helpModal.classList.add('active');
        console.log('Help opened, current section should be:', state.currentSection);
        // Update guide progress and scroll to current section
        setTimeout(() => {
            updateGuideProgress();
            initializeGuideScrollTracking();
        }, 150); // Slightly longer delay for modal to appear
    } else {
        elements.helpModal.classList.remove('active');
    }
}

// Track scrolling within the guide to highlight visible sections
function initializeGuideScrollTracking() {
    const helpModalInner = document.querySelector('.help-modal-inner');
    if (!helpModalInner) return;
    
    const guideSections = document.querySelectorAll('.help-section');
    
    const guideObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                // Clear all current highlighting
                guideSections.forEach(section => {
                    section.classList.remove('guide-current');
                });
                
                // Highlight the section that's most visible in the guide
                entry.target.classList.add('guide-current');
            }
        });
    }, {
        root: helpModalInner,
        threshold: [0.5],
        rootMargin: '-10% 0px -10% 0px'
    });
    
    guideSections.forEach(section => {
        guideObserver.observe(section);
    });
}

function closeHelp() {
    state.isHelpOpen = false;
    elements.helpModal.classList.remove('active');
}

// Plain text toggle
function initializePlainTextToggle() {
    const savedPreference = localStorage.getItem('plainTextMode') === 'true';
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (savedPreference || prefersReducedMotion) {
        document.body.classList.add('plain-text-mode');
        
        // Force fade overlays to be hidden immediately
        if (elements.fadeTop && elements.fadeBottom) {
            elements.fadeTop.style.opacity = '0';
            elements.fadeBottom.style.opacity = '0';
        }
        
        // Ensure all content is visible
        setTimeout(() => {
            document.querySelectorAll('p, h1, h2, h3, h4, h5, h6').forEach(element => {
                element.classList.add('visible');
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            });
        }, 100);
    }
    
    elements.plainTextToggle.addEventListener('click', () => {
        const isPlainText = document.body.classList.toggle('plain-text-mode');
        localStorage.setItem('plainTextMode', isPlainText);
        
        // Handle fade overlays immediately
        if (isPlainText) {
            elements.fadeTop.style.opacity = '0';
            elements.fadeBottom.style.opacity = '0';
        } else {
            // Restore fade overlays when exiting plain text mode
            elements.fadeTop.style.opacity = '';
            elements.fadeBottom.style.opacity = '';
            // Trigger fade update immediately
            if (window.updateFadeOverlays) {
                window.updateFadeOverlays(window.pageYOffset);
            }
        }
    });
}

// Font Size Controls
function initializeFontSizeControls() {
    const sizes = ['xs', 'small', 'normal', 'large', 'xl', '2xl'];
    let currentSizeIndex = sizes.indexOf(localStorage.getItem('fontSize')) || 2; // Default to 'normal'
    applyFontSize(sizes[currentSizeIndex]);
    
    // Floating controls scroll behavior
    let hideTimeout;
    let lastScrollY = 0;
    
    function showFloatingControls() {
        if (window.scrollY > 200) { // Show after scrolling 200px
            elements.floatingFontControls.classList.add('visible');
            elements.floatingFontControls.classList.remove('auto-hide');
            
            // Auto-hide after 3 seconds of no scrolling
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                elements.floatingFontControls.classList.add('auto-hide');
            }, 3000);
        } else {
            elements.floatingFontControls.classList.remove('visible');
        }
        lastScrollY = window.scrollY;
    }
    
    // Show/hide on scroll
    window.addEventListener('scroll', showFloatingControls);
    
    // Font size button handlers
    elements.fontDecrease.addEventListener('click', () => {
        if (currentSizeIndex > 0) {
            currentSizeIndex--;
            applyFontSize(sizes[currentSizeIndex]);
            localStorage.setItem('fontSize', sizes[currentSizeIndex]);
        }
    });
    
    elements.fontIncrease.addEventListener('click', () => {
        if (currentSizeIndex < sizes.length - 1) {
            currentSizeIndex++;
            applyFontSize(sizes[currentSizeIndex]);
            localStorage.setItem('fontSize', sizes[currentSizeIndex]);
        }
    });
    
    // Keep visible on hover/interaction
    elements.floatingFontControls.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
        elements.floatingFontControls.classList.remove('auto-hide');
    });
}

function applyFontSize(size) {
    document.body.classList.remove('font-xs', 'font-small', 'font-large', 'font-xl', 'font-2xl');
    if (size !== 'normal') {
        document.body.classList.add(`font-${size}`);
    }
}

// Scroll Indicator
function initializeScrollIndicator() {
    let scrollTimeout;
    let isDragging = false;
    
    function updateScrollIndicator() {
        if (!document.body.classList.contains('plain-text-mode') || isDragging) return;
        
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        
        // Prevent division by zero
        if (docHeight <= 0) return;
        
        const scrollPercent = Math.max(0, Math.min(1, scrollTop / docHeight));
        
        // Position the indicator based on scroll percentage
        const viewportHeight = window.innerHeight;
        const indicatorHeight = 80; // Height from CSS
        const maxTop = viewportHeight - indicatorHeight - 40; // Leave some margin
        const minTop = 40;
        const topPosition = minTop + (scrollPercent * (maxTop - minTop));
        
        // Smooth transition for the position update
        elements.scrollIndicator.style.top = `${topPosition}px`;
        elements.scrollIndicator.classList.add('scrolling');
        
        // Remove scrolling class after scroll stops
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            elements.scrollIndicator.classList.remove('scrolling');
        }, 150);
    }
    
    // Drag functionality
    function handleDragStart(e) {
        if (!document.body.classList.contains('plain-text-mode')) return;
        
        e.preventDefault();
        isDragging = true;
        elements.scrollIndicator.classList.add('dragging');
        document.body.classList.add('dragging-scroll');
        
        const startY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
        const startScrollTop = window.pageYOffset;
        
        function handleDragMove(e) {
            e.preventDefault();
            
            const currentY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
            const deltaY = currentY - startY;
            
            // Calculate scroll position based on drag distance
            const viewportHeight = window.innerHeight;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollRatio = deltaY / (viewportHeight * 0.8); // Use 80% of viewport for drag range
            const newScrollTop = Math.max(0, Math.min(docHeight, startScrollTop + (scrollRatio * docHeight)));
            
            window.scrollTo(0, newScrollTop);
            
            // Manually update indicator position during drag
            const scrollPercent = newScrollTop / docHeight;
            const indicatorHeight = 80;
            const maxTop = viewportHeight - indicatorHeight - 40;
            const minTop = 40;
            const topPosition = minTop + (scrollPercent * (maxTop - minTop));
            elements.scrollIndicator.style.top = `${topPosition}px`;
        }
        
        function handleDragEnd() {
            isDragging = false;
            elements.scrollIndicator.classList.remove('dragging');
            document.body.classList.remove('dragging-scroll');
            
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
            document.removeEventListener('touchmove', handleDragMove);
            document.removeEventListener('touchend', handleDragEnd);
        }
        
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchmove', handleDragMove, { passive: false });
        document.addEventListener('touchend', handleDragEnd);
    }
    
    // Initialize position when plain text mode is toggled
    function initializeIndicatorPosition() {
        if (document.body.classList.contains('plain-text-mode')) {
            // Set initial position based on current scroll position
            const currentScrollTop = window.pageYOffset;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            
            if (docHeight > 0) {
                const scrollPercent = Math.max(0, Math.min(1, currentScrollTop / docHeight));
                const viewportHeight = window.innerHeight;
                const indicatorHeight = 80;
                const maxTop = viewportHeight - indicatorHeight - 40;
                const minTop = 40;
                const topPosition = minTop + (scrollPercent * (maxTop - minTop));
                
                // Set position immediately without transition
                elements.scrollIndicator.style.transition = 'none';
                elements.scrollIndicator.style.top = `${topPosition}px`;
                
                // Restore transition after a moment
                setTimeout(() => {
                    elements.scrollIndicator.style.transition = '';
                }, 50);
            }
        }
    }
    
    // Watch for plain text mode changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                initializeIndicatorPosition();
            }
        });
    });
    
    observer.observe(document.body, { attributes: true });
    
    // Event listeners
    elements.scrollIndicator.addEventListener('mousedown', handleDragStart);
    elements.scrollIndicator.addEventListener('touchstart', handleDragStart);
    window.addEventListener('scroll', updateScrollIndicator);
    
    // Initial setup
    initializeIndicatorPosition();
}

// Reading tracking with IntersectionObserver
function initializeReadingTracking() {
    const observerOptions = {
        threshold: [0.25, 0.5, 0.75],
        rootMargin: '-20% 0px -20% 0px'
    };
    
    let activeSection = null;
    
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const sectionIndex = parseInt(entry.target.dataset.section);
            console.log(`Section ${sectionIndex} intersection ratio:`, entry.intersectionRatio);
            
            if (entry.intersectionRatio > 0.25) {  // Lower threshold since sections aren't reaching 50%
                console.log(`Section ${sectionIndex} is now visible (>50%)`);
                
                if (activeSection !== sectionIndex) {
                    console.log(`Switching from section ${activeSection} to ${sectionIndex}`);
                    
                    // Save previous section time
                    if (activeSection !== null) {
                        const timeSpent = Date.now() - state.sectionStartTime;
                        state.readingTimes[activeSection] = 
                            (state.readingTimes[activeSection] || 0) + timeSpent;
                    }
                    
                    // Update current section
                    activeSection = sectionIndex;
                    state.currentSection = sectionIndex;
                    state.sectionStartTime = Date.now();
                    
                    console.log('New current section:', state.currentSection);
                    
                    // Save state
                    localStorage.setItem('lastSection', sectionIndex);
                    localStorage.setItem('readingTimes', JSON.stringify(state.readingTimes));
                    
                    // Update navigation and guide
                    updateReadingProgress();
                    updateGuideProgress();
                }
            }
        });
    }, observerOptions);
    
    console.log('Observing sections:', elements.sections.length);
    elements.sections.forEach((section, index) => {
        console.log(`Observing section ${index}:`, section.id, section.dataset.section);
        sectionObserver.observe(section);
    });
}

// Update reading progress in navigation
function updateReadingProgress() {
    elements.navLinks.forEach((link, index) => {
        const timeSpent = state.readingTimes[index] || 0;
        const level = getReadingLevel(timeSpent);
        link.setAttribute('data-reading-level', level);
    });
}

// Update guide progress highlighting
function updateGuideProgress() {
    const guideSections = document.querySelectorAll('.help-section');
    
    console.log('Current section:', state.currentSection); // Debug
    console.log('Total guide sections:', guideSections.length);
    
    guideSections.forEach((section, index) => {
        // Guide sections should match content sections exactly
        // Content sections: 0=intro, 1=energy-landscape, 2=fluctuations, etc.
        // Guide sections: 0=energy-landscape, 1=fluctuations, etc.
        const contentSectionIndex = index + 1; // Guide section 0 = content section 1
        
        // Remove all classes
        section.classList.remove('past', 'current', 'future');
        
        // Add appropriate class based on reading progress
        // Special handling for introduction (section 0) - mark first guide section as current
        if (state.currentSection === 0 && index === 0) {
            section.classList.add('current');
            console.log(`Guide section ${index} marked as current (intro mode)`);
        } else if (contentSectionIndex < state.currentSection) {
            section.classList.add('past');
            console.log(`Guide section ${index} (content ${contentSectionIndex}) marked as past`);
        } else if (contentSectionIndex === state.currentSection) {
            section.classList.add('current');
            console.log(`Guide section ${index} (content ${contentSectionIndex}) marked as current`);
        } else {
            section.classList.add('future');
            console.log(`Guide section ${index} (content ${contentSectionIndex}) marked as future`);
        }
    });
    
    // Center on current section when guide opens (instant, no animation)
    if (state.isHelpOpen) {
        setTimeout(() => {
            const currentSection = document.querySelector('.help-section.current');
            if (currentSection) {
                currentSection.scrollIntoView({ 
                    behavior: 'instant', 
                    block: 'center' 
                });
            } else {
                console.log('No current section found in guide');
            }
        }, 100); // Longer delay to ensure classes are applied
    }
}

// Calculate reading level (0-5)
function getReadingLevel(seconds) {
    if (seconds === 0) return 0;
    if (seconds < 15) return 1;
    if (seconds < 30) return 2;
    if (seconds < 60) return 3;
    if (seconds < 120) return 4;
    return 5; // 2+ minutes = deep moss green
}

// Content reveal on scroll
function initializeContentReveal() {
    const revealOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -10% 0px'
    };
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add visible class with slight delay for staggered effect
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, 50);
                
                // Stop observing once revealed
                revealObserver.unobserve(entry.target);
            }
        });
    }, revealOptions);
    
    // Observe all paragraphs and headings
    document.querySelectorAll('p, h2').forEach(element => {
        revealObserver.observe(element);
    });
}

// Smooth scroll behavior
function initializeSmoothScroll() {
    // Already handled in navigation, but add for any other anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        if (!anchor.classList.contains('nav-link')) {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const headerHeight = elements.header.offsetHeight;
                    const targetPosition = target.offsetTop - headerHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        }
    });
}

// Restore last reading position
function restoreLastPosition() {
    const lastSection = parseInt(localStorage.getItem('lastSection'));
    console.log('Restoring to last section:', lastSection);
    
    if (lastSection && lastSection > 0) {
        const targetSection = elements.sections[lastSection];
        console.log('Target section found:', targetSection?.id);
        
        if (targetSection) {
            const headerHeight = elements.header.offsetHeight;
            const targetPosition = targetSection.offsetTop - headerHeight - 20;
            
            console.log(`Scrolling to position: ${targetPosition} for section ${lastSection}`);
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
            
            // Update state to match restored position
            state.currentSection = lastSection;
            updateReadingProgress();
            updateGuideProgress();
        }
    } else {
        console.log('No last section to restore or starting from beginning');
    }
}

// Load markdown content
async function loadMarkdownContent() {
    try {
        console.log('Starting to load markdown content...');
        const response = await fetch('./content.md');
        if (!response.ok) throw new Error('Failed to load content');
        
        const markdown = await response.text();
        console.log('Markdown loaded, length:', markdown.length);
        const parts = markdown.split(/^## /m);
        const sections = parts.slice(1).filter(s => s.trim());
        
        console.log('Total markdown sections found:', sections.length);
        sections.forEach((section, index) => {
            const lines = section.split('\n');
            const title = lines[0].trim().toLowerCase().replace(/\s+/g, '-');
            const content = lines.slice(1).join('\n').trim();
            
            console.log(`Section ${index}: ${title}, content length: ${content.length}`);
            
            const sectionElement = document.getElementById(title);
            if (sectionElement) {
                console.log(`Found HTML element for: ${title}`);
                const contentDiv = sectionElement.querySelector('.section-content');
                if (contentDiv) {
                    // Convert markdown to HTML
                    let html;
                    if (typeof marked !== 'undefined' && marked.parse) {
                        html = marked.parse(content);
                    } else {
                        console.warn('Marked.js not available, using simple text conversion');
                        // Simple fallback - convert line breaks to paragraphs
                        html = content
                            .split('\n\n')
                            .filter(p => p.trim())
                            .map(p => `<p>${p.trim().replace(/\n/g, ' ')}</p>`)
                            .join('');
                    }
                    
                    contentDiv.innerHTML = html;
                    console.log(`Loaded content into ${title}`);
                    
                    // Observe new content for reveal effect
                    contentDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6').forEach(element => {
                        const revealObserver = new IntersectionObserver((entries) => {
                            entries.forEach(entry => {
                                if (entry.isIntersecting) {
                                    setTimeout(() => {
                                        entry.target.classList.add('visible');
                                    }, 50);
                                    revealObserver.unobserve(entry.target);
                                }
                            });
                        }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
                        
                        revealObserver.observe(element);
                    });
                } else {
                    console.error(`No .section-content found in ${title}`);
                }
            } else {
                console.error(`No HTML element found for section: ${title}`);
            }
        });
    } catch (error) {
        console.error('Error loading content:', error);
        console.log('Trying alternative loading method...');
        
        // Show a message to the user about serving locally
        console.warn('Content loading failed. If viewing locally, please serve through a web server (e.g., python -m http.server 8000) to load markdown content.');
        
        // Add a temporary message to sections
        document.querySelectorAll('.section-content').forEach(contentDiv => {
            if (!contentDiv.innerHTML.trim()) {
                contentDiv.innerHTML = '<p style="color: #666; font-style: italic;">Content will load when served through a web server. For local development, run: <code>python -m http.server 8000</code></p>';
            }
        });
    }
}

// Load help/guide content
async function loadGuideContent() {
    try {
        const response = await fetch('./guide.md');
        if (!response.ok) throw new Error('Failed to load guide');
        
        const markdown = await response.text();
        // Split by ## headings to create sections
        const sections = markdown.split(/^## /m).filter(s => s.trim());
        
        const helpSections = document.querySelector('.help-sections');
        if (helpSections) {
            // Create guide sections that match content sections
            const sectionNames = [
                'Energy Landscape', 'Fluctuations', 'Energy Limit', 'Planning',
                'Relationships', 'Emotions', 'Emotional Overload', 'Core Beliefs',
                'Triggers', 'Emergency Escape Routes', 'Protective Structures',
                'Erosion', 'Holding Patterns', 'False Erosion'
            ];
            
            let guideHTML = '';
            sections.forEach((section, index) => {
                const lines = section.split('\n');
                const title = lines[0].trim();
                const content = lines.slice(1).join('\n').trim();
                
                if (content) {
                    const html = marked.parse(`## ${title}\n${content}`);
                    guideHTML += `<div class="help-section">${html}</div>`;
                }
            });
            
            helpSections.innerHTML = guideHTML;
            updateGuideProgress();
        }
    } catch (error) {
        console.error('Error loading guide:', error);
    }
}

// Performance optimization - Debounce utility
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

// Add subtle parallax to hero image
window.addEventListener('scroll', debounce(() => {
    if (document.body.classList.contains('plain-text-mode')) return;
    
    const scrolled = window.pageYOffset;
    const heroImage = document.querySelector('.hero-image img');
    
    if (heroImage && scrolled < window.innerHeight) {
        const speed = 0.5;
        const yPos = -(scrolled * speed);
        heroImage.style.transform = `translateY(${yPos}px)`;
    }
}, 10));