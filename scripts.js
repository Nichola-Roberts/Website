// Store all parts globally
window.contentParts = [
    { title: 'PART 1 - The Lay of the Land', file: 'part1.html' },
    { title: 'PART 2 - Engineering Our Landscape', file: 'part2.html' },
    { title: 'PART 3 - Integrating Our Landscape', file: 'part3.html' }
];
window.currentPartIndex = 0;

// Load and render content
async function loadContent() {
    try {
        // Render only Part 1 initially
        await renderPart(0);

    } catch (error) {
        console.error('Error loading content:', error);
    }
}

async function renderPart(partIndex) {
    if (partIndex < 0 || partIndex >= window.contentParts.length) return;

    const contentElement = document.getElementById('content');
    const part = window.contentParts[partIndex];

    try {
        // Fetch the HTML content for this part
        const response = await fetch(part.file);
        const html = await response.text();

        // Create part container
        const partContainer = document.createElement('div');
        partContainer.className = 'part-container';
        partContainer.id = `part-${partIndex + 1}`;

        // Add part title
        const partTitle = document.createElement('h1');
        partTitle.className = 'part-title';
        partTitle.textContent = part.title;
        partContainer.appendChild(partTitle);

        // Create content section
        const sectionElement = document.createElement('section');
        sectionElement.className = 'content-section';
        sectionElement.innerHTML = html;

        // Assign IDs to all h2 elements for navigation
        const h2Elements = sectionElement.querySelectorAll('h2');
        h2Elements.forEach((h2, index) => {
            const sectionId = h2.textContent.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w-]/g, '');
            h2.id = sectionId;

            // Wrap h2 and following content in a navigable section
            const miniSection = document.createElement('div');
            miniSection.className = 'content-subsection';
            miniSection.id = `section-${sectionId}`;
            miniSection.setAttribute('data-section-title', h2.textContent);
        });

        partContainer.appendChild(sectionElement);

        // Add continue button if there's a next part
        if (partIndex < window.contentParts.length - 1) {
            const continueButton = document.createElement('button');
            continueButton.className = 'continue-button';
            continueButton.textContent = `CONTINUE TO ${window.contentParts[partIndex + 1].title}`;
            continueButton.onclick = () => loadNextPart(partIndex + 1);
            partContainer.appendChild(continueButton);
        }

        // Append to content
        contentElement.appendChild(partContainer);

        // Initialize features on first part
        if (partIndex === 0) {
            initConclusionTimer();
            initReadingPosition();
            document.dispatchEvent(new CustomEvent('contentReady'));
        }

        // Trigger notes system update if in notes mode
        if (document.body.classList.contains('notes-mode')) {
            setTimeout(() => {
                document.dispatchEvent(new CustomEvent('contentAdded'));
            }, 100);
        }

        // Track part view in Google Analytics
        trackPartView(partIndex, part.title);

        // Update current part index
        window.currentPartIndex = partIndex;

        // Trigger navigation update for new content
        if (partIndex > 0) {
            setTimeout(() => {
                document.dispatchEvent(new CustomEvent('contentAdded'));
                // Update navigation menu
                if (window.navigationMenu && typeof window.navigationMenu.populateMenu === 'function') {
                    window.navigationMenu.populateMenu();
                }
            }, 100);
        }

    } catch (error) {
        console.error(`Error loading ${part.file}:`, error);
    }
}

// Track part views in Google Analytics
function trackPartView(partIndex, partTitle) {
    // Check if gtag is available
    if (typeof gtag === 'function') {
        // Create a virtual page path for each part
        const virtualPath = partIndex === 0 ? '/' : `/part-${partIndex + 1}`;

        // Send virtual pageview
        gtag('event', 'page_view', {
            page_title: partTitle,
            page_path: virtualPath,
            page_location: window.location.origin + virtualPath
        });

        // Also send a custom event for part progression
        if (partIndex > 0) {
            gtag('event', 'content_progression', {
                event_category: 'engagement',
                event_label: partTitle,
                part_number: partIndex + 1
            });
        }
    }
}

