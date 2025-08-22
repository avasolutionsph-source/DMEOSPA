#!/usr/bin/env node

/**
 * Integration Test Runner for PWA Unified Backend
 * Run this script to verify all connections and integrations
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Test configuration
const config = {
    production: {
        baseUrl: 'https://ava-pwa-backend.onrender.com',
        wsUrl: 'wss://ava-pwa-backend.onrender.com'
    },
    development: {
        baseUrl: 'http://localhost:4000',
        wsUrl: 'ws://localhost:4000'
    }
};

// Determine environment
const isProduction = process.env.NODE_ENV === 'production' || !process.argv.includes('--dev');
const testConfig = isProduction ? config.production : config.development;

console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.bright}  PWA Integration Test - Unified Backend${colors.reset}`);
console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.blue}Environment:${colors.reset} ${isProduction ? 'Production' : 'Development'}`);
console.log(`${colors.blue}Backend URL:${colors.reset} ${testConfig.baseUrl}`);
console.log(`${colors.blue}WebSocket URL:${colors.reset} ${testConfig.wsUrl}`);
console.log(`${colors.cyan}───────────────────────────────────────────────────${colors.reset}\n`);

// Test results storage
const testResults = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
};

// Helper functions
function logTest(name, status, message = '') {
    const statusSymbol = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    const statusColor = status === 'pass' ? colors.green : status === 'fail' ? colors.red : colors.yellow;
    
    console.log(`${statusSymbol} ${statusColor}${name}${colors.reset} ${message ? `- ${message}` : ''}`);
    
    testResults.tests.push({ name, status, message });
    if (status === 'pass') testResults.passed++;
    else if (status === 'fail') testResults.failed++;
    else testResults.warnings++;
}

function logSection(title) {
    console.log(`\n${colors.bright}${title}${colors.reset}`);
    console.log(`${colors.cyan}${'─'.repeat(50)}${colors.reset}`);
}

// Test functions
async function testBackendConnection() {
    return new Promise((resolve) => {
        const url = new URL(testConfig.baseUrl + '/api/health');
        const client = url.protocol === 'https:' ? https : http;
        
        const startTime = Date.now();
        
        client.get(url.toString(), (res) => {
            const responseTime = Date.now() - startTime;
            
            if (res.statusCode === 200 || res.statusCode === 404) {
                logTest('Backend Connection', 'pass', `Response time: ${responseTime}ms`);
                resolve(true);
            } else {
                logTest('Backend Connection', 'fail', `HTTP ${res.statusCode}`);
                resolve(false);
            }
        }).on('error', (err) => {
            logTest('Backend Connection', 'fail', err.message);
            resolve(false);
        });
    });
}

async function testFileStructure() {
    logSection('📁 File Structure Tests');
    
    const requiredFiles = [
        'js/api-config.js',
        'js/sync.js',
        'js/state-sync.js',
        'js/state-manager.js',
        'js/auth.js',
        'service-worker.js',
        'index.html'
    ];
    
    let allFilesExist = true;
    
    requiredFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            logTest(`File: ${file}`, 'pass');
        } else {
            logTest(`File: ${file}`, 'fail', 'File not found');
            allFilesExist = false;
        }
    });
    
    return allFilesExist;
}

async function testAPIConfiguration() {
    logSection('⚙️ API Configuration Tests');
    
    const configPath = path.join(__dirname, 'js/api-config.js');
    
    if (!fs.existsSync(configPath)) {
        logTest('API Config File', 'fail', 'api-config.js not found');
        return false;
    }
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Check for required configurations
    const checks = [
        { pattern: /BASE_URL/, name: 'BASE_URL configuration' },
        { pattern: /WS_URL/, name: 'WebSocket URL configuration' },
        { pattern: /ENDPOINTS/, name: 'API endpoints definition' },
        { pattern: /getAuthHeader/, name: 'Auth header method' },
        { pattern: /initWebSocket/, name: 'WebSocket initialization' }
    ];
    
    let allChecksPass = true;
    
    checks.forEach(check => {
        if (check.pattern.test(configContent)) {
            logTest(check.name, 'pass');
        } else {
            logTest(check.name, 'fail', 'Not found in configuration');
            allChecksPass = false;
        }
    });
    
    return allChecksPass;
}

async function testServiceWorker() {
    logSection('📦 Service Worker Tests');
    
    const swPath = path.join(__dirname, 'service-worker.js');
    
    if (!fs.existsSync(swPath)) {
        logTest('Service Worker File', 'fail', 'service-worker.js not found');
        return false;
    }
    
    const swContent = fs.readFileSync(swPath, 'utf8');
    
    // Check for v1.7.0 cache
    if (swContent.includes("'ava-solutions-v1.7.0'")) {
        logTest('Cache Version v1.7.0', 'pass');
    } else {
        logTest('Cache Version v1.7.0', 'fail', 'Not updated to v1.7.0');
        return false;
    }
    
    // Check for new cached files
    const requiredCacheFiles = [
        'api-config.js',
        'state-manager.js',
        'state-ui-binding.js',
        'state-helpers.js'
    ];
    
    let allCached = true;
    requiredCacheFiles.forEach(file => {
        if (swContent.includes(file)) {
            logTest(`Cache includes ${file}`, 'pass');
        } else {
            logTest(`Cache includes ${file}`, 'fail');
            allCached = false;
        }
    });
    
    // Check for unified backend handling
    if (swContent.includes('ava-pwa-backend.onrender.com')) {
        logTest('Unified backend URL in SW', 'pass');
    } else {
        logTest('Unified backend URL in SW', 'warning', 'Not found - may use dynamic config');
    }
    
    return allCached;
}

async function testStateSync() {
    logSection('🔄 State Sync Integration Tests');
    
    const stateSyncPath = path.join(__dirname, 'js/state-sync.js');
    
    if (!fs.existsSync(stateSyncPath)) {
        logTest('StateSync File', 'fail', 'state-sync.js not found');
        return false;
    }
    
    const content = fs.readFileSync(stateSyncPath, 'utf8');
    
    // Check for WebSocket event handlers
    const socketEvents = [
        'authenticated',
        'state:update',
        'business:changed',
        'inventory:updated',
        'transactions:new',
        'sync:conflict'
    ];
    
    let allEventsHandled = true;
    socketEvents.forEach(event => {
        if (content.includes(`'${event}'`)) {
            logTest(`Socket event: ${event}`, 'pass');
        } else {
            logTest(`Socket event: ${event}`, 'fail');
            allEventsHandled = false;
        }
    });
    
    return allEventsHandled;
}

async function testIndexHTML() {
    logSection('📄 Index.html Integration Tests');
    
    const indexPath = path.join(__dirname, 'index.html');
    
    if (!fs.existsSync(indexPath)) {
        logTest('Index.html File', 'fail', 'index.html not found');
        return false;
    }
    
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Check for required script includes
    const requiredScripts = [
        { file: 'api-config.js', name: 'API Configuration' },
        { file: 'socket.io.min.js', name: 'Socket.IO CDN' },
        { file: 'state-sync.js', name: 'State Sync Module' }
    ];
    
    let allScriptsIncluded = true;
    requiredScripts.forEach(script => {
        if (content.includes(script.file)) {
            logTest(`Script: ${script.name}`, 'pass');
        } else {
            logTest(`Script: ${script.name}`, 'fail', 'Not included in index.html');
            allScriptsIncluded = false;
        }
    });
    
    return allScriptsIncluded;
}

// Main test runner
async function runTests() {
    console.log(`${colors.bright}Starting Integration Tests...${colors.reset}\n`);
    
    // Test backend connection first
    logSection('🌐 Backend Connection Test');
    const backendConnected = await testBackendConnection();
    
    if (!backendConnected && isProduction) {
        console.log(`\n${colors.yellow}⚠️  Warning: Cannot connect to production backend${colors.reset}`);
        console.log(`   The backend might be sleeping or not deployed yet.`);
        console.log(`   Continuing with local file tests...\n`);
    }
    
    // Run file structure tests
    await testFileStructure();
    
    // Run configuration tests
    await testAPIConfiguration();
    
    // Run service worker tests
    await testServiceWorker();
    
    // Run state sync tests
    await testStateSync();
    
    // Run index.html tests
    await testIndexHTML();
    
    // Display summary
    console.log(`\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}  Test Summary${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}  Passed:${colors.reset}   ${testResults.passed}`);
    console.log(`${colors.red}  Failed:${colors.reset}   ${testResults.failed}`);
    console.log(`${colors.yellow}  Warnings:${colors.reset} ${testResults.warnings}`);
    console.log(`${colors.cyan}───────────────────────────────────────────────────${colors.reset}`);
    
    const totalTests = testResults.passed + testResults.failed + testResults.warnings;
    const successRate = Math.round((testResults.passed / totalTests) * 100);
    
    if (testResults.failed === 0) {
        console.log(`\n${colors.green}✅ All critical tests passed! (${successRate}% success rate)${colors.reset}`);
        console.log(`${colors.bright}The PWA is ready for unified backend integration!${colors.reset}`);
    } else {
        console.log(`\n${colors.red}❌ Some tests failed (${successRate}% success rate)${colors.reset}`);
        console.log(`${colors.yellow}Please review the failed tests above.${colors.reset}`);
    }
    
    // Save test results to file
    const reportPath = path.join(__dirname, 'test-integration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`\n${colors.blue}📊 Detailed report saved to: test-integration-report.json${colors.reset}`);
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle command line arguments
if (process.argv.includes('--help')) {
    console.log(`
${colors.bright}Usage:${colors.reset}
  node test-integration.js [options]

${colors.bright}Options:${colors.reset}
  --dev     Test against local development backend (localhost:4000)
  --prod    Test against production backend (default)
  --help    Show this help message

${colors.bright}Examples:${colors.reset}
  node test-integration.js          # Test production
  node test-integration.js --dev    # Test development
`);
    process.exit(0);
}

// Run tests
runTests().catch(error => {
    console.error(`\n${colors.red}Fatal error during testing:${colors.reset}`, error);
    process.exit(1);
});