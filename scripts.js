// Energy Landscape Theory - Sleek Interactions

// State Management
const state = {
    currentSection: parseInt(localStorage.getItem('lastSection')) || 0,
    sectionStartTime: Date.now(),
    readingTimes: JSON.parse(localStorage.getItem('readingTimes')) || {},
    isMenuOpen: false,
    isHelpOpen: false,
    isAccessibilityOpen: false,
    scrollPosition: 0,
    readingSpeed: 0,
    sectionWordCounts: {}, // Store word counts for each section
    averageReadingSpeed: 225, // words per minute
    totalTimeOnSite: parseInt(localStorage.getItem('totalTimeOnSite')) || 0,
    siteStartTime: Date.now(),
};

// Make state globally available for notes system
window.state = state;

// DOM Elements
const elements = {
    header: document.querySelector('.site-header'),
    menuTrigger: document.querySelector('.menu-trigger'),
    helpTrigger: document.querySelector('.help-trigger'),
    accessibilityTrigger: document.querySelector('.accessibility-trigger'),
    accessibilityPanel: document.getElementById('accessibilityPanel'),
    plainTextToggle: document.querySelector('.plain-text-toggle'),
    fontDecrease: document.querySelector('.font-decrease'),
    fontIncrease: document.querySelector('.font-increase'),
    scrollIndicator: document.getElementById('scrollIndicator'),
    navMenu: document.getElementById('navMenu'),
    navClose: document.querySelector('.nav-close'),
    helpModal: document.getElementById('helpModal'),
    modalBackdrop: document.getElementById('modalBackdrop'),
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
    initializeAccessibilityPanel();
    initializeHelp();
    initializePlainTextToggle();
    initializeFontSizeControls();
    initializeScrollIndicator();
    initializeReadingTracking();
    initializeContentReveal();
    initializeSmoothScroll();
    initializeReadingTimeEstimator();
    initializeTitleClick();
    initializeTotalTimeTracking();
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
        elements.fadeTop.style.opacity = fadeProgress; // Full opacity
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
    
    // Add close button listener
    if (elements.navClose) {
        elements.navClose.addEventListener('click', closeMenu);
    }
    
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

// Accessibility Panel
function initializeAccessibilityPanel() {
    elements.accessibilityTrigger.addEventListener('click', toggleAccessibilityPanel);
    
    // Close on outside click
    document.addEventListener('click', (e) => {
        if (state.isAccessibilityOpen && 
            !elements.accessibilityPanel.contains(e.target) && 
            !elements.accessibilityTrigger.contains(e.target)) {
            closeAccessibilityPanel();
        }
    });
}

function toggleAccessibilityPanel() {
    state.isAccessibilityOpen = !state.isAccessibilityOpen;
    elements.accessibilityPanel.classList.toggle('visible');
}

function closeAccessibilityPanel() {
    state.isAccessibilityOpen = false;
    elements.accessibilityPanel.classList.remove('visible');
}

// Help modal
function initializeHelp() {
    elements.helpTrigger.addEventListener('click', toggleHelp);
    
    // Close when clicking backdrop or outside the modal content
    elements.modalBackdrop.addEventListener('click', closeHelp);
    
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
        elements.modalBackdrop.classList.add('active');
        
        // Scroll to current section in help modal
        setTimeout(() => {
            scrollToCurrentHelpSection();
        }, 100);
    } else {
        elements.helpModal.classList.remove('active');
        elements.modalBackdrop.classList.remove('active');
    }
}

// Scroll to current section in help modal
function scrollToCurrentHelpSection() {
    const currentSection = state.currentSection || 0;
    const currentHelpSection = document.querySelector(`[data-section-index="${currentSection}"]`);
    
    if (currentHelpSection) {
        // Center the current section in the help modal
        const helpModalInner = document.querySelector('.help-modal-inner');
        if (helpModalInner) {
            const sectionTop = currentHelpSection.offsetTop;
            const modalHeight = helpModalInner.clientHeight;
            const sectionHeight = currentHelpSection.offsetHeight;
            
            // Center the section in the modal
            const scrollTop = sectionTop - (modalHeight / 2) + (sectionHeight / 2);
            helpModalInner.scrollTop = Math.max(0, scrollTop);
        }
    }
}

