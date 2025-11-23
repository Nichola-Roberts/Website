// Store all parts globally
window.contentParts = [];
window.currentPartIndex = 0;

// Load and render markdown content
async function loadContent() {
    try {
        // Fetch the markdown content
        const response = await fetch('content.md');
        const markdown = await response.text();

        // Parse the markdown into parts
        window.contentParts = parseMarkdownParts(markdown);

        // Render only Part 1 initially
        renderPart(0);

    } catch (error) {
        console.error('Error loading content:', error);
    }
}

function parseMarkdownParts(markdown) {
    const parts = [];
    const lines = markdown.split('\n');
    let currentPart = null;
    let currentSection = null;
    let currentContent = [];
    let introContent = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for PART markers (# PART X)
        if (line.match(/^# PART \d+/)) {
            // Save previous part if exists
            if (currentPart) {
                // Save last section of previous part
                if (currentSection) {
                    currentPart.sections.push({
                        title: currentSection,
                        content: currentContent.join('\n').trim()
                    });
                }
                parts.push(currentPart);
            }

            // Start new part
            currentPart = {
                title: line.substring(2).trim(), // Remove "# "
                sections: []
            };
            currentSection = null;
            currentContent = [];
            continue;
        }

        // Check for section headers (## but not ###)
        if (line.startsWith('## ') && !line.startsWith('### ')) {
            // If we're not in a part yet, this is intro content
            if (!currentPart) {
                if (introContent.length > 0 || currentSection) {
                    // Create intro part
                    if (!parts.length) {
                        parts.push({
                            title: 'Introduction',
                            sections: [{
                                title: 'introduction',
                                content: introContent.join('\n').trim()
                            }]
                        });
                    }
                }
                introContent = [];
            } else {
                // Save previous section if exists
                if (currentSection) {
                    currentPart.sections.push({
                        title: currentSection,
                        content: currentContent.join('\n').trim()
                    });
                }
                // Start new section
                currentSection = line.substring(3).trim();
                currentContent = [];
            }
        } else {
            // Regular content line
            if (!currentPart) {
                introContent.push(line);
            } else {
                currentContent.push(line);
            }
        }
    }

    // Save the last section and part
    if (currentPart) {
        if (currentSection) {
            currentPart.sections.push({
                title: currentSection,
                content: currentContent.join('\n').trim()
            });
        }
        parts.push(currentPart);
    }

    return parts;
}

function renderPart(partIndex) {
    if (partIndex < 0 || partIndex >= window.contentParts.length) return;

    const contentElement = document.getElementById('content');
    const part = window.contentParts[partIndex];

    // Create part container
    const partContainer = document.createElement('div');
    partContainer.className = 'part-container';
    partContainer.id = `part-${partIndex + 1}`;

    // Add part title
    const partTitle = document.createElement('h1');
    partTitle.className = 'part-title';
    partTitle.textContent = part.title;
    partContainer.appendChild(partTitle);

    // Store conclusion section separately for later
    let conclusionSection = null;

    // Render each section in this part
    part.sections.forEach((section) => {
        // Create section ID from title
        const sectionId = section.title.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '') || 'introduction';

        // Skip conclusion section initially
        if (sectionId === 'conclusion') {
            conclusionSection = section;
            return;
        }

        const sectionElement = document.createElement('section');
        sectionElement.className = 'content-section';
        sectionElement.id = sectionId;

        // Add heading if not introduction
        if (section.title !== 'introduction') {
            const heading = document.createElement('h2');
            heading.textContent = section.title;
            sectionElement.appendChild(heading);
        }

        // Render markdown content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'section-content';
        contentDiv.innerHTML = marked.parse(section.content);
        sectionElement.appendChild(contentDiv);

        partContainer.appendChild(sectionElement);
    });

    // Add continue button if there's a next part
    if (partIndex < window.contentParts.length - 1) {
        const continueButton = document.createElement('button');
        continueButton.className = 'continue-button';
        continueButton.textContent = `Continue to ${window.contentParts[partIndex + 1].title}`;
        continueButton.onclick = () => loadNextPart(partIndex + 1);
        partContainer.appendChild(continueButton);
    }

    // Append to content
    contentElement.appendChild(partContainer);

    // Store conclusion section for timer (only for first load)
    if (partIndex === 0 && conclusionSection) {
        window.conclusionSection = conclusionSection;
    }

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

    // Update current part index
    window.currentPartIndex = partIndex;
}

function loadNextPart(partIndex) {
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
    setTimeout(() => {
        renderPart(partIndex);
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
}

function restoreReadingPosition() {
    const savedSection = localStorage.getItem('currentSection');
    if (savedSection) {
        const sectionElement = document.getElementById(savedSection);
        if (sectionElement) {
            // Small delay to ensure content is fully rendered
            setTimeout(() => {
                // Calculate position to place element 1/3 down the viewport
                const elementRect = sectionElement.getBoundingClientRect();
                const elementTop = elementRect.top + window.pageYOffset;
                const viewportHeight = window.innerHeight;
                const targetPosition = elementTop - (viewportHeight / 3);
                
                window.scrollTo({
                    top: Math.max(0, targetPosition),
                    behavior: 'smooth'
                });
            }, 100);
        }
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