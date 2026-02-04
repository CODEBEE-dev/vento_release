/**
 * Vento E2E Test Runner
 *
 * This file loads environment variables and can be used as entry point.
 * Tests are executed via: yarn test
 *
 * Prerequisites:
 * - Vento must be running (yarn start or yarn dev)
 * - .env must exist with TOKEN_SECRET
 */

require('dotenv').config();

const { BASE_URL } = require('./utils/api');

console.log('');
console.log('='.repeat(50));
console.log('  Vento E2E Tests');
console.log('='.repeat(50));
console.log(`  Target: ${BASE_URL}`);
console.log(`  Token Secret: ${process.env.TOKEN_SECRET ? 'OK' : 'MISSING!'}`);
console.log('='.repeat(50));
console.log('');

if (!process.env.TOKEN_SECRET) {
    console.error('ERROR: TOKEN_SECRET not found in .env');
    console.error('Make sure Vento has been started at least once.');
    process.exit(1);
}
