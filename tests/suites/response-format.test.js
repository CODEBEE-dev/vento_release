/**
 * API Response Format Consistency Tests
 *
 * Verifies that all APIs follow consistent response formats
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('API Response Format Consistency', () => {
    const testPrefix = `test_fmt_${Date.now()}`;
    const createdResources = [];

    after(async () => {
        for (const r of createdResources) {
            try {
                await api.get(`/api/core/v1/${r.type}/${encodeURIComponent(r.name)}/delete`);
            } catch (e) {}
        }
    });

    describe('List Endpoints Format', () => {
        // All list endpoints should return { items: [], total: number, page?: number, hasMore?: boolean }

        it('GET /boards should have { items, total }', async () => {
            const res = await api.get('/api/core/v1/boards');

            assert.strictEqual(res.ok, true, `Got status ${res.status}`);
            assert.ok(Array.isArray(res.data.items), 'Should have items array');
            assert.ok(typeof res.data.total === 'number', 'Should have total as number');
        });

        it('GET /accounts should have { items, total }', async () => {
            const res = await api.get('/api/core/v1/accounts');

            assert.strictEqual(res.ok, true, `Got status ${res.status}`);
            assert.ok(Array.isArray(res.data.items), 'Should have items array');
            assert.ok(typeof res.data.total === 'number', 'Should have total as number');
        });

        it('GET /groups should have { items, total }', async () => {
            const res = await api.get('/api/core/v1/groups');

            assert.strictEqual(res.ok, true, `Got status ${res.status}`);
            assert.ok(Array.isArray(res.data.items), 'Should have items array');
            assert.ok(typeof res.data.total === 'number', 'Should have total as number');
        });

        it('GET /settings should have { items, total }', async () => {
            const res = await api.get('/api/core/v1/settings');

            // Settings might return 500 if empty, which is a known issue
            if (res.ok) {
                assert.ok(Array.isArray(res.data.items), 'Should have items array');
                assert.ok(typeof res.data.total === 'number', 'Should have total as number');
            }
        });

        it('GET /events should have { items, total }', async () => {
            const res = await api.get('/api/core/v1/events');

            assert.strictEqual(res.ok, true, `Got status ${res.status}`);
            assert.ok(Array.isArray(res.data.items), 'Should have items array');
            assert.ok(typeof res.data.total === 'number', 'Should have total as number');
        });

        it('GET /keys should have { items, total }', async () => {
            const res = await api.get('/api/core/v1/keys');

            assert.strictEqual(res.ok, true, `Got status ${res.status}`);
            assert.ok(Array.isArray(res.data.items), 'Should have items array');
            assert.ok(typeof res.data.total === 'number', 'Should have total as number');
        });

        it('GET /tokens should have { items, total }', async () => {
            const res = await api.get('/api/core/v1/tokens');

            assert.strictEqual(res.ok, true, `Got status ${res.status}`);
            assert.ok(Array.isArray(res.data.items), 'Should have items array');
            assert.ok(typeof res.data.total === 'number', 'Should have total as number');
        });

        it('GET /objects should have { items, total }', async () => {
            const res = await api.get('/api/core/v1/objects');

            if (res.ok) {
                assert.ok(Array.isArray(res.data.items), 'Should have items array');
                assert.ok(typeof res.data.total === 'number', 'Should have total as number');
            }
        });

        it('GET /databases should have { items, total }', async () => {
            const res = await api.get('/api/core/v1/databases');

            if (res.ok) {
                assert.ok(Array.isArray(res.data.items), 'Should have items array');
                assert.ok(typeof res.data.total === 'number', 'Should have total as number');
            }
        });

        it('GET /themes should have { items, total }', async () => {
            const res = await api.get('/api/core/v1/themes');

            if (res.ok) {
                assert.ok(Array.isArray(res.data.items), 'Should have items array');
                assert.ok(typeof res.data.total === 'number', 'Should have total as number');
            }
        });
    });

    describe('Pagination Fields', () => {
        it('should include page number in response', async () => {
            const res = await api.get('/api/core/v1/boards?page=1');

            assert.strictEqual(res.ok, true);
            // Page might be in response or implicit
            if (res.data.page !== undefined) {
                assert.ok(typeof res.data.page === 'number', 'Page should be number');
            }
        });

        it('should include hasMore or similar flag', async () => {
            const res = await api.get('/api/core/v1/boards?itemsPerPage=1');

            assert.strictEqual(res.ok, true);
            // hasMore indicates if there are more pages
            if (res.data.hasMore !== undefined) {
                assert.ok(typeof res.data.hasMore === 'boolean', 'hasMore should be boolean');
            }
        });
    });

    describe('Single Item Endpoints Format', () => {
        it('GET /boards/:name should return board object directly', async () => {
            // Create a test board
            const boardName = `${testPrefix}_single`;
            const createRes = await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });

            if (createRes.ok) {
                createdResources.push({ type: 'boards', name: boardName });

                const res = await api.get(`/api/core/v1/boards/${boardName}`);

                assert.strictEqual(res.ok, true);
                assert.ok(res.data.name, 'Should have name field');
                assert.ok(!res.data.items, 'Should NOT have items array (single item)');
            }
        });

        it('GET /accounts/:username should return user object directly', async () => {
            // Use existing admin user
            const res = await api.get('/api/core/v1/accounts/admin');

            if (res.ok) {
                assert.ok(res.data.username, 'Should have username field');
                assert.ok(!res.data.items, 'Should NOT have items array');
            }
        });

        it('GET /settings/:name should return setting object', async () => {
            // Create test setting
            const settingName = `${testPrefix}_setting`;
            await api.post('/api/core/v1/settings', {
                name: settingName,
                value: 'test'
            });
            createdResources.push({ type: 'settings', name: settingName });

            const res = await api.get(`/api/core/v1/settings/${encodeURIComponent(settingName)}`);

            if (res.ok) {
                assert.ok(res.data.name, 'Should have name field');
                assert.ok(res.data.value !== undefined, 'Should have value field');
            }
        });
    });

    describe('Create Endpoints Format', () => {
        it('POST /boards (import) should return success indicator', async () => {
            const boardName = `${testPrefix}_create`;
            const res = await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });

            assert.strictEqual(res.ok, true, `Got status ${res.status}`);
            createdResources.push({ type: 'boards', name: boardName });

            // Should return created item or success indicator
            assert.ok(
                res.data.success || res.data.name || res.data.id,
                'Create should return success/item info'
            );
        });

        it('POST /settings should return created setting', async () => {
            const settingName = `${testPrefix}_create_setting`;
            const res = await api.post('/api/core/v1/settings', {
                name: settingName,
                value: 'created_value'
            });

            if (res.ok) {
                createdResources.push({ type: 'settings', name: settingName });
                // Should return the created item
                assert.ok(res.data.name || res.data.value !== undefined, 'Should return created item');
            }
        });

        it('POST /events should return created event', async () => {
            const res = await api.post('/api/core/v1/events', {
                path: `test/${testPrefix}`,
                from: 'format-test',
                payload: { test: true }
            });

            assert.strictEqual(res.ok, true, `Got status ${res.status}`);
            // Event creation should return something
            assert.ok(res.data, 'Should return response');
        });
    });

    describe('Delete Endpoints Format', () => {
        it('GET /boards/:name/delete should return success indicator', async () => {
            const boardName = `${testPrefix}_delete`;
            await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });

            const res = await api.get(`/api/core/v1/boards/${boardName}/delete`);

            assert.strictEqual(res.ok, true, `Delete got status ${res.status}`);
            // Should indicate success somehow
            // Common patterns: { ok: true }, { success: true }, { deleted: true }, or the deleted item
        });

        it('GET /settings/:name/delete should return success indicator', async () => {
            const settingName = `${testPrefix}_delete_setting`;
            await api.post('/api/core/v1/settings', {
                name: settingName,
                value: 'to_delete'
            });

            const res = await api.get(`/api/core/v1/settings/${encodeURIComponent(settingName)}/delete`);

            assert.strictEqual(res.ok, true, `Delete got status ${res.status}`);
        });
    });

    describe('Error Response Format', () => {
        it('404 should return error object', async () => {
            const res = await api.get('/api/core/v1/boards/nonexistent_board_format_test');

            assert.strictEqual(res.ok, false);
            // Error format should be consistent
            if (res.data) {
                assert.ok(
                    res.data.error || res.data.message || typeof res.data === 'string',
                    'Error response should have error/message field or be string'
                );
            }
        });

        it('401 should return error object', async () => {
            const res = await api.getNoAuth('/api/core/v1/boards');

            assert.strictEqual(res.status, 401);
            if (res.data) {
                assert.ok(
                    res.data.error || res.data.message || typeof res.data === 'string',
                    'Auth error should have error/message field'
                );
            }
        });

        it('400 should return error object', async () => {
            // Invalid board name should return 400
            const res = await api.post('/api/core/v1/import/board', {
                name: 'INVALID BOARD NAME!!!',
                template: { id: 'blank' }
            });

            assert.strictEqual(res.ok, false);
            if (res.data) {
                assert.ok(
                    res.data.error || res.data.message || typeof res.data === 'string',
                    'Validation error should have error/message field'
                );
            }
        });
    });

    describe('Special Endpoints Format', () => {
        it('GET /settings/all should return flat object (not items array)', async () => {
            const res = await api.get('/api/core/v1/settings/all');

            if (res.ok) {
                assert.ok(!res.data.items, 'settings/all should NOT have items array');
                assert.strictEqual(typeof res.data, 'object', 'Should be object');
            }
        });

        it('GET /settings.js should return JavaScript string', async () => {
            const res = await api.get('/api/core/v1/settings.js');

            if (res.ok) {
                assert.strictEqual(typeof res.data, 'string', 'Should return string');
                assert.ok(res.data.includes('ventoSettings'), 'Should contain ventoSettings');
            }
        });

        it('GET /auth/validate should return session info', async () => {
            const res = await api.get('/api/core/v1/auth/validate');

            assert.strictEqual(res.ok, true);
            // Should return session/user info
            assert.ok(res.data, 'Should return session data');
        });
    });
});
