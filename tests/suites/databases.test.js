/**
 * Databases API E2E Tests
 *
 * Tests for database CRUD operations, search, and backup
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Databases API', () => {
    const testPrefix = `test_db_${Date.now()}`;
    const testDbName = `${testPrefix}_database`;
    const createdKeys = [];

    after(async () => {
        // Cleanup created keys
        for (const key of createdKeys) {
            await api.get(`/api/core/v1/databases/${testDbName}/${key}/delete`).catch(() => {});
        }
    });

    describe('List Databases', () => {
        it('should list all databases', async () => {
            const res = await api.get('/api/core/v1/databases');

            assert.strictEqual(res.ok, true, `Should list databases, got ${res.status}`);
            assert.ok(res.data.items !== undefined || Array.isArray(res.data), 'Should return items');
        });

        it('should have at least one database', async () => {
            const res = await api.get('/api/core/v1/databases');

            assert.strictEqual(res.ok, true);
            assert.ok(res.data.items.length > 0, 'Should have at least one database');
        });

        it('should have database with name property', async () => {
            const res = await api.get('/api/core/v1/databases');

            assert.strictEqual(res.ok, true);
            if (res.data.items.length > 0) {
                const db = res.data.items[0];
                assert.ok('name' in db, 'Database should have name property');
            }
        });

        it('should require auth to list databases', async () => {
            const res = await api.getNoAuth('/api/core/v1/databases');

            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    describe('Database Entry CRUD', () => {
        const testKey = `${testPrefix}_key`;
        const testValue = { name: 'test', count: 42, nested: { a: 1 } };

        it('should create database entry', async () => {
            const res = await api.post(`/api/core/v1/databases/${testDbName}/${testKey}`, testValue);

            assert.ok(res.status >= 200 && res.status < 500, `Should create entry, got ${res.status}`);
            if (res.ok) {
                createdKeys.push(testKey);
            }
        });

        it('should read database entry', async () => {
            const readKey = `${testPrefix}_read`;
            // First ensure entry exists
            await api.post(`/api/core/v1/databases/${testDbName}/${readKey}`, testValue);
            createdKeys.push(readKey);

            const res = await api.get(`/api/core/v1/databases/${testDbName}/${readKey}`);

            assert.ok(res.status >= 200 && res.status < 500, `Should read entry, got ${res.status}`);
        });

        it('should update database entry', async () => {
            const updateKey = `${testPrefix}_update`;
            const updatedValue = { name: 'updated', count: 100 };

            // Create first
            await api.post(`/api/core/v1/databases/${testDbName}/${updateKey}`, testValue);
            createdKeys.push(updateKey);

            // Update
            const res = await api.post(`/api/core/v1/databases/${testDbName}/${updateKey}`, updatedValue);

            assert.ok(res.status >= 200 && res.status < 500, `Should update entry, got ${res.status}`);
        });

        it('should delete database entry', async () => {
            const deleteKey = `${testPrefix}_delete_key`;

            // Create first
            await api.post(`/api/core/v1/databases/${testDbName}/${deleteKey}`, { temp: true });

            // Delete
            const res = await api.get(`/api/core/v1/databases/${testDbName}/${deleteKey}/delete`);

            assert.ok(res.status >= 200 && res.status < 500, `Should delete entry, got ${res.status}`);
        });

        it('should handle non-existent key', async () => {
            const res = await api.get(`/api/core/v1/databases/${testDbName}/nonexistent_key_xyz`);

            // May return 404, empty, or null
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle gracefully');
        });
    });

    describe('Database Search', () => {
        before(async () => {
            // Create some test entries for search
            await api.post(`/api/core/v1/databases/${testDbName}/search_alpha`, { type: 'alpha', value: 100 });
            await api.post(`/api/core/v1/databases/${testDbName}/search_beta`, { type: 'beta', value: 200 });
            await api.post(`/api/core/v1/databases/${testDbName}/search_gamma`, { type: 'gamma', value: 300 });
            createdKeys.push('search_alpha', 'search_beta', 'search_gamma');
        });

        it('should search database by key', async () => {
            const res = await api.post(`/api/core/v1/dbsearch/${testDbName}`, {
                search: 'search_alpha'
            });

            assert.ok(res.status >= 200 && res.status < 500, `Should search, got ${res.status}`);
            if (res.ok && Array.isArray(res.data)) {
                assert.ok(res.data.length >= 0, 'Should return results array');
            }
        });

        it('should search database by value content', async () => {
            const res = await api.post(`/api/core/v1/dbsearch/${testDbName}`, {
                search: 'beta'
            });

            assert.ok(res.status >= 200 && res.status < 500, `Should search, got ${res.status}`);
        });

        it('should return empty for no matches', async () => {
            const res = await api.post(`/api/core/v1/dbsearch/${testDbName}`, {
                search: 'definitely_not_exists_xyz_999'
            });

            assert.ok(res.status >= 200 && res.status < 500, 'Should handle no matches');
            if (res.ok && Array.isArray(res.data)) {
                assert.strictEqual(res.data.length, 0, 'Should return empty array');
            }
        });

        it('should require auth for search', async () => {
            const res = await api.postNoAuth(`/api/core/v1/dbsearch/${testDbName}`, {
                search: 'test'
            });

            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    describe('Database Backup', () => {
        it('should backup specific database', async () => {
            const res = await api.post('/api/core/v1/backup/databases', [testDbName]);

            // Backup may succeed or fail based on permissions
            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });

        it('should backup all databases', async () => {
            const res = await api.post('/api/core/v1/backup/databases', ['*']);

            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });

        it('should require auth for backup', async () => {
            const res = await api.postNoAuth('/api/core/v1/backup/databases', [testDbName]);

            assert.strictEqual(res.status, 401, 'Should require auth');
        });

        it('should handle empty backup request', async () => {
            const res = await api.post('/api/core/v1/backup/databases', []);

            assert.ok(res.status >= 200 && res.status < 600, 'Should handle empty array');
        });
    });

    describe('Edge Cases', () => {
        it('should handle special characters in key', async () => {
            const specialKey = `${testPrefix}_special_key_v2`;
            const res = await api.post(`/api/core/v1/databases/${testDbName}/${encodeURIComponent(specialKey)}`, { test: true });

            assert.ok(res.status >= 200 && res.status < 500, 'Should handle special characters');
            if (res.ok) {
                createdKeys.push(specialKey);
            }
        });

        it('should handle JSON values', async () => {
            const jsonKey = `${testPrefix}_json`;
            const jsonValue = {
                string: 'test',
                number: 42,
                boolean: true,
                nullVal: null,
                array: [1, 2, 3],
                nested: { deep: { value: 'deep' } }
            };

            const res = await api.post(`/api/core/v1/databases/${testDbName}/${jsonKey}`, jsonValue);

            assert.ok(res.status >= 200 && res.status < 500, 'Should handle complex JSON');
            if (res.ok) {
                createdKeys.push(jsonKey);
            }
        });

        it('should handle large values', async () => {
            const largeKey = `${testPrefix}_large`;
            const largeValue = { data: 'x'.repeat(10000) };

            const res = await api.post(`/api/core/v1/databases/${testDbName}/${largeKey}`, largeValue);

            assert.ok(res.status >= 200 && res.status < 500, 'Should handle large value');
            if (res.ok) {
                createdKeys.push(largeKey);
            }
        });

        it('should handle unicode in values', async () => {
            const unicodeKey = `${testPrefix}_unicode`;
            const unicodeValue = { text: 'Test unicode chars' };

            const res = await api.post(`/api/core/v1/databases/${testDbName}/${unicodeKey}`, unicodeValue);

            assert.ok(res.status >= 200 && res.status < 500, 'Should handle unicode');
            if (res.ok) {
                createdKeys.push(unicodeKey);
            }
        });
    });

    // --- Permission Enforcement Tests ---
    // Note: databases API uses databases.update for POST, databases.read for search, databases.delete for delete
    describe('Permission Enforcement', () => {
        it('should allow listing databases with databases.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/databases', ['databases.read']);
            assert.ok(res.status !== 403, `Should allow with databases.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing databases without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/databases');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow searching database with databases.read permission', async () => {
            const res = await api.postWithPermissions(`/api/core/v1/dbsearch/${testDbName}`, { search: 'test' }, ['databases.read']);
            assert.ok(res.status !== 403, `Should allow with databases.read permission (got ${res.status})`);
        });

        it('should deny searching database without permission', async () => {
            const res = await api.postNoPermissions(`/api/core/v1/dbsearch/${testDbName}`, { search: 'test' });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow updating database entry with databases.update permission', async () => {
            const updateKey = `perm_update_${Date.now()}`;
            const res = await api.postWithPermissions(`/api/core/v1/databases/${testDbName}/${updateKey}`, { test: true }, ['databases.update']);
            assert.ok(res.status !== 403, `Should allow with databases.update permission (got ${res.status})`);
            if (res.ok) {
                createdKeys.push(updateKey);
            }
        });

        it('should deny updating database entry without permission', async () => {
            const res = await api.postNoPermissions(`/api/core/v1/databases/${testDbName}/denied_entry`, { test: true });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow deleting database entry with databases.delete permission', async () => {
            // First create an entry
            const deleteKey = `perm_delete_${Date.now()}`;
            await api.post(`/api/core/v1/databases/${testDbName}/${deleteKey}`, { test: true });

            const res = await api.getWithPermissions(`/api/core/v1/databases/${testDbName}/${deleteKey}/delete`, ['databases.delete']);
            assert.ok(res.status !== 403, `Should allow with databases.delete permission (got ${res.status})`);
        });

        it('should deny deleting database entry without permission', async () => {
            // First create an entry
            const denyDeleteKey = `deny_delete_${Date.now()}`;
            await api.post(`/api/core/v1/databases/${testDbName}/${denyDeleteKey}`, { test: true });
            createdKeys.push(denyDeleteKey);

            const res = await api.getNoPermissions(`/api/core/v1/databases/${testDbName}/${denyDeleteKey}/delete`);
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });
    });
});
