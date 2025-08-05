// Energy Landscape Theory - Sleek Interactions

// State Management
const state = {
    currentSection: parseInt(localStorage.getItem('lastSection')) || 0,
    sectionStartTime: Date.now(),
    readingTimes: JSON.parse(localStorage.getItem('readingTimes')) || {},
    isMenuOpen: false,
    isHelpOpen: false,
    scrollPosition: 0,
    readingSpeed: 0,
    sectionWordCounts: {}, // Store word counts for each section
    averageReadingSpeed: 225, // words per minute
    totalTimeOnSite: parseInt(localStorage.getItem('totalTimeOnSite')) || 0,
    siteStartTime: Date.now(),
    isNotesMode: localStorage.getItem('notesMode') === 'true' || false,
    notes: JSON.parse(localStorage.getItem('userNotes')) || {}
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
    initializeNotesFeature();
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
            
            // Auto-hide after 2 seconds of no scrolling
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                elements.floatingFontControls.classList.add('auto-hide');
            }, 2000);
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
    
    // Hide controls when clicking on main content
    document.addEventListener('click', (e) => {
        // Only hide if controls are visible and click is outside the controls
        if (elements.floatingFontControls.classList.contains('visible') && 
            !elements.floatingFontControls.contains(e.target)) {
            elements.floatingFontControls.classList.add('auto-hide');
        }
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
                    console.log('Section element:', entry.target.id);
                    
                    // Save state
                    localStorage.setItem('lastSection', sectionIndex);
                    localStorage.setItem('readingTimes', JSON.stringify(state.readingTimes));
                    
                    // Update navigation
                    updateReadingProgress();
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
    console.log('Current reading times:', state.readingTimes);
    let allSectionsRead = true;
    
    elements.navLinks.forEach((link) => {
        const sectionIndex = parseInt(link.dataset.section);
        const timeSpent = state.readingTimes[sectionIndex] || 0;
        const level = getReadingLevel(timeSpent);
        link.setAttribute('data-reading-level', level);
        
        // Check if this section has been read (2+ minutes = 120000ms)
        if (timeSpent < 120000) {
            allSectionsRead = false;
            console.log(`Section ${sectionIndex} not fully read: ${(timeSpent/1000).toFixed(1)}s`);
        }
        
        // Debug Protective Structures specifically
        if (sectionIndex === 11) {
            console.log('Protective Structures - section:', sectionIndex, 'time:', timeSpent, 'level:', level);
        }
    });
    
    // Update help sections with progressive disclosure
    updateHelpSections();
    
    // Show easter egg if all sections have been read
    console.log('All sections read?', allSectionsRead);
    if (allSectionsRead) {
        console.log('Triggering easter egg!');
        showEasterEgg();
    }
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

// Show easter egg notes section
function showEasterEgg() {
    // Check if user has spent at least 1 hour on site
    const timeSpentThisSession = Date.now() - state.siteStartTime;
    const totalTime = state.totalTimeOnSite + timeSpentThisSession;
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Only show if user has spent 1+ hour AND read all sections
    if (totalTime >= oneHour) {
        const notesSection = document.getElementById('notes');
        if (notesSection && notesSection.style.display === 'none') {
            console.log('Revealing easter egg Notes section after 1 hour!');
            notesSection.style.display = 'block';
            
            // Smooth scroll to make it noticeable
            setTimeout(() => {
                notesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 500);
        }
    } else {
        console.log('Easter egg requires 1 hour on site. Current time:', (totalTime / 1000 / 60).toFixed(1), 'minutes');
    }
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
        }
    } else {
        console.log('No last section to restore or starting from beginning');
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
        console.log('Starting to load markdown content...');
        
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
        console.log('Markdown loaded, length:', markdown.length);
        
        // Remove loading states
        contentSections.forEach(section => {
            section.classList.remove('loading');
        });
        
        const parts = markdown.split(/^## /m);
        const sections = parts.slice(1).filter(s => s.trim());
        
        console.log('Total markdown sections found:', sections.length);
        sections.forEach((section, index) => {
            const lines = section.split('\n');
            const rawTitle = lines[0].trim();
            const title = rawTitle.toLowerCase().replace(/\s+/g, '-');
            const content = lines.slice(1).join('\n').trim();
            
            console.log(`Section ${index}: ${rawTitle}, content length: ${content.length}`);
            
            // Handle the easter egg section with underscores
            if (rawTitle.includes('_____') || title === '' || title.includes('-----')) {
                console.log('Loading easter egg Notes content');
                const notesSection = document.getElementById('notes');
                if (notesSection) {
                    const contentDiv = notesSection.querySelector('.section-content');
                    if (contentDiv) {
                        // Convert markdown to HTML for Notes
                        let html;
                        if (typeof marked !== 'undefined' && marked.parse) {
                            html = marked.parse(content);
                        } else {
                            html = content
                                .split('\n\n')
                                .filter(p => p.trim())
                                .map(p => `<p>${p.trim().replace(/\n/g, ' ')}</p>`)
                                .join('');
                        }
                        contentDiv.innerHTML = html;
                        console.log('Loaded easter egg Notes content');
                    }
                }
                return;
            }
            
            const sectionElement = document.getElementById(title);
            if (sectionElement) {
                console.log(`Found HTML element for: ${title}`);
                const contentDiv = sectionElement.querySelector('.section-content');
                if (contentDiv) {
                    // Clear loading placeholder
                    contentDiv.innerHTML = '';
                    
                    // Convert markdown to HTML
                    let html;
                    if (typeof marked !== 'undefined' && marked.parse) {
                        html = marked.parse(content);
                    } else {
                        console.warn('Marked.js not available, using simple text conversion');
                        // Enhanced fallback - convert line breaks to paragraphs
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
        
        // Trigger scroll indicator position update after content loads
        if (document.body.classList.contains('plain-text-mode')) {
            setTimeout(() => {
                const event = new Event('scroll');
                window.dispatchEvent(event);
            }, 200);
        }
        
        // Update reading time estimates after content loads
        setTimeout(updateBottomReadingTime, 300);
        
        // Re-add note buttons if notes mode is active (for dynamically loaded content)
        if (state.isNotesMode) {
            setTimeout(() => {
                addParagraphNoteButtons();
            }, 400);
        }
        
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
        
        console.warn('Content loading failed. Fallback content displayed.');
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

// Calculate remaining reading time for a section
function calculateSectionReadingTime(sectionIndex) {
    const section = document.querySelector(`[data-section="${sectionIndex}"]`);
    if (!section) {
        console.log('No section found for index:', sectionIndex);
        return { remainingWords: 0, remainingMinutes: 0, totalWords: 0, readingProgress: 0 };
    }
    
    // Get all text content in the section (excluding headings)
    const paragraphs = section.querySelectorAll('p');
    console.log('Found paragraphs in section', sectionIndex, ':', paragraphs.length);
    
    let totalWords = 0;
    let wordsRead = 0;
    
    // Count total words
    paragraphs.forEach((p, index) => {
        const words = countWords(p.textContent);
        console.log(`Paragraph ${index} words:`, words, 'Text preview:', p.textContent.substring(0, 50));
        totalWords += words;
    });
    
    // Calculate how much has been read based on scroll position
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    const sectionBottom = sectionTop + sectionHeight;
    const viewportTop = window.pageYOffset;
    const viewportHeight = window.innerHeight;
    const viewportBottom = viewportTop + viewportHeight;
    
    // Calculate reading progress within the section
    let readingProgress = 0;
    if (viewportTop >= sectionBottom) {
        // Section is completely above viewport - fully read
        readingProgress = 1;
    } else if (viewportBottom <= sectionTop) {
        // Section is completely below viewport - not read yet
        readingProgress = 0;
    } else {
        // Section is partially visible - calculate how much is above the fold
        const visibleTop = Math.max(sectionTop, viewportTop);
        const readHeight = Math.max(0, visibleTop - sectionTop);
        readingProgress = Math.min(1, readHeight / sectionHeight);
    }
    
    // Calculate remaining words
    const remainingWords = Math.max(0, totalWords - (totalWords * readingProgress));
    
    // Convert to minutes (round up to nearest 0.5 minute)
    const remainingMinutes = Math.ceil((remainingWords / state.averageReadingSpeed) * 2) / 2;
    
    return {
        remainingWords,
        remainingMinutes,
        totalWords,
        readingProgress
    };
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
    console.log('Most visible section:', sectionIndex, mostVisibleSection.id);
    
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
    
    console.log('Visible section:', sectionIndex, 'Paragraphs:', sectionParagraphs.length);
    console.log('Section words:', totalWords, 'Read:', wordsAboveViewport, 'Remaining:', remainingWords);
    console.log('At bottom?', isAtBottom);
    
    if (totalWords === 0) {
        // Fallback to introduction section if current section is empty
        const introSection = document.querySelector('.content-section[data-section="0"]');
        if (introSection) {
            const introParagraphs = introSection.querySelectorAll('p');
            console.log('Fallback to intro section, paragraphs:', introParagraphs.length);
            
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
        timeSpan.textContent = 'complete';
    } else if (remainingMinutes <= 1) {
        timeSpan.textContent = '~1 min';
    } else {
        timeSpan.textContent = `~${remainingMinutes} min`;
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
        
        // Update the notes button visibility
        updateNotesButtonVisibility();
    }, 30000); // Every 30 seconds
    
    // Also save on page unload
    window.addEventListener('beforeunload', () => {
        const timeSpentThisSession = Date.now() - state.siteStartTime;
        const newTotalTime = state.totalTimeOnSite + timeSpentThisSession;
        localStorage.setItem('totalTimeOnSite', newTotalTime);
    });
    
    // Initial check for notes button visibility
    setTimeout(updateNotesButtonVisibility, 1000);
}

// Update notes button visibility based on 20-minute threshold
function updateNotesButtonVisibility() {
    const timeSpentThisSession = Date.now() - state.siteStartTime;
    const totalTime = state.totalTimeOnSite + timeSpentThisSession;
    const twentyMinutes = 0; // Set to 0 for immediate testing (was: 20 * 60 * 1000)
    
    const notesButton = document.querySelector('.notes-toggle');
    if (notesButton) {
        if (totalTime >= twentyMinutes) {
            notesButton.style.display = 'flex';
        } else {
            notesButton.style.display = 'none';
        }
    }
}

// Initialize notes feature
function initializeNotesFeature() {
    // Create and add notes toggle button to floating controls
    const notesButton = document.createElement('button');
    notesButton.className = 'font-button notes-toggle';
    notesButton.setAttribute('aria-label', 'Toggle notes mode');
    notesButton.style.display = 'none'; // Initially hidden until 20 minutes
    notesButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <path d="m15 5 4 4"/>
        </svg>
    `;
    
    const floatingControls = document.getElementById('floatingFontControls');
    if (floatingControls) {
        floatingControls.appendChild(notesButton); // Add at the end instead of beginning
    }
    
    // Add click handler for notes toggle
    notesButton.addEventListener('click', toggleNotesMode);
    
    // Apply saved notes mode state
    if (state.isNotesMode) {
        document.body.classList.add('notes-mode');
        addParagraphNoteButtons();
    }
    
    // Initial visibility check
    updateNotesButtonVisibility();
}

// Toggle notes mode
function toggleNotesMode() {
    state.isNotesMode = !state.isNotesMode;
    localStorage.setItem('notesMode', state.isNotesMode);
    
    if (state.isNotesMode) {
        // Store the current plain text mode state before forcing it
        state.originalPlainTextMode = document.body.classList.contains('plain-text-mode');
        
        // Force plain text mode when notes mode is active
        document.body.classList.add('plain-text-mode');
        document.body.classList.add('notes-mode');
        
        // Force fade overlays to be hidden
        const fadeTop = document.querySelector('.fade-top');
        const fadeBottom = document.querySelector('.fade-bottom');
        if (fadeTop && fadeBottom) {
            fadeTop.style.opacity = '0';
            fadeBottom.style.opacity = '0';
        }
        
        // Ensure all content is visible
        setTimeout(() => {
            document.querySelectorAll('p, h1, h2, h3, h4, h5, h6').forEach(element => {
                element.classList.add('visible');
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            });
        }, 100);
        
        addParagraphNoteButtons();
    } else {
        document.body.classList.remove('notes-mode');
        removeParagraphNoteButtons();
        hideAllNoteInputs();
        
        // Restore original plain text mode state
        if (!state.originalPlainTextMode) {
            document.body.classList.remove('plain-text-mode');
            localStorage.setItem('plainTextMode', 'false');
            
            // Restore fade overlays when exiting plain text mode
            const fadeTop = document.querySelector('.fade-top');
            const fadeBottom = document.querySelector('.fade-bottom');
            if (fadeTop && fadeBottom) {
                fadeTop.style.opacity = '';
                fadeBottom.style.opacity = '';
                // Trigger fade update immediately
                if (window.updateFadeOverlays) {
                    window.updateFadeOverlays(window.pageYOffset);
                }
            }
        }
    }
}

// Add + buttons to paragraphs
function addParagraphNoteButtons() {
    // Get ALL paragraphs, including those in dynamically loaded content
    const allParagraphs = document.querySelectorAll('.content p, .section-content p');
    console.log('Found paragraphs:', allParagraphs.length);
    
    allParagraphs.forEach((paragraph, index) => {
        // Skip if already initialized
        if (paragraph.dataset.notesInitialized) return;
        paragraph.dataset.notesInitialized = 'true';
        
        // Position button relative to paragraph
        paragraph.style.position = 'relative';
        
        // Create notes container for this paragraph
        const notesContainer = document.createElement('div');
        notesContainer.className = 'paragraph-notes-container';
        paragraph.appendChild(notesContainer);
        
        // Load existing notes for this paragraph
        loadExistingNotes(paragraph, index);
        
        // Always show an add button at the end
        addNewNoteButton(paragraph, index);
    });
}

// Load existing notes for a paragraph
function loadExistingNotes(paragraph, paragraphIndex) {
    const notesContainer = paragraph.querySelector('.paragraph-notes-container');
    if (!notesContainer) return;
    
    // Get all notes for this paragraph
    const paragraphNotes = Object.keys(state.notes)
        .filter(key => key.startsWith(`paragraph-${paragraphIndex}-`))
        .sort((a, b) => {
            const aIndex = parseInt(a.split('-')[2]);
            const bIndex = parseInt(b.split('-')[2]);
            return aIndex - bIndex;
        });
    
    paragraphNotes.forEach(noteKey => {
        const noteIndex = parseInt(noteKey.split('-')[2]);
        const noteData = state.notes[noteKey];
        addExistingNoteCircle(paragraph, paragraphIndex, noteIndex, noteData);
    });
}

// Add a new note button (+ sign)
function addNewNoteButton(paragraph, paragraphIndex) {
    const notesContainer = paragraph.querySelector('.paragraph-notes-container');
    if (!notesContainer) return;
    
    // Remove existing add button
    const existingButton = notesContainer.querySelector('.note-add-button');
    if (existingButton) existingButton.remove();
    
    const noteButton = document.createElement('button');
    noteButton.className = 'note-add-button';
    noteButton.setAttribute('aria-label', 'Add note');
    noteButton.innerHTML = '+';
    
    notesContainer.appendChild(noteButton);
    
    // Add click handler
    noteButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const noteIndex = getNextNoteIndex(paragraphIndex);
        showNoteInput(paragraph, paragraphIndex, noteIndex);
    });
}

// Get next available note index for a paragraph
function getNextNoteIndex(paragraphIndex) {
    const existingNotes = Object.keys(state.notes)
        .filter(key => key.startsWith(`paragraph-${paragraphIndex}-`))
        .map(key => parseInt(key.split('-')[2]));
    
    return existingNotes.length > 0 ? Math.max(...existingNotes) + 1 : 0;
}

// Remove + buttons from paragraphs
function removeParagraphNoteButtons() {
    const containers = document.querySelectorAll('.paragraph-notes-container');
    containers.forEach(container => container.remove());
    
    // Reset initialization flag
    const paragraphs = document.querySelectorAll('.content p');
    paragraphs.forEach(p => {
        delete p.dataset.notesInitialized;
    });
}

// Show note input box
function showNoteInput(paragraph, paragraphIndex, noteIndex) {
    // Hide any existing input boxes AND edit containers
    hideAllNoteInputs();
    hideAllEditContainers();
    
    const noteKey = `paragraph-${paragraphIndex}-${noteIndex}`;
    let existingNoteData = null;
    
    if (state.notes[noteKey]) {
        existingNoteData = JSON.parse(state.notes[noteKey]);
    }
    
    // If note exists, show compact edit view
    if (existingNoteData && existingNoteData.text) {
        showCompactEditView(paragraph, paragraphIndex, noteIndex, existingNoteData);
    } else {
        // Show full input for new notes
        showFullNoteInput(paragraph, paragraphIndex, noteIndex);
    }
}

// Show compact edit view for existing notes
function showCompactEditView(paragraph, paragraphIndex, noteIndex, noteData) {
    // Check if already showing for this note
    const existingEdit = paragraph.querySelector('.note-edit-container');
    if (existingEdit) {
        existingEdit.remove();
        return; // Don't reopen if clicking same note
    }
    
    const editContainer = document.createElement('div');
    editContainer.className = 'note-edit-container';
    editContainer.style.backgroundColor = noteData.color;
    editContainer.dataset.noteIndex = noteIndex; // Track which note this is for
    
    const noteText = document.createElement('div');
    noteText.className = 'note-edit-text';
    noteText.textContent = noteData.text;
    
    const editButton = document.createElement('button');
    editButton.className = 'note-edit-button';
    editButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
    `;
    
    editContainer.appendChild(noteText);
    editContainer.appendChild(editButton);
    paragraph.appendChild(editContainer);
    
    // Click edit button to open full editor
    editButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        editContainer.remove();
        showFullNoteInput(paragraph, paragraphIndex, noteIndex);
    });
    
    // Click outside to close
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!editContainer.contains(e.target)) {
                editContainer.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
    }, 100);
}

// Show full note input (for new notes or when editing)
function showFullNoteInput(paragraph, paragraphIndex, noteIndex) {
    const noteContainer = document.createElement('div');
    noteContainer.className = 'note-input-container';
    
    const noteInput = document.createElement('textarea');
    noteInput.className = 'note-input';
    noteInput.placeholder = ''; // No placeholder text
    noteInput.rows = 3;
    
    // Color picker for the note
    const colorPicker = document.createElement('div');
    colorPicker.className = 'note-color-picker';
    
    const colors = ['#f0d9ef', '#fcdce1', '#ffe6bb', '#e9ecce', '#cde9dc', '#c4dfe5'];
    colors.forEach((color, index) => {
        const colorButton = document.createElement('button');
        colorButton.className = 'color-option';
        colorButton.style.backgroundColor = color;
        colorButton.dataset.color = color;
        colorButton.setAttribute('aria-label', `Color option ${index + 1}`);
        
        if (index === 0) colorButton.classList.add('selected');
        
        colorButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            colorPicker.querySelectorAll('.color-option').forEach(btn => btn.classList.remove('selected'));
            colorButton.classList.add('selected');
        });
        
        colorPicker.appendChild(colorButton);
    });
    
    const noteKey = `paragraph-${paragraphIndex}-${noteIndex}`;
    if (state.notes[noteKey]) {
        const noteData = JSON.parse(state.notes[noteKey]);
        noteInput.value = noteData.text;
        // Select the saved color
        const savedColorButton = colorPicker.querySelector(`[data-color="${noteData.color}"]`);
        if (savedColorButton) {
            colorPicker.querySelectorAll('.color-option').forEach(btn => btn.classList.remove('selected'));
            savedColorButton.classList.add('selected');
        }
    }
    
    noteContainer.appendChild(noteInput);
    noteContainer.appendChild(colorPicker);
    paragraph.appendChild(noteContainer);
    
    // Prevent color picker clicks from closing the input
    colorPicker.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // Also prevent blur when clicking anywhere in the container
    noteContainer.addEventListener('mousedown', (e) => {
        if (e.target !== noteInput) {
            e.preventDefault();
        }
    });
    
    // Focus the input after a small delay
    setTimeout(() => {
        noteInput.focus();
    }, 50);
    
    // Save note on blur or click away
    noteInput.addEventListener('blur', () => {
        const selectedColor = colorPicker.querySelector('.color-option.selected')?.dataset.color || colors[0];
        console.log('Saving note with color:', selectedColor);
        saveNote(paragraph, paragraphIndex, noteIndex, noteInput.value, selectedColor);
    });
    
    // Also save on Enter key (but allow Shift+Enter for new lines)
    noteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            noteInput.blur(); // Trigger save
        }
    });
    
    // Close on Escape
    noteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            noteInput.blur();
        }
    });
}

