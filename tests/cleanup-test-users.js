/**
 * Cleanup script for test users left behind by tests
 *
 * Run with: node tests/cleanup-test-users.js
 */

const api = require('./utils/api');

const TEST_USER_PATTERNS = [
    /^test_/,
    /^perm_test_/,
    /^update_perm_test_/,
    /^delete_perm_test_/,
    /^denied_user_/,
    /^nonexistent_user_/
];

async function cleanupTestUsers() {
    console.log('Fetching all users...');

    const res = await api.get('/api/core/v1/accounts?all=1&itemsPerPage=1000');

    if (!res.ok) {
        console.error('Failed to fetch users:', res.status, res.data);
        process.exit(1);
    }

    const users = res.data?.items || res.data || [];
    console.log(`Found ${users.length} total users`);

    const testUsers = users.filter(user => {
        const username = user.username || user.id || '';
        return TEST_USER_PATTERNS.some(pattern => pattern.test(username));
    });

    console.log(`Found ${testUsers.length} test users to clean up:`);

    if (testUsers.length === 0) {
        console.log('No test users to clean up.');
        process.exit(0);
    }

    for (const user of testUsers) {
        const username = user.username || user.id;
        console.log(`  - ${username}`);
    }

    console.log('\nDeleting test users...');

    let deleted = 0;
    let failed = 0;

    for (const user of testUsers) {
        const username = user.username || user.id;
        try {
            const deleteRes = await api.get(`/api/core/v1/accounts/${encodeURIComponent(username)}/delete`);
            if (deleteRes.ok) {
                console.log(`  ✓ Deleted: ${username}`);
                deleted++;
            } else {
                console.log(`  ✗ Failed to delete ${username}: ${deleteRes.status}`);
                failed++;
            }
        } catch (e) {
            console.log(`  ✗ Error deleting ${username}: ${e.message}`);
            failed++;
        }
    }

    console.log(`\nCleanup complete: ${deleted} deleted, ${failed} failed`);
}

cleanupTestUsers().catch(console.error);
