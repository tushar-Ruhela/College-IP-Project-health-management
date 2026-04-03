// Quick script to check if Ultravox tools are configured correctly
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const WEBHOOK_URL = process.env.API_BASE_URL || process.env.SERVER_URL || process.env.WEBHOOK_URL_CLOUDFLARE;

console.log('\n🔍 Checking Ultravox Tools Configuration...\n');
console.log('Environment Variables:');
console.log('  API_BASE_URL:', process.env.API_BASE_URL || '❌ Not set');
console.log('  SERVER_URL:', process.env.SERVER_URL || '❌ Not set');
console.log('  WEBHOOK_URL_CLOUDFLARE:', process.env.WEBHOOK_URL_CLOUDFLARE || '❌ Not set');
console.log('\n📋 Resolved WEBHOOK_URL:', WEBHOOK_URL || '❌ Not set');

if (!WEBHOOK_URL) {
  console.log('\n❌ ERROR: No WEBHOOK_URL configured!');
  console.log('   Tools will be skipped.');
  console.log('\n💡 Fix: Set one of these environment variables:');
  console.log('   - API_BASE_URL=https://your-url.com');
  console.log('   - SERVER_URL=https://your-url.com');
  console.log('   - WEBHOOK_URL_CLOUDFLARE=https://your-url.com');
  process.exit(1);
}

if (!WEBHOOK_URL.startsWith('https://')) {
  console.log('\n❌ ERROR: WEBHOOK_URL must be HTTPS!');
  console.log('   Current:', WEBHOOK_URL);
  console.log('   Ultravox requires HTTPS for security.');
  console.log('\n💡 Fix: Use HTTPS URL (e.g., ngrok, deployed server)');
  process.exit(1);
}

console.log('\n✅ Configuration looks good!');
console.log('   Tools should work correctly.');
console.log('\n📝 Tool endpoints that will be available:');
console.log(`   - ${WEBHOOK_URL}/api/ultravox/tools/chat`);
console.log(`   - ${WEBHOOK_URL}/api/ultravox/tools/book-appointment`);
console.log(`   - ${WEBHOOK_URL}/api/ultravox/tools/get-available-slots`);
console.log(`   - ${WEBHOOK_URL}/api/ultravox/tools/get-patient-profile`);
console.log('\n');