function closeHelp() {
    state.isHelpOpen = false;
    elements.helpModal.classList.remove('active');
    elements.modalBackdrop.classList.remove('active');
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
    
    // Attach plain text toggle to ALL plain text buttons
    document.querySelectorAll('.plain-text-toggle').forEach(button => {
        button.addEventListener('click', () => {
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
    });
}

// Font Size Controls
function initializeFontSizeControls() {
    const sizes = ['xs', 'small', 'normal', 'large', 'xl', '2xl'];
    let currentSizeIndex = sizes.indexOf(localStorage.getItem('fontSize')) || 2; // Default to 'normal'
    applyFontSize(sizes[currentSizeIndex]);
    
    
    // Font size button handlers - attach to ALL buttons
    document.querySelectorAll('.font-decrease').forEach(button => {
        button.addEventListener('click', () => {
            if (currentSizeIndex > 0) {
                currentSizeIndex--;
                applyFontSize(sizes[currentSizeIndex]);
                localStorage.setItem('fontSize', sizes[currentSizeIndex]);
            }
        });
    });
    
    document.querySelectorAll('.font-increase').forEach(button => {
        button.addEventListener('click', () => {
            if (currentSizeIndex < sizes.length - 1) {
                currentSizeIndex++;
                applyFontSize(sizes[currentSizeIndex]);
                localStorage.setItem('fontSize', sizes[currentSizeIndex]);
            }
        });
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
        
        // Prevent division by zero and ensure we have valid content height
        if (docHeight <= 0) {
            // If content isn't ready yet, position at top
            elements.scrollIndicator.style.top = '40px';
            return;
        }
        
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
            // Wait for layout to be ready
            setTimeout(() => {
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
                    elements.scrollIndicator.style.transform = 'translateY(-50%) scaleY(1)';
                    
                    // Restore transition after a moment
                    setTimeout(() => {
                        elements.scrollIndicator.style.transition = '';
                    }, 100);
                } else {
                    // Fallback for when content isn't loaded yet
                    elements.scrollIndicator.style.top = '50%';
                }
            }, 150); // Longer delay to ensure content is loaded
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
            
            if (entry.intersectionRatio > 0.25) {  // Lower threshold since sections aren't reaching 50%
                
                if (activeSection !== sectionIndex) {
                    
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
                    
                    
                    // Save state
                    localStorage.setItem('lastSection', sectionIndex);
                    localStorage.setItem('readingTimes', JSON.stringify(state.readingTimes));
                    
                    // Update navigation
                    updateReadingProgress();
                }
            }
        });
    }, observerOptions);
    
    elements.sections.forEach((section, index) => {
        sectionObserver.observe(section);
    });
}

// Update reading progress in navigation
function updateReadingProgress() {
    let allSectionsRead = true;
    
    elements.navLinks.forEach((link) => {
        const sectionIndex = parseInt(link.dataset.section);
        const timeSpent = state.readingTimes[sectionIndex] || 0;
        const level = getReadingLevel(timeSpent);
        link.setAttribute('data-reading-level', level);
        
        // Check if this section has been read (2+ minutes = 120000ms)
        if (timeSpent < 120000) {
            allSectionsRead = false;
        }
        
    });
    
    // Update help sections with progressive disclosure
    updateHelpSections();
    
}


