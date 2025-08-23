#!/usr/bin/env node

/**
 * PWA Duplicate Scanner Tool
 * Automatically scans for design duplicates in CSS, HTML, and JS files
 * Usage: node tools/duplicate-scanner.js
 */

const fs = require('fs');
const path = require('path');

class DuplicateScanner {
    constructor() {
        this.duplicates = {
            css: [],
            js: [],
            html: []
        };
        this.scannedFiles = [];
    }

    // Scan CSS for duplicates
    scanCSS(filePath) {
        console.log(`Scanning CSS: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        const selectors = new Map();
        const keyframes = new Map();
        let currentSelector = '';
        let lineNumber = 0;

        for (const line of lines) {
            lineNumber++;
            const trimmed = line.trim();
            
            // Check for CSS selectors
            if (trimmed.match(/^[.#]?[\w-]+\s*\{/) || trimmed.match(/^@media/)) {
                currentSelector = trimmed.replace(/\s*\{.*/, '');
                if (selectors.has(currentSelector)) {
                    this.duplicates.css.push({
                        type: 'CSS Selector',
                        selector: currentSelector,
                        file: filePath,
                        lines: [selectors.get(currentSelector), lineNumber],
                        severity: 'HIGH'
                    });
                } else {
                    selectors.set(currentSelector, lineNumber);
                }
            }
            
            // Check for keyframe animations
            if (trimmed.startsWith('@keyframes')) {
                const keyframeName = trimmed.replace('@keyframes', '').replace('{', '').trim();
                if (keyframes.has(keyframeName)) {
                    this.duplicates.css.push({
                        type: 'Keyframe Animation',
                        selector: keyframeName,
                        file: filePath,
                        lines: [keyframes.get(keyframeName), lineNumber],
                        severity: 'MEDIUM'
                    });
                } else {
                    keyframes.set(keyframeName, lineNumber);
                }
            }
        }
    }

    // Scan JavaScript for duplicates
    scanJS(filePath) {
        console.log(`Scanning JS: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        const functions = new Map();
        let lineNumber = 0;

        for (const line of lines) {
            lineNumber++;
            const trimmed = line.trim();
            
            // Check for function definitions
            const functionMatch = trimmed.match(/^function\s+(\w+)\s*\(/);
            if (functionMatch) {
                const functionName = functionMatch[1];
                if (functions.has(functionName)) {
                    this.duplicates.js.push({
                        type: 'Function Definition',
                        name: functionName,
                        file: filePath,
                        lines: [functions.get(functionName), lineNumber],
                        severity: 'HIGH'
                    });
                } else {
                    functions.set(functionName, lineNumber);
                }
            }
        }
    }

    // Scan HTML for duplicates
    scanHTML(filePath) {
        console.log(`Scanning HTML: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        const ids = new Map();
        let lineNumber = 0;

        for (const line of lines) {
            lineNumber++;
            const idMatch = line.match(/id\s*=\s*["']([^"']+)["']/g);
            if (idMatch) {
                idMatch.forEach(match => {
                    const id = match.replace(/id\s*=\s*["']([^"']+)["']/, '$1');
                    if (ids.has(id)) {
                        this.duplicates.html.push({
                            type: 'HTML ID',
                            id: id,
                            file: filePath,
                            lines: [ids.get(id), lineNumber],
                            severity: 'CRITICAL'
                        });
                    } else {
                        ids.set(id, lineNumber);
                    }
                });
            }
        }
    }

    // Scan directory recursively
    scanDirectory(dirPath, extensions) {
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                this.scanDirectory(filePath, extensions);
            } else if (stat.isFile()) {
                const ext = path.extname(file);
                if (extensions.includes(ext)) {
                    this.scannedFiles.push(filePath);
                    
                    switch (ext) {
                        case '.css':
                            this.scanCSS(filePath);
                            break;
                        case '.js':
                            this.scanJS(filePath);
                            break;
                        case '.html':
                            this.scanHTML(filePath);
                            break;
                    }
                }
            }
        }
    }

    // Generate report
    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('PWA DUPLICATE SCANNER REPORT');
        console.log('='.repeat(60));
        
        console.log(`\nFiles Scanned: ${this.scannedFiles.length}`);
        
        const totalDuplicates = this.duplicates.css.length + this.duplicates.js.length + this.duplicates.html.length;
        console.log(`Total Duplicates Found: ${totalDuplicates}\n`);

        // CSS Duplicates
        if (this.duplicates.css.length > 0) {
            console.log('🎨 CSS DUPLICATES:');
            this.duplicates.css.forEach(dup => {
                console.log(`  [${dup.severity}] ${dup.type}: "${dup.selector}"`);
                console.log(`    File: ${dup.file}`);
                console.log(`    Lines: ${dup.lines.join(', ')}\n`);
            });
        }

        // JavaScript Duplicates
        if (this.duplicates.js.length > 0) {
            console.log('📜 JAVASCRIPT DUPLICATES:');
            this.duplicates.js.forEach(dup => {
                console.log(`  [${dup.severity}] ${dup.type}: "${dup.name}"`);
                console.log(`    File: ${dup.file}`);
                console.log(`    Lines: ${dup.lines.join(', ')}\n`);
            });
        }

        // HTML Duplicates
        if (this.duplicates.html.length > 0) {
            console.log('🌐 HTML DUPLICATES:');
            this.duplicates.html.forEach(dup => {
                console.log(`  [${dup.severity}] ${dup.type}: "${dup.id}"`);
                console.log(`    File: ${dup.file}`);
                console.log(`    Lines: ${dup.lines.join(', ')}\n`);
            });
        }

        if (totalDuplicates === 0) {
            console.log('✅ No duplicates found! Your codebase is clean.');
        } else {
            console.log(`⚠️  Found ${totalDuplicates} duplicates that should be reviewed.`);
        }

        // Save report to file
        const reportPath = 'tools/duplicate-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(this.duplicates, null, 2));
        console.log(`\nDetailed report saved to: ${reportPath}`);
    }

    // Run the scanner
    run() {
        console.log('Starting PWA Duplicate Scanner...\n');
        
        // Create tools directory if it doesn't exist
        if (!fs.existsSync('tools')) {
            fs.mkdirSync('tools');
        }

        // Scan the project
        this.scanDirectory('.', ['.css', '.js', '.html']);
        
        // Generate report
        this.generateReport();
    }
}

// Run if called directly
if (require.main === module) {
    const scanner = new DuplicateScanner();
    scanner.run();
}

module.exports = DuplicateScanner;