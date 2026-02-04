/**
 * Keys API E2E Tests
 *
 * Tests for API keys/secrets management
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Keys API', () => {
    const testPrefix = `test_key_${Date.now()}`;
    const createdKeys = [];

    after(async () => {
        // Cleanup all created keys
        for (const keyName of createdKeys) {
            await api.get(`/api/core/v1/keys/${encodeURIComponent(keyName)}/delete`).catch(() => {});
        }
    });

    describe('CRUD Operations', () => {
        const testKeyName = `${testPrefix}_crud`;
        const testKeyValue = 'test-secret-value-12345';

        it('should create a new key', async () => {
            const res = await api.post('/api/core/v1/keys', {
                name: testKeyName,
                value: testKeyValue
            });

            assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}: ${JSON.stringify(res.data)}`);
            createdKeys.push(testKeyName);
        });

        it('should list all keys', async () => {
            const res = await api.get('/api/core/v1/keys');

            assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
            assert.ok(res.data.items, 'Response should have items array');
        });

        it('should find created key in list', async () => {
            const res = await api.get('/api/core/v1/keys');

            assert.strictEqual(res.ok, true);
            const found = res.data.items.some(k => k.name === testKeyName);
            assert.ok(found, `Key "${testKeyName}" should exist in list`);
        });

        it('should get specific key by name', async () => {
            const res = await api.get(`/api/core/v1/keys/${encodeURIComponent(testKeyName)}`);

            assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
            assert.strictEqual(res.data.name, testKeyName, 'Key name should match');
            // Admin should see full value
            assert.strictEqual(res.data.value, testKeyValue, 'Key value should match for admin');
        });

        it('should update existing key', async () => {
            const newValue = 'updated-secret-value-67890';
            const res = await api.post(`/api/core/v1/keys/${encodeURIComponent(testKeyName)}`, {
                name: testKeyName,
                value: newValue
            });

            assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);

            // Verify update
            const getRes = await api.get(`/api/core/v1/keys/${encodeURIComponent(testKeyName)}`);
            assert.strictEqual(getRes.data.value, newValue, 'Value should be updated');
        });

        it('should delete key', async () => {
            const res = await api.get(`/api/core/v1/keys/${encodeURIComponent(testKeyName)}/delete`);

            assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);

            // Remove from cleanup list since already deleted
            const idx = createdKeys.indexOf(testKeyName);
            if (idx > -1) createdKeys.splice(idx, 1);

            // Verify deletion
            const getRes = await api.get(`/api/core/v1/keys/${encodeURIComponent(testKeyName)}`);
            assert.strictEqual(getRes.ok, false, 'Deleted key should not be found');
        });
    });

    describe('All Keys Query', () => {
        it('should get all keys with ?all=1', async () => {
            // Create a few keys first
            const keys = [`${testPrefix}_all1`, `${testPrefix}_all2`];
            for (const name of keys) {
                await api.post('/api/core/v1/keys', { name, value: 'test' });
                createdKeys.push(name);
            }

            const res = await api.get('/api/core/v1/keys?all=1');

            assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
            // With all=1, should return items without pagination limits
            assert.ok(res.data.items, 'Response should have items');
        });
    });

    describe('Upsert Behavior', () => {
        it('should create key if not exists (upsert)', async () => {
            const keyName = `${testPrefix}_upsert`;

            // Try to update non-existent key via POST to /keys (create)
            const res = await api.post('/api/core/v1/keys', {
                name: keyName,
                value: 'upsert-value'
            });

            assert.strictEqual(res.ok, true, 'Should create key');
            createdKeys.push(keyName);
        });

        it('should update existing key via POST to /keys/:name', async () => {
            const keyName = `${testPrefix}_upsert2`;

            // Create first
            await api.post('/api/core/v1/keys', { name: keyName, value: 'initial' });
            createdKeys.push(keyName);

            // Update via specific endpoint
            const res = await api.post(`/api/core/v1/keys/${encodeURIComponent(keyName)}`, {
                name: keyName,
                value: 'updated'
            });

            assert.strictEqual(res.ok, true, 'Should update key');

            // Verify
            const getRes = await api.get(`/api/core/v1/keys/${encodeURIComponent(keyName)}`);
            assert.strictEqual(getRes.data.value, 'updated');
        });
    });

    describe('Edge Cases', () => {
        it('should return 404 for non-existent key', async () => {
            const res = await api.get('/api/core/v1/keys/definitely_not_exists_12345');

            assert.strictEqual(res.ok, false, 'Should not find non-existent key');
            assert.ok(res.status === 404 || res.status === 500, `Expected 404 or 500, got ${res.status}`);
        });

        it('should handle empty value', async () => {
            const keyName = `${testPrefix}_empty`;
            const res = await api.post('/api/core/v1/keys', {
                name: keyName,
                value: ''
            });

            // May succeed or fail depending on validation
            if (res.ok) {
                createdKeys.push(keyName);

                // Verify empty value is stored
                const getRes = await api.get(`/api/core/v1/keys/${encodeURIComponent(keyName)}`);
                assert.strictEqual(getRes.data.value, '', 'Empty value should be preserved');
            }
            assert.ok(res.status < 500, 'Should not cause server error');
        });

        it('should handle key name with dots', async () => {
            const keyName = `${testPrefix}.with.dots`;
            const res = await api.post('/api/core/v1/keys', {
                name: keyName,
                value: 'dotted-key-value'
            });

            if (res.ok) {
                createdKeys.push(keyName);

                // Verify retrieval with dots
                const getRes = await api.get(`/api/core/v1/keys/${encodeURIComponent(keyName)}`);
                assert.strictEqual(getRes.ok, true, 'Should retrieve key with dots');
            }
            assert.ok(res.status < 500, 'Should not cause server error');
        });

        it('should handle long value', async () => {
            const keyName = `${testPrefix}_long`;
            const longValue = 'x'.repeat(10000);

            const res = await api.post('/api/core/v1/keys', {
                name: keyName,
                value: longValue
            });

            if (res.ok) {
                createdKeys.push(keyName);

                // Verify long value preserved
                const getRes = await api.get(`/api/core/v1/keys/${encodeURIComponent(keyName)}`);
                assert.strictEqual(getRes.data.value.length, longValue.length, 'Long value should be preserved');
            }
            assert.ok(res.status < 500, 'Should not cause server error');
        });

        it('should handle special characters in value', async () => {
            const keyName = `${testPrefix}_special`;
            const specialValue = 'key=value&foo=bar\n\t"quoted"';

            const res = await api.post('/api/core/v1/keys', {
                name: keyName,
                value: specialValue
            });

            if (res.ok) {
                createdKeys.push(keyName);

                const getRes = await api.get(`/api/core/v1/keys/${encodeURIComponent(keyName)}`);
                assert.strictEqual(getRes.data.value, specialValue, 'Special characters should be preserved');
            }
            assert.ok(res.status < 500, 'Should not cause server error');
        });
    });

    describe('Authentication', () => {
        it('should require authentication to list keys', async () => {
            const res = await api.getNoAuth('/api/core/v1/keys');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });

        it('should require authentication to create key', async () => {
            const res = await api.postNoAuth('/api/core/v1/keys', {
                name: 'unauthorized_key',
                value: 'secret'
            });
            assert.strictEqual(res.status, 401, 'Should require auth');
        });

        it('should require authentication to get key', async () => {
            const res = await api.getNoAuth('/api/core/v1/keys/any_key');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });

        it('should require authentication to delete key', async () => {
            const res = await api.getNoAuth('/api/core/v1/keys/any_key/delete');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow listing keys with keys.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/keys', ['keys.read']);
            assert.ok(res.status !== 403, `Should allow with keys.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing keys without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/keys');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow creating key with keys.create permission', async () => {
            const permKeyName = `perm_test_key_${Date.now()}`;
            const res = await api.postWithPermissions('/api/core/v1/keys', {
                name: permKeyName,
                value: 'test-perm-value'
            }, ['keys.create']);
            assert.ok(res.status !== 403, `Should allow with keys.create permission (got ${res.status})`);
            // Cleanup
            if (res.ok) {
                await api.get(`/api/core/v1/keys/${encodeURIComponent(permKeyName)}/delete`).catch(() => {});
            }
        });

        it('should deny creating key without permission', async () => {
            const res = await api.postNoPermissions('/api/core/v1/keys', {
                name: `denied_key_${Date.now()}`,
                value: 'denied-value'
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow updating key with keys.update permission', async () => {
            // Create a key to update
            const updateKeyName = `update_perm_key_${Date.now()}`;
            await api.post('/api/core/v1/keys', {
                name: updateKeyName,
                value: 'original-value'
            });

            const res = await api.postWithPermissions(`/api/core/v1/keys/${encodeURIComponent(updateKeyName)}`, {
                name: updateKeyName,
                value: 'updated-value'
            }, ['keys.update']);
            assert.ok(res.status !== 403, `Should allow with keys.update permission (got ${res.status})`);

            // Cleanup
            await api.get(`/api/core/v1/keys/${encodeURIComponent(updateKeyName)}/delete`).catch(() => {});
        });

        it('should deny updating key without permission', async () => {
            // Create a key first
            const denyUpdateKeyName = `deny_update_key_${Date.now()}`;
            await api.post('/api/core/v1/keys', {
                name: denyUpdateKeyName,
                value: 'test-value'
            });

            const res = await api.postNoPermissions(`/api/core/v1/keys/${encodeURIComponent(denyUpdateKeyName)}`, {
                name: denyUpdateKeyName,
                value: 'unauthorized-update'
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);

            // Cleanup
            await api.get(`/api/core/v1/keys/${encodeURIComponent(denyUpdateKeyName)}/delete`).catch(() => {});
        });

        it('should allow deleting key with keys.delete permission', async () => {
            // Create a key to delete
            const deleteKeyName = `delete_perm_key_${Date.now()}`;
            await api.post('/api/core/v1/keys', {
                name: deleteKeyName,
                value: 'to-be-deleted'
            });

            const res = await api.getWithPermissions(`/api/core/v1/keys/${encodeURIComponent(deleteKeyName)}/delete`, ['keys.delete']);
            assert.ok(res.status !== 403, `Should allow with keys.delete permission (got ${res.status})`);
        });

        it('should deny deleting key without permission', async () => {
            // Create a key to try to delete
            const denyDeleteKeyName = `deny_delete_key_${Date.now()}`;
            await api.post('/api/core/v1/keys', {
                name: denyDeleteKeyName,
                value: 'should-not-delete'
            });

            const res = await api.getNoPermissions(`/api/core/v1/keys/${encodeURIComponent(denyDeleteKeyName)}/delete`);
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);

            // Cleanup with admin token
            await api.get(`/api/core/v1/keys/${encodeURIComponent(denyDeleteKeyName)}/delete`).catch(() => {});
        });
    });
});
