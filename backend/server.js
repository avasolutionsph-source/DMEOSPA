// Render deployment wrapper for marketing website
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting Ava Solutions Backend Wrapper...');
console.log('📁 Backend directory:', __dirname);
console.log('🎯 Marketing website path:', join(__dirname, '../marketing-website'));

// Change to marketing-website directory
process.chdir(join(__dirname, '../marketing-website'));

console.log('📂 Changed working directory to:', process.cwd());
console.log('🔄 Loading marketing website server...');

// Now import and run the marketing website server
(async () => {
  try {
    const serverPath = pathToFileURL(join(__dirname, '../marketing-website/server.js')).href;
    await import(serverPath);
    console.log('✅ Marketing website server loaded successfully');
    // Keep the process alive
    process.on('SIGTERM', () => {
      console.log('⚠️  SIGTERM received, shutting down gracefully...');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Failed to load marketing website server:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();