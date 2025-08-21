// Simple syntax checker for HTML files
const fs = require('fs');
const path = require('path');

function checkHTMLFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const issues = [];
    
    // Check for unclosed strings in JavaScript
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    
    while ((match = scriptRegex.exec(content)) !== null) {
        const scriptContent = match[1];
        const lines = scriptContent.split('\n');
        
        lines.forEach((line, index) => {
            // Check for unclosed strings
            const singleQuotes = (line.match(/'/g) || []).length;
            const doubleQuotes = (line.match(/"/g) || []).length;
            
            // Skip escaped quotes
            const escapedSingle = (line.match(/\\'/g) || []).length;
            const escapedDouble = (line.match(/\\"/g) || []).length;
            
            const realSingle = singleQuotes - escapedSingle;
            const realDouble = doubleQuotes - escapedDouble;
            
            if (realSingle % 2 !== 0 && !line.includes('//') && !line.includes('/*')) {
                issues.push(`${fileName}: Possible unclosed single quote in script at line ~${index}`);
            }
            if (realDouble % 2 !== 0 && !line.includes('//') && !line.includes('/*')) {
                issues.push(`${fileName}: Possible unclosed double quote in script at line ~${index}`);
            }
        });
    }
    
    return issues;
}

// Check all HTML files
const publicDir = path.join(__dirname, 'public');
const htmlFiles = fs.readdirSync(publicDir)
    .filter(file => file.endsWith('.html'))
    .map(file => path.join(publicDir, file));

console.log('Checking HTML files for syntax issues...\n');

let totalIssues = 0;
htmlFiles.forEach(file => {
    const issues = checkHTMLFile(file);
    if (issues.length > 0) {
        console.log(`Issues in ${path.basename(file)}:`);
        issues.forEach(issue => console.log(`  - ${issue}`));
        totalIssues += issues.length;
    }
});

if (totalIssues === 0) {
    console.log('✅ No syntax issues found!');
} else {
    console.log(`\n⚠️ Found ${totalIssues} potential issues`);
}