// Calculate reading level (0-5)
function getReadingLevel(milliseconds) {
    const seconds = milliseconds / 1000;
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
    
    if (lastSection && lastSection > 0) {
        const targetSection = elements.sections[lastSection];
        
        if (targetSection) {
            const headerHeight = elements.header.offsetHeight;
            const targetPosition = targetSection.offsetTop - headerHeight - 20;
            
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
            
            // Update state to match restored position
            state.currentSection = lastSection;
            updateReadingProgress();
        }
    } else {
    }
}

// Load markdown content with preloading and loading states
async function loadMarkdownContent() {
    // Add loading states to sections
    const contentSections = document.querySelectorAll('.section-content');
    contentSections.forEach(section => {
        if (!section.innerHTML.trim()) {
            section.innerHTML = '<div class="loading-placeholder" aria-label="Loading content..."></div>';
            section.classList.add('loading');
        }
    });

    try {
        
        // Try to use preloaded content first
        let response;
        try {
            response = await fetch('./content.md', { 
                cache: 'force-cache' // Use cached version if available
            });
        } catch (cacheError) {
            // Fallback to regular fetch
            response = await fetch('./content.md');
        }
        
        if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to load content`);
        
        const markdown = await response.text();
        
        // Remove loading states
        contentSections.forEach(section => {
            section.classList.remove('loading');
        });
        
        const parts = markdown.split(/^## /m);
        const sections = parts.slice(1).filter(s => s.trim());
        
        sections.forEach((section, index) => {
            const lines = section.split('\n');
            const rawTitle = lines[0].trim();
            const title = rawTitle.toLowerCase().replace(/\s+/g, '-');
            const content = lines.slice(1).join('\n').trim();
            
            
            // Skip easter egg sections
            if (rawTitle.includes('_____') || title === '' || title.includes('-----')) {
                return;
            }
            
            const sectionElement = document.getElementById(title);
            if (sectionElement) {
                const contentDiv = sectionElement.querySelector('.section-content');
                if (contentDiv) {
                    // Clear loading placeholder
                    contentDiv.innerHTML = '';
                    
                    // Convert markdown to HTML
                    let html;
                    if (typeof marked !== 'undefined' && marked.parse) {
                        html = marked.parse(content);
                    } else {
                        // Enhanced fallback - convert line breaks to paragraphs
                        html = content
                            .split('\n\n')
                            .filter(p => p.trim())
                            .map(p => `<p>${p.trim().replace(/\n/g, ' ')}</p>`)
                            .join('');
                    }
                    
                    contentDiv.innerHTML = html;
                    
                    // Notify notes system that new content is loaded
                    if (window.NotesSystem && window.NotesSystem.refreshParagraphs) {
                        window.NotesSystem.refreshParagraphs();
                    }
                    
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
        
        // Trigger scroll indicator position update after content loads
        if (document.body.classList.contains('plain-text-mode')) {
            setTimeout(() => {
                const event = new Event('scroll');
                window.dispatchEvent(event);
            }, 200);
        }
        
        // Update reading time estimates after content loads
        setTimeout(updateBottomReadingTime, 300);
        
    } catch (error) {
        console.error('Error loading content:', error);
        
        // Remove loading states and show error message
        contentSections.forEach(contentDiv => {
            contentDiv.classList.remove('loading');
            if (!contentDiv.innerHTML.trim() || contentDiv.innerHTML.includes('loading-placeholder')) {
                contentDiv.innerHTML = `
                    <div class="content-error">
                        <p><strong>Content temporarily unavailable</strong></p>
                        <p>If viewing locally, serve through a web server:</p>
                        <code>python -m http.server 8000</code>
                        <p>Or use any local server to enable content loading.</p>
                    </div>
                `;
            }
        });
        
    }
}

// Load help/guide content with progressive disclosure
async function loadGuideContent() {
    try {
        const response = await fetch('./guide.md');
        if (!response.ok) throw new Error('Failed to load guide');
        
        const markdown = await response.text();
        // Split by ## headings to create sections
        const sections = markdown.split(/^## /m).filter(s => s.trim());
        
        const helpSections = document.querySelector('.help-sections');
        if (helpSections) {
            // Store all sections for progressive disclosure
            window.allHelpSections = sections;
            updateHelpSections();
        }
    } catch (error) {
        console.error('Error loading guide:', error);
    }
}

// Update help sections based on reading progress
function updateHelpSections() {
    const helpSections = document.querySelector('.help-sections');
    if (!helpSections || !window.allHelpSections) return;
    
    const currentSection = state.currentSection || 0;
    let guideHTML = '';
    
    window.allHelpSections.forEach((section, index) => {
        const lines = section.split('\n');
        const title = lines[0].trim();
        const content = lines.slice(1).join('\n').trim();
        
        if (!content) return;
        
        // Always show Introduction (index 0)
        // Always show current section
        // Show sections where user has spent 1+ minutes (60000ms)
        const sectionReadingTime = state.readingTimes[index] || 0;
        const hasSpentEnoughTime = sectionReadingTime >= 60000; // 1 minute
        const isIntroduction = index === 0;
        const isCurrentSection = index === currentSection;
        
        if (isIntroduction || isCurrentSection || hasSpentEnoughTime) {
            const html = marked.parse(`## ${title}\n${content}`);
            guideHTML += `<div class="help-section" data-section-index="${index}">${html}</div>`;
        } else {
            // Show a locked/mystery placeholder for unread sections
            guideHTML += `<div class="help-section locked" data-section-index="${index}">
                <h2>${title}</h2>
            </div>`;
        }
    });
    
    helpSections.innerHTML = guideHTML;
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

