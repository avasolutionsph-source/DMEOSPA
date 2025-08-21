// Render deployment wrapper for marketing website
import { fileURLToPath } from 'url';
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
try {
  await import('./server.js');
  console.log('✅ Marketing website server loaded successfully');
} catch (error) {
  console.error('❌ Failed to load marketing website server:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}