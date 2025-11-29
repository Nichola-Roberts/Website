#!/usr/bin/env node

/**
 * Generate paragraph-hashes.json from part1.html, part2.html, part3.html
 * Run this when content changes to update the hash list
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

// Extract text content from HTML, stripping tags
function stripHtmlTags(html) {
    // Remove HTML tags and decode common entities
    return html
        .replace(/<[^>]*>/g, '') // Remove tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

// Extract paragraphs from HTML file
function extractParagraphsFromHtml(html) {
    const paragraphs = [];

    // Match all <p>...</p> tags (including multiline)
    const pTagRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let match;

    while ((match = pTagRegex.exec(html)) !== null) {
        const textContent = stripHtmlTags(match[1]);
        if (textContent.trim().length > 0) {
            paragraphs.push(textContent);
        }
    }

    return paragraphs;
}

// Main execution
function main() {
    const partFiles = ['part1.html', 'part2.html', 'part3.html'];
    const outputPath = path.join(__dirname, 'paragraph-hashes.json');

    const allParagraphs = [];

    // Process each part file
    for (const partFile of partFiles) {
        const partPath = path.join(__dirname, partFile);

        if (!fs.existsSync(partPath)) {
            console.error(`Warning: ${partFile} not found, skipping`);
            continue;
        }

        const html = fs.readFileSync(partPath, 'utf-8');
        const paragraphs = extractParagraphsFromHtml(html);

        console.log(`  ${partFile}: ${paragraphs.length} paragraphs`);
        allParagraphs.push(...paragraphs);
    }

    if (allParagraphs.length === 0) {
        console.error('Error: No paragraphs found in any part files');
        process.exit(1);
    }

    // Generate hashes
    const hashes = allParagraphs.map(p => hashContent(p));

    // Create output with metadata
    const output = {
        version: 2, // Increment version for HTML-based format
        generatedAt: new Date().toISOString(),
        paragraphCount: hashes.length,
        sourceFiles: partFiles,
        hashes: hashes
    };

    // Write to file
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`✓ Generated paragraph-hashes.json`);
    console.log(`  Total paragraphs: ${hashes.length}`);
    console.log(`  Output: ${outputPath}`);
}

main();
