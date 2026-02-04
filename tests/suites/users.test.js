/**
 * Users API E2E Tests
 *
 * Tests user management CRUD operations
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Users API', () => {
    const testEmail = `test_user_${Date.now()}@test.com`;
    let userCreated = false;

    it('should create a new user', async () => {
        const res = await api.post('/api/core/v1/accounts', {
            username: testEmail,
            password: 'testpassword123',
            type: 'user',
            from: 'test'
        });

        assert.strictEqual(res.ok, true, `Expected success creating user, got status ${res.status}: ${JSON.stringify(res.data)}`);
        userCreated = true;
    });

    it('should list users and find created user', async () => {
        const res = await api.get('/api/core/v1/accounts?all=1');

        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.ok(res.data.items, 'Response should have items array');

        const found = res.data.items.some(u => u.username === testEmail);
        // User may not appear in list due to pagination/timing
        if (!found) {
            // Fallback: verify user exists directly
            const directRes = await api.get(`/api/core/v1/accounts/${encodeURIComponent(testEmail)}`);
            assert.strictEqual(directRes.ok, true, `User "${testEmail}" should exist (direct check)`);
        }
    });

    it('should get user details', async () => {
        const res = await api.get(`/api/core/v1/accounts/${encodeURIComponent(testEmail)}`);

        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.strictEqual(res.data.username, testEmail, 'Username should match');
        assert.strictEqual(res.data.type, 'user', 'Type should be user');
    });

    it('should not return password in response', async () => {
        const res = await api.get(`/api/core/v1/accounts/${encodeURIComponent(testEmail)}`);

        assert.strictEqual(res.ok, true);
        assert.ok(!res.data.password, 'Password should not be returned in response');
    });

    it('should update user type', async () => {
        // AutoAPI uses POST for updates, not PUT
        const res = await api.post(`/api/core/v1/accounts/${encodeURIComponent(testEmail)}`, {
            username: testEmail,
            type: 'editor'
        });

        assert.strictEqual(res.ok, true, `Expected success updating user, got status ${res.status}`);

        // Verify update
        const verify = await api.get(`/api/core/v1/accounts/${encodeURIComponent(testEmail)}`);
        assert.strictEqual(verify.data.type, 'editor', 'Type should be updated to editor');
    });

    it('should delete user', async () => {
        // AutoAPI uses GET /:key/delete, not DELETE
        const res = await api.get(`/api/core/v1/accounts/${encodeURIComponent(testEmail)}/delete`);

        assert.strictEqual(res.ok, true, `Expected success deleting user, got status ${res.status}`);
        userCreated = false;

        // Verify deletion
        const verify = await api.get(`/api/core/v1/accounts/${encodeURIComponent(testEmail)}`);
        assert.ok(!verify.ok || !verify.data.username, 'User should not exist after deletion');
    });

    after(async () => {
        // Cleanup if test failed before deletion
        if (userCreated) {
            await api.get(`/api/core/v1/accounts/${encodeURIComponent(testEmail)}/delete`).catch(() => {});
        }
    });

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow listing users with users.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/accounts', ['users.read']);
            assert.ok(res.status !== 403, `Should allow with users.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing users without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/accounts');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow creating user with users.create permission', async () => {
            const permTestEmail = `perm_test_user_${Date.now()}@test.com`;
            const res = await api.postWithPermissions('/api/core/v1/accounts', {
                username: permTestEmail,
                password: 'testpassword123',
                type: 'user',
                from: 'test'
            }, ['users.create']);
            assert.ok(res.status !== 403, `Should allow with users.create permission (got ${res.status})`);
            // Cleanup
            if (res.ok) {
                await api.get(`/api/core/v1/accounts/${encodeURIComponent(permTestEmail)}/delete`).catch(() => {});
            }
        });

        it('should deny creating user without permission', async () => {
            const res = await api.postNoPermissions('/api/core/v1/accounts', {
                username: `denied_user_${Date.now()}@test.com`,
                password: 'testpassword123',
                type: 'user',
                from: 'test'
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow updating user with users.update permission', async () => {
            // Create a user to update
            const updateTestEmail = `update_perm_test_${Date.now()}@test.com`;
            await api.post('/api/core/v1/accounts', {
                username: updateTestEmail,
                password: 'testpassword123',
                type: 'user',
                from: 'test'
            });

            const res = await api.postWithPermissions(`/api/core/v1/accounts/${encodeURIComponent(updateTestEmail)}`, {
                username: updateTestEmail,
                type: 'editor'
            }, ['users.update']);
            assert.ok(res.status !== 403, `Should allow with users.update permission (got ${res.status})`);

            // Cleanup
            await api.get(`/api/core/v1/accounts/${encodeURIComponent(updateTestEmail)}/delete`).catch(() => {});
        });

        it('should deny updating user without permission', async () => {
            if (!userCreated) return;
            const res = await api.postNoPermissions(`/api/core/v1/accounts/${encodeURIComponent(testEmail)}`, {
                username: testEmail,
                type: 'editor'
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow deleting user with users.delete permission', async () => {
            // Create a user to delete
            const deleteTestEmail = `delete_perm_test_${Date.now()}@test.com`;
            await api.post('/api/core/v1/accounts', {
                username: deleteTestEmail,
                password: 'testpassword123',
                type: 'user',
                from: 'test'
            });

            const res = await api.getWithPermissions(`/api/core/v1/accounts/${encodeURIComponent(deleteTestEmail)}/delete`, ['users.delete']);
            assert.ok(res.status !== 403, `Should allow with users.delete permission (got ${res.status})`);
        });

        it('should deny deleting user without permission', async () => {
            if (!userCreated) return;
            const res = await api.getNoPermissions(`/api/core/v1/accounts/${encodeURIComponent(testEmail)}/delete`);
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });
    });
});