// Simple Bottom Reading Time Estimator
function initializeReadingTimeEstimator() {
    // Initial update
    updateBottomReadingTime();
    
    // Update regularly until content loads
    const initialInterval = setInterval(() => {
        updateBottomReadingTime();
        // Stop checking after content loads or 10 seconds
        const timeSpan = document.getElementById('timeRemaining');
        if (timeSpan && timeSpan.textContent !== 'calculating...' || Date.now() - state.sectionStartTime > 10000) {
            clearInterval(initialInterval);
        }
    }, 500);
    
    // Update on scroll with faster mobile response
    let scrollTimeout;
    const scrollUpdateDelay = 100; // Reduced from 150ms for better mobile response
    
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateBottomReadingTime, scrollUpdateDelay);
    });
    
    // Also update on touch events for better mobile experience
    window.addEventListener('touchmove', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(updateBottomReadingTime, scrollUpdateDelay);
    }, { passive: true });
}

// Count words in a text element
function countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}


// Simple bottom reading time update
function updateBottomReadingTime() {
    const timeSpan = document.getElementById('timeRemaining');
    if (!timeSpan) return;
    
    // Find which section is currently most visible
    const allSections = document.querySelectorAll('.content-section');
    let mostVisibleSection = null;
    let maxVisibility = 0;
    
    const viewportTop = window.pageYOffset;
    const viewportHeight = window.innerHeight;
    const viewportBottom = viewportTop + viewportHeight;
    
    allSections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const sectionTop = rect.top + viewportTop;
        const sectionBottom = sectionTop + rect.height;
        
        // Calculate how much of this section is visible
        const visibleTop = Math.max(sectionTop, viewportTop);
        const visibleBottom = Math.min(sectionBottom, viewportBottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const visibility = visibleHeight / rect.height;
        
        if (visibility > maxVisibility) {
            maxVisibility = visibility;
            mostVisibleSection = section;
        }
    });
    
    if (!mostVisibleSection) {
        timeSpan.textContent = 'calculating...';
        return;
    }
    
    const sectionIndex = parseInt(mostVisibleSection.dataset.section);
    
    // Update the current section if it changed
    if (state.currentSection !== sectionIndex) {
        // Save time spent in previous section
        if (state.currentSection !== null) {
            const timeSpent = Date.now() - state.sectionStartTime;
            state.readingTimes[state.currentSection] = 
                (state.readingTimes[state.currentSection] || 0) + timeSpent;
        }
        
        // Update to new section
        state.currentSection = sectionIndex;
        state.sectionStartTime = Date.now();
        
        // Save state and update navigation
        localStorage.setItem('lastSection', sectionIndex);
        localStorage.setItem('readingTimes', JSON.stringify(state.readingTimes));
        updateReadingProgress();
    }
    
    // Get paragraphs only in most visible section
    const sectionParagraphs = mostVisibleSection.querySelectorAll('p');
    let totalWords = 0;
    let wordsAboveViewport = 0;
    
    const windowBottom = viewportTop + viewportHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Check if we're at the bottom of the entire document
    const isAtBottom = windowBottom >= documentHeight - 50; // 50px buffer
    
    sectionParagraphs.forEach(p => {
        const words = countWords(p.textContent);
        totalWords += words;
        
        // Check if paragraph is completely above current viewport (fully read)
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
        // If paragraph is fully visible or below, don't count any words as read
    });
    
    const remainingWords = Math.max(0, totalWords - wordsAboveViewport);
    const remainingMinutes = Math.ceil(remainingWords / state.averageReadingSpeed);
    
    
    if (totalWords === 0) {
        // Fallback to introduction section if current section is empty
        const introSection = document.querySelector('.content-section[data-section="0"]');
        if (introSection) {
            const introParagraphs = introSection.querySelectorAll('p');
            
            if (introParagraphs.length > 0) {
                let introWords = 0;
                introParagraphs.forEach(p => {
                    introWords += countWords(p.textContent);
                });
                const introMinutes = Math.floor(introWords / state.averageReadingSpeed);
                timeSpan.textContent = introMinutes <= 0 ? 'complete' : `~${introMinutes} min`;
                return;
            }
        }
        
        timeSpan.textContent = 'calculating...';
        return;
    }
    
    // Only show complete if at bottom of entire document
    if (isAtBottom) {
        timeSpan.textContent = 'Complete';
    } else if (remainingMinutes <= 1) {
        timeSpan.textContent = 'Estimated time left in section ~ 1 min';
    } else {
        timeSpan.textContent = `Estimated time left in section ~ ${remainingMinutes} min`;
    }
}

