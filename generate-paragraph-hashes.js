#!/usr/bin/env node

/**
 * Generate paragraph-hashes.json from content.md
 * Run this when content.md changes to update the hash list
 */

const fs = require('fs');
const path = require('path');

// Same hash function as notes.js
function hashContent(text) {
    // Normalize text: trim, lowercase, collapse whitespace
    const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
    // Use first 200 chars for hash to balance stability with uniqueness
    const content = normalized.substring(0, 200);

    // Simple but effective hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to positive hex string
    return Math.abs(hash).toString(36);
}

// Parse content.md and extract paragraph text
function extractParagraphs(contentMd) {
    const lines = contentMd.split('\n');
    const paragraphs = [];
    let inCodeBlock = false;

    for (const line of lines) {
        // Toggle code block state
        if (line.trim().startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            continue;
        }

        // Skip if in code block
        if (inCodeBlock) continue;

        // Skip empty lines, headers, and special markers
        if (line.trim() === '' ||
            line.startsWith('#') ||
            line.startsWith('---') ||
            line.startsWith('<!--')) {
            continue;
        }

        // This is a paragraph
        paragraphs.push(line.trim());
    }

    return paragraphs;
}

// Main execution
function main() {
    const contentPath = path.join(__dirname, 'content.md');
    const outputPath = path.join(__dirname, 'paragraph-hashes.json');

    // Read content.md
    if (!fs.existsSync(contentPath)) {
        console.error('Error: content.md not found');
        process.exit(1);
    }

    const contentMd = fs.readFileSync(contentPath, 'utf-8');

    // Extract paragraphs
    const paragraphs = extractParagraphs(contentMd);

    // Generate hashes
    const hashes = paragraphs.map(p => hashContent(p));

    // Create output with metadata
    const output = {
        version: 1,
        generatedAt: new Date().toISOString(),
        paragraphCount: hashes.length,
        hashes: hashes
    };

    // Write to file
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`✓ Generated paragraph-hashes.json`);
    console.log(`  Paragraphs: ${hashes.length}`);
    console.log(`  Output: ${outputPath}`);
}

main();