// Save note and show as circle
function saveNote(paragraph, paragraphIndex, noteIndex, noteText, color) {
    const noteKey = `paragraph-${paragraphIndex}-${noteIndex}`;
    
    if (noteText.trim()) {
        // Save the note with color
        const noteData = {
            text: noteText.trim(),
            color: color
        };
        state.notes[noteKey] = JSON.stringify(noteData);
        localStorage.setItem('userNotes', JSON.stringify(state.notes));
        
        // Show existing note
        addExistingNoteCircle(paragraph, paragraphIndex, noteIndex, noteData);
    } else {
        // Remove empty note
        delete state.notes[noteKey];
        localStorage.setItem('userNotes', JSON.stringify(state.notes));
        
        // Remove note circle if it exists
        const existingCircle = paragraph.querySelector(`[data-note-index="${noteIndex}"]`);
        if (existingCircle) {
            existingCircle.remove();
        }
    }
    
    // Remove input container
    const inputContainer = paragraph.querySelector('.note-input-container');
    if (inputContainer) {
        inputContainer.remove();
    }
    
    // Refresh the add button
    addNewNoteButton(paragraph, paragraphIndex);
}

// Add existing note circle
function addExistingNoteCircle(paragraph, paragraphIndex, noteIndex, noteData) {
    const notesContainer = paragraph.querySelector('.paragraph-notes-container');
    if (!notesContainer) return;
    
    // Remove existing circle if present
    const existingCircle = notesContainer.querySelector(`[data-note-index="${noteIndex}"]`);
    if (existingCircle) {
        existingCircle.remove();
    }
    
    // Parse note data if it's a string
    let parsedNoteData = noteData;
    if (typeof noteData === 'string') {
        try {
            parsedNoteData = JSON.parse(noteData);
        } catch (e) {
            // Fallback for old format
            parsedNoteData = { text: noteData, color: '#f0d9ef' };
        }
    }
    
    // Ensure we have a color
    if (!parsedNoteData.color) {
        parsedNoteData.color = '#f0d9ef';
    }
    
    // Create note circle container
    const noteContainer = document.createElement('div');
    noteContainer.className = 'note-item';
    noteContainer.dataset.noteIndex = noteIndex;
    
    // Create delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'note-delete';
    deleteButton.setAttribute('aria-label', 'Delete note');
    deleteButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"/>
        </svg>
    `;
    
    // Create note circle
    const noteCircle = document.createElement('button');
    noteCircle.className = 'note-circle';
    noteCircle.setAttribute('aria-label', 'View/edit note');
    noteCircle.innerHTML = '●';
    noteCircle.title = parsedNoteData.text; // Show note text on hover
    noteCircle.style.backgroundColor = parsedNoteData.color;
    console.log('Setting note circle color to:', parsedNoteData.color);
    
    noteContainer.appendChild(deleteButton);
    noteContainer.appendChild(noteCircle);
    
    // Insert before the add button
    const addButton = notesContainer.querySelector('.note-add-button');
    if (addButton) {
        notesContainer.insertBefore(noteContainer, addButton);
    } else {
        notesContainer.appendChild(noteContainer);
    }
    
    // Click to edit the note
    noteCircle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showNoteInput(paragraph, paragraphIndex, noteIndex);
    });
    
    // Click to delete the note
    deleteButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteNote(paragraph, paragraphIndex, noteIndex);
    });
}

// Delete a note
function deleteNote(paragraph, paragraphIndex, noteIndex) {
    const noteKey = `paragraph-${paragraphIndex}-${noteIndex}`;
    
    // Remove from state and localStorage
    delete state.notes[noteKey];
    localStorage.setItem('userNotes', JSON.stringify(state.notes));
    
    // Remove from DOM
    const notesContainer = paragraph.querySelector('.paragraph-notes-container');
    if (notesContainer) {
        const noteItem = notesContainer.querySelector(`[data-note-index="${noteIndex}"]`);
        if (noteItem) {
            noteItem.remove();
        }
    }
    
    // Also remove any open edit containers for this note
    const editContainer = paragraph.querySelector(`.note-edit-container[data-note-index="${noteIndex}"]`);
    if (editContainer) {
        editContainer.remove();
    }
    
    // And remove any open input containers
    const inputContainer = paragraph.querySelector('.note-input-container');
    if (inputContainer) {
        inputContainer.remove();
    }
}

// Hide all note input boxes
function hideAllNoteInputs() {
    const inputs = document.querySelectorAll('.note-input-container');
    inputs.forEach(input => input.remove());
}

// Hide all edit containers
function hideAllEditContainers() {
    const editContainers = document.querySelectorAll('.note-edit-container');
    editContainers.forEach(container => container.remove());
}