// Add subtle parallax to hero image - Fixed for mobile
window.addEventListener('scroll', debounce(() => {
    if (document.body.classList.contains('plain-text-mode')) return;
    
    const scrolled = window.pageYOffset;
    const heroImage = document.querySelector('.hero-image img');
    
    if (heroImage) {
        // Only apply parallax when scrolling down and within reasonable bounds
        if (scrolled >= 0 && scrolled < window.innerHeight * 1.5) {
            const speed = 0.3; // Reduced speed for better mobile performance
            const yPos = -(scrolled * speed);
            heroImage.style.transform = `translateY(${yPos}px) translateZ(0)`;
        } else if (scrolled < 0) {
            // Reset transform when scrolling up past the top
            heroImage.style.transform = `translateY(0px) translateZ(0)`;
        }
    }
}, 8));

// Initialize title click to go to top
function initializeTitleClick() {
    const titleLink = document.querySelector('.title-link');
    if (titleLink) {
        titleLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// Track total time spent on site
function initializeTotalTimeTracking() {
    // Update total time every 30 seconds
    setInterval(() => {
        const timeSpentThisSession = Date.now() - state.siteStartTime;
        const newTotalTime = state.totalTimeOnSite + timeSpentThisSession;
        localStorage.setItem('totalTimeOnSite', newTotalTime);
    }, 30000); // Every 30 seconds
    
    // Also save on page unload
    window.addEventListener('beforeunload', () => {
        const timeSpentThisSession = Date.now() - state.siteStartTime;
        const newTotalTime = state.totalTimeOnSite + timeSpentThisSession;
        localStorage.setItem('totalTimeOnSite', newTotalTime);
    });
}