// Load and render markdown content
async function loadContent() {
    try {
        // Fetch the markdown content
        const response = await fetch('content.md');
        const markdown = await response.text();
        
        // Parse the markdown into sections
        const sections = parseMarkdownSections(markdown);
        
        // Render the sections
        renderSections(sections);
        
    } catch (error) {
        console.error('Error loading content:', error);
    }
}

function parseMarkdownSections(markdown) {
    const sections = [];
    const lines = markdown.split('\n');
    let currentSection = null;
    let currentContent = [];
    let introContent = [];
    let foundFirstHeading = false;
    
    for (const line of lines) {
        if (line.startsWith('# ') && !line.startsWith('## ')) {
            // If we haven't found a heading yet, save intro content
            if (!foundFirstHeading && introContent.length > 0) {
                sections.push({
                    title: 'introduction',
                    content: introContent.join('\n').trim()
                });
            }
            foundFirstHeading = true;
            
            // Save previous section if exists
            if (currentSection) {
                sections.push({
                    title: currentSection,
                    content: currentContent.join('\n').trim()
                });
            }
            // Start new section
            currentSection = line.substring(2).trim();
            currentContent = [];
        } else {
            if (!foundFirstHeading) {
                introContent.push(line);
            } else {
                currentContent.push(line);
            }
        }
    }
    
    // Save introduction if we never found headings
    if (!foundFirstHeading && introContent.length > 0) {
        sections.push({
            title: 'introduction',
            content: introContent.join('\n').trim()
        });
    }
    
    // Save the last section
    if (currentSection) {
        sections.push({
            title: currentSection,
            content: currentContent.join('\n').trim()
        });
    }
    
    return sections;
}

function renderSections(sections) {
    const contentElement = document.getElementById('content');
    
    // Store conclusion section separately for later
    let conclusionSection = null;
    
    sections.forEach((section, index) => {
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
            const heading = document.createElement('h1');
            heading.textContent = section.title;
            sectionElement.appendChild(heading);
        }
        
        // Render markdown content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'section-content';
        contentDiv.innerHTML = marked.parse(section.content);
        sectionElement.appendChild(contentDiv);
        
        contentElement.appendChild(sectionElement);
    });
    
    // Store conclusion section for timer
    if (conclusionSection) {
        window.conclusionSection = conclusionSection;
    }
    
    // Initialize conclusion timer after content is rendered
    initConclusionTimer();
    
    // Initialize reading position tracking after content is rendered
    initReadingPosition();
    
    // Dispatch custom event to notify that content is ready
    document.dispatchEvent(new CustomEvent('contentReady'));
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
    const heading = document.createElement('h1');
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