async function loadNextPart(partIndex) {
    // Smooth scroll to where new content will appear
    const lastPartContainer = document.querySelector(`#part-${partIndex}`);
    if (lastPartContainer) {
        const scrollTarget = lastPartContainer.offsetTop + lastPartContainer.offsetHeight - 100;
        window.scrollTo({
            top: scrollTarget,
            behavior: 'smooth'
        });
    }

    // Small delay before rendering to allow scroll
    setTimeout(async () => {
        await renderPart(partIndex);
    }, 300);
}


// Reading position tracking
function initReadingPosition() {
    // Restore saved reading position
    restoreReadingPosition();
    
    // Hook into TimeTracker's section detection for saving position
    // Wait for TimeTracker to be available
    setTimeout(() => {
        const originalSetCurrentSection = window.timeTracker?.setCurrentSection;
        if (originalSetCurrentSection && window.timeTracker) {
            window.timeTracker.setCurrentSection = function(sectionId) {
                originalSetCurrentSection.call(this, sectionId);
                saveCurrentSection(sectionId);
            };
        }
    }, 100);
}

function saveCurrentSection(sectionId) {
    localStorage.setItem('currentSection', sectionId);
    // Also save which part we're on
    localStorage.setItem('currentPart', window.currentPartIndex || 0);
}

async function restoreReadingPosition() {
    const savedSection = localStorage.getItem('currentSection');
    const savedPart = parseInt(localStorage.getItem('currentPart') || '0');

    if (savedSection) {
        // If user was on Part 2 or 3, we need to load those parts first
        if (savedPart > 0) {
            // Load all parts up to the saved part
            for (let i = 1; i <= savedPart; i++) {
                if (i < window.contentParts.length) {
                    await renderPart(i);
                }
            }
        }

        // Now try to find and scroll to the saved section
        const attemptScroll = () => {
            const sectionElement = document.getElementById(savedSection);
            if (sectionElement) {
                // Calculate position to place element 1/3 down the viewport
                const elementRect = sectionElement.getBoundingClientRect();
                const elementTop = elementRect.top + window.pageYOffset;
                const viewportHeight = window.innerHeight;
                const targetPosition = elementTop - (viewportHeight / 3);

                window.scrollTo({
                    top: Math.max(0, targetPosition),
                    behavior: 'smooth'
                });
            } else {
                // Section not found yet, try again in a moment
                setTimeout(attemptScroll, 200);
            }
        };

        // Small delay to ensure content is fully rendered
        setTimeout(attemptScroll, 100);
    }
}

// Conclusion timer functionality
function initConclusionTimer() {
    // Check every second if 20 minutes have passed
    const checkTimer = setInterval(() => {
        if (window.timeTracker && window.conclusionSection) {
            const totalTime = window.timeTracker.getTotalTime();
            const twentyMinutes = 20 * 60 * 1000; // 20 minutes in milliseconds
            
            if (totalTime >= twentyMinutes) {
                // Add conclusion section to the page
                addConclusionSection();
                clearInterval(checkTimer);
            }
        }
    }, 1000);
}

function addConclusionSection() {
    if (!window.conclusionSection) return;
    
    const contentElement = document.getElementById('content');
    const section = window.conclusionSection;
    
    const sectionElement = document.createElement('section');
    sectionElement.className = 'content-section';
    sectionElement.id = 'conclusion';
    
    // Add heading
    const heading = document.createElement('h2');
    heading.textContent = section.title;
    sectionElement.appendChild(heading);
    
    // Render markdown content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'section-content';
    contentDiv.innerHTML = marked.parse(section.content);
    sectionElement.appendChild(contentDiv);
    
    contentElement.appendChild(sectionElement);
    
    // Trigger notes system to add note buttons to new paragraphs
    if (document.body.classList.contains('notes-mode')) {
        // Re-initialize notes for new content
        setTimeout(() => {
            const event = new CustomEvent('contentAdded');
            document.dispatchEvent(event);
        }, 100);
    }
    
    // Clean up
    window.conclusionSection = null;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', loadContent);