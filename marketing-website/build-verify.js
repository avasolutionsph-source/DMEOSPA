#!/usr/bin/env node

// Build verification script for Netlify deployment
import fs from 'fs';
import path from 'path';

const checkFile = (filePath, description) => {
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${description} exists: ${filePath}`);
        return true;
    } else {
        console.log(`❌ ${description} missing: ${filePath}`);
        return false;
    }
};

const checkDirectory = (dirPath, description) => {
    if (fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory()) {
        console.log(`✅ ${description} exists: ${dirPath}`);
        return true;
    } else {
        console.log(`❌ ${description} missing: ${dirPath}`);
        return false;
    }
};

console.log('🔍 Verifying build setup for marketing website...\n');

let allGood = true;

// Check public directory structure
allGood &= checkDirectory('public', 'Public directory');
allGood &= checkFile('public/index.html', 'Main index page');
allGood &= checkFile('public/_redirects', 'Netlify redirects');
allGood &= checkFile('public/_headers', 'Netlify headers');
allGood &= checkDirectory('public/assets', 'Assets directory');

// Check configuration files
allGood &= checkFile('netlify.toml', 'Netlify configuration');
allGood &= checkFile('package.json', 'Package.json');
allGood &= checkFile('.nvmrc', 'Node version file');

// Check key HTML files
const htmlFiles = [
    'about.html',
    'features.html', 
    'pricing.html',
    'contact.html',
    'login.html',
    'register.html',
    'business-dashboard.html',
    'download.html',
    '404.html'
];

htmlFiles.forEach(file => {
    allGood &= checkFile(`public/${file}`, `${file} page`);
});

// Check assets
const assetFiles = [
    'style.css',
    'main.js',
    'favicon.svg'
];

assetFiles.forEach(file => {
    allGood &= checkFile(`public/assets/${file}`, `Asset: ${file}`);
});

console.log('\n' + '='.repeat(50));

if (allGood) {
    console.log('🎉 Build verification passed! Ready for deployment.');
    process.exit(0);
} else {
    console.log('💥 Build verification failed! Check missing files above.');
    process.exit(1);
}
