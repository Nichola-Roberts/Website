const fs = require('fs');
const path = require('path');

// Client-side JS files to concatenate (in order of dependency)
const jsFiles = [
    'scripts.js',
    'view-mode.js',
    'reading-time.js',
    'navigation.js',
    'time-tracking.js',
    'navigation-menu.js',
    'help-modal.js',
    'notes.js',
    'transfer-system.js',
    'transfer-modal.js',
    'accessibility-info-modal.js',
    'notes-info-modal.js',
    'mailing-list.js'
];

const isProduction = process.argv.includes('--prod');
const outputDir = 'dist';
const outputFile = path.join(outputDir, 'bundle.js');

console.log(`Building for ${isProduction ? 'production' : 'development'}...`);

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Read and concatenate all JS files
let combinedJS = '';

// Add header comment
combinedJS += `/* Energy Landscape Theory - Bundled JavaScript */\n`;
combinedJS += `/* Built: ${new Date().toISOString()} */\n\n`;

jsFiles.forEach((file, index) => {
    try {
        const filePath = path.join(__dirname, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        combinedJS += `/* === ${file} === */\n`;
        combinedJS += content;
        combinedJS += '\n\n';
        
        console.log(`✓ Added ${file}`);
    } catch (error) {
        console.warn(`⚠ Warning: Could not read ${file}: ${error.message}`);
    }
});

// Simple minification for production (remove comments and extra whitespace)
if (isProduction) {
    console.log('Minifying...');
    combinedJS = combinedJS
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .replace(/\/\/.*$/gm, '') // Remove line comments
        .replace(/\n\s*\n/g, '\n') // Remove empty lines
        .replace(/^\s+/gm, '') // Remove leading whitespace
        .replace(/\s+$/gm, ''); // Remove trailing whitespace
}

// Write the bundled file
fs.writeFileSync(outputFile, combinedJS);

console.log(`✓ Bundle created: ${outputFile}`);
console.log(`✓ Size: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB`);

// Copy assets and create production HTML
if (isProduction) {
    console.log('Copying assets...');
    
    // Copy CSS
    const stylesPath = 'styles.css';
    if (fs.existsSync(stylesPath)) {
        fs.copyFileSync(stylesPath, path.join(outputDir, 'styles.css'));
        console.log('✓ Copied styles.css');
    }
    
    // Copy markdown files
    const mdFiles = ['content.md', 'guide.md'];
    mdFiles.forEach(file => {
        if (fs.existsSync(file)) {
            fs.copyFileSync(file, path.join(outputDir, file));
            console.log(`✓ Copied ${file}`);
        }
    });
    
    // Copy images directory
    const imagesDir = 'images';
    const distImagesDir = path.join(outputDir, 'images');
    if (fs.existsSync(imagesDir)) {
        if (!fs.existsSync(distImagesDir)) {
            fs.mkdirSync(distImagesDir);
        }
        const imageFiles = fs.readdirSync(imagesDir);
        imageFiles.forEach(file => {
            fs.copyFileSync(
                path.join(imagesDir, file), 
                path.join(distImagesDir, file)
            );
        });
        console.log(`✓ Copied ${imageFiles.length} image(s)`);
    }
    
    // Create production HTML
    const indexPath = 'index.html';
    const prodIndexPath = path.join(outputDir, 'index.html');
    
    let htmlContent = fs.readFileSync(indexPath, 'utf8');
    
    // Remove individual script tags and replace with bundle
    const scriptRegex = /<script src="(scripts\.js|view-mode\.js|reading-time\.js|navigation\.js|time-tracking\.js|navigation-menu\.js|help-modal\.js|notes\.js|transfer-system\.js|transfer-modal\.js|accessibility-info-modal\.js|notes-info-modal\.js|mailing-list\.js)"><\/script>/g;
    
    htmlContent = htmlContent.replace(scriptRegex, '');
    
    // Add the bundle script before closing body tag
    htmlContent = htmlContent.replace(
        '</body>',
        '    <script src="bundle.js"></script>\n</body>'
    );
    
    fs.writeFileSync(prodIndexPath, htmlContent);
    console.log(`✓ Production HTML created: ${prodIndexPath}`);
}

console.log('\nBuild complete!');