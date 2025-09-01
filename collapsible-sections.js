/**
 * Collapsible Sections
 * Makes H2 sections collapsible starting from Core Beliefs section
 */

class CollapsibleSections {
    constructor() {
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // Wait for content to be loaded AND notes system to be initialized
        const checkContent = setInterval(() => {
            const content = document.querySelector('.content');
            if (content && content.textContent.length > 0) {
                clearInterval(checkContent);
                // Delay slightly to ensure notes system runs first
                setTimeout(() => {
                    this.makeCollapsible();
                    // If notes mode is active, refresh the notes
                    if (window.NotesSystem && window.NotesSystem.isNotesMode) {
                        window.NotesSystem.removeNotesFromParagraphs();
                        window.NotesSystem.addNotesToParagraphs();
                    }
                }, 500);
            }
        }, 100);
    }

    makeCollapsible() {
        const content = document.querySelector('.content');
        if (!content) return;

        // Find the Core Beliefs H1 and Emotional Overload H1
        const allHeadings = content.querySelectorAll('h1, h2');
        let foundCoreBeliefs = false;
        let foundEmotionalOverload = false;
        let currentH2Section = null;

        allHeadings.forEach((heading) => {
            // Check if this is the Emotional Overload H1
            if (heading.tagName === 'H1' && heading.textContent.trim() === 'Emotional Overload') {
                foundEmotionalOverload = true;
                foundCoreBeliefs = false; // Reset this flag
                return;
            }
            
            // Check if this is the Core Beliefs H1
            if (heading.tagName === 'H1' && heading.textContent.trim() === 'Core Beliefs') {
                foundCoreBeliefs = true;
                foundEmotionalOverload = false; // Reset this flag
                return;
            }

            // Skip making H2s in Emotional Overload section collapsible
            // (This section will have no collapsible subsections)
            
            // Process H2s after Core Beliefs
            if (foundCoreBeliefs && heading.tagName === 'H2') {
                // Make this H2 collapsible but start expanded
                this.makeHeadingCollapsible(heading, false);
            }
        });

        // Restore collapsed state from localStorage (if user has previously expanded any)
        this.restoreCollapsedState();
    }

    makeHeadingCollapsible(h2, startCollapsed = false) {
        // Add collapsible class and controls
        h2.classList.add('collapsible-heading');
        if (startCollapsed) {
            h2.classList.add('collapsed');
        }
        
        // Create toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'collapse-toggle';
        toggleBtn.setAttribute('aria-expanded', startCollapsed ? 'false' : 'true');
        toggleBtn.setAttribute('aria-label', 'Toggle section');
        toggleBtn.innerHTML = `
            <svg class="collapse-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6"/>
            </svg>
        `;

        // Wrap the heading content in a span for better layout
        const headingText = document.createElement('span');
        headingText.className = 'heading-text';
        headingText.textContent = h2.textContent;
        
        h2.textContent = '';
        h2.appendChild(toggleBtn);
        h2.appendChild(headingText);

        // Create wrapper for the section content
        const sectionContent = document.createElement('div');
        sectionContent.className = 'collapsible-content';
        if (startCollapsed) {
            sectionContent.classList.add('collapsed');
        }
        sectionContent.setAttribute('data-section-id', this.getSectionId(headingText.textContent));

        // Move all elements between this h2 and the next h1/h2 into the section
        let nextElement = h2.nextElementSibling;
        while (nextElement && !['H1', 'H2'].includes(nextElement.tagName)) {
            const elementToMove = nextElement;
            nextElement = nextElement.nextElementSibling;
            sectionContent.appendChild(elementToMove);
        }

        // Insert the section content after the h2
        h2.insertAdjacentElement('afterend', sectionContent);

        // Add click handler only to the toggle button
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleSection(h2, sectionContent, toggleBtn);
        });

        // Don't add click handler to heading text - let notes functionality work
    }

    toggleSection(heading, content, button) {
        const isCollapsed = content.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expand
            content.classList.remove('collapsed');
            heading.classList.remove('collapsed');
            button.setAttribute('aria-expanded', 'true');
        } else {
            // Collapse
            content.classList.add('collapsed');
            heading.classList.add('collapsed');
            button.setAttribute('aria-expanded', 'false');
        }

        // Save state
        this.saveCollapsedState();
    }

    getSectionId(headingText) {
        // Create a simple ID from the heading text
        return headingText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    saveCollapsedState() {
        const collapsedSections = [];
        document.querySelectorAll('.collapsible-content.collapsed').forEach(section => {
            const id = section.getAttribute('data-section-id');
            if (id) collapsedSections.push(id);
        });
        localStorage.setItem('collapsedSections', JSON.stringify(collapsedSections));
    }

    restoreCollapsedState() {
        const saved = localStorage.getItem('collapsedSections');
        if (!saved) return;

        try {
            const collapsedSections = JSON.parse(saved);
            collapsedSections.forEach(id => {
                const section = document.querySelector(`.collapsible-content[data-section-id="${id}"]`);
                if (section) {
                    const heading = section.previousElementSibling;
                    const button = heading?.querySelector('.collapse-toggle');
                    if (heading && button) {
                        section.classList.add('collapsed');
                        heading.classList.add('collapsed');
                        button.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        } catch (e) {
            console.error('Error restoring collapsed state:', e);
        }
    }
}

// Initialize
new CollapsibleSections();