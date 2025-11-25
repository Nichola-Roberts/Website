// Help modal functionality
let isHelpOpen = false;
let allHelpSections = null;

function initializeHelp() {
    const helpTrigger = document.querySelector('.help-trigger');
    const helpModal = document.getElementById('helpModal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    
    if (!helpTrigger || !helpModal || !modalBackdrop) return;
    
    helpTrigger.addEventListener('click', toggleHelp);
    
    // Close when clicking backdrop
    modalBackdrop.addEventListener('click', closeHelp);
    
    // Close when clicking outside modal content
    document.addEventListener('click', (e) => {
        if (isHelpOpen && 
            !helpModal.contains(e.target) && 
            !helpTrigger.contains(e.target)) {
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
    
    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isHelpOpen) {
            closeHelp();
        }
    });
}

function toggleHelp() {
    isHelpOpen = !isHelpOpen;
    const helpModal = document.getElementById('helpModal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    
    if (isHelpOpen) {
        helpModal.classList.add('active');
        modalBackdrop.classList.add('active');
        
        // Update help sections with current reading progress
        updateHelpSections(true); // Pass true to indicate initial open
    } else {
        helpModal.classList.remove('active');
        modalBackdrop.classList.remove('active');
    }
}

function closeHelp() {
    isHelpOpen = false;
    const helpModal = document.getElementById('helpModal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    
    helpModal.classList.remove('active');
    modalBackdrop.classList.remove('active');
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
            allHelpSections = sections;
            updateHelpSections();
        }
    } catch (error) {
        console.warn('Could not load guide content:', error);
    }
}

// Update help sections based on reading progress
function updateHelpSections(shouldScrollToCurrentSection = false) {
    const helpSections = document.querySelector('.help-sections');
    if (!helpSections || !allHelpSections) return;
    
    let guideHTML = '';
    
    allHelpSections.forEach((section, index) => {
        const title = section.split('\n')[0] || `Section ${index + 1}`;
        const content = section.split('\n').slice(1).join('\n');
        
        // Check if this section should be unlocked
        const isIntroduction = index === 0;
        
        // Create section ID from title to match content sections
        const helpSectionId = title.trim().toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '')
            .replace(/-+$/, '') || 'introduction'; // Remove trailing dashes
            
        // Get time spent on corresponding content section
        const timeTracker = window.timeTracker;
        const sectionTime = timeTracker ? timeTracker.getSectionTime(helpSectionId) : 0;
        const hasSpentEnoughTime = sectionTime >= 120000; // 2 minutes
        
        // Check if currently reading this section
        const currentSection = timeTracker ? timeTracker.currentSection : null;
        const isCurrentlyReading = currentSection === helpSectionId;
        
        
        if (isIntroduction || hasSpentEnoughTime || isCurrentlyReading) {
            // Simple HTML formatting without markdown parser
            const formattedContent = content
                .split('\n\n')
                .map(para => `<p>${para.replace(/\n/g, ' ')}</p>`)
                .join('');
            const html = `<h2>${title}</h2>${formattedContent}`;
            const currentClass = isCurrentlyReading ? ' current-section' : '';
            guideHTML += `<div class="help-section${currentClass}" data-section-index="${index}" data-section-id="${helpSectionId}">${html}</div>`;
        } else {
            // Show a locked placeholder for unread sections
            guideHTML += `<div class="help-section locked" data-section-index="${index}">
                <h2>${title} <svg class="lock-icon lock-icon-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg></h2>
            </div>`;
        }
    });
    
    helpSections.innerHTML = guideHTML;
    
    // Auto-scroll to current section only on initial open
    if (shouldScrollToCurrentSection) {
        setTimeout(() => {
            const currentSectionElement = helpSections.querySelector('.current-section');
            if (currentSectionElement) {
                currentSectionElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }, 100);
    }
}

// Make updateHelpSections globally available
window.updateHelpSections = updateHelpSections;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    loadGuideContent();
    initializeHelp();
});