// Render deployment wrapper for marketing website
// This file exists to satisfy Render's expected directory structure
// It simply imports and runs the actual marketing website server

console.log('🚀 Starting Ava Solutions Marketing Website Backend...');
console.log('📁 Running from /backend wrapper');
console.log('🎯 Actual server: ../marketing-website/server.js');

// Change working directory to marketing-website for proper file resolution
process.chdir('../marketing-website');

// Import and run the actual marketing website server
import('../marketing-website/server.js')
  .then(() => {
    console.log('✅ Marketing website server loaded successfully');
  })
  .catch((error) => {
    console.error('❌ Failed to load marketing website server:', error);
    process.exit(1);
  });