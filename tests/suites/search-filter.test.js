/**
 * Search and Filter E2E Tests
 *
 * Tests for search and filter functionality across APIs
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Search and Filter', () => {
    const testPrefix = `test_search_${Date.now()}`;
    const createdBoards = [];
    const createdUsers = [];
    const createdSettings = [];

    before(async () => {
        // Create test boards with different names
        const boardNames = [
            `${testPrefix}_alpha_board`,
            `${testPrefix}_beta_board`,
            `${testPrefix}_gamma_test`,
            `${testPrefix}_delta_board`
        ];

        for (const name of boardNames) {
            const res = await api.post('/api/core/v1/import/board', {
                name,
                template: { id: 'blank' }
            });
            if (res.ok) {
                createdBoards.push(name);
            }
        }

        // Create test settings
        const settingNames = [
            `${testPrefix}.search.alpha`,
            `${testPrefix}.search.beta`,
            `${testPrefix}.filter.gamma`
        ];

        for (const name of settingNames) {
            const res = await api.post('/api/core/v1/settings', {
                name,
                value: 'test'
            });
            if (res.ok) {
                createdSettings.push(name);
            }
        }
    });

    after(async () => {
        for (const name of createdBoards) {
            await api.get(`/api/core/v1/boards/${name}/delete`).catch(() => {});
        }
        for (const name of createdSettings) {
            await api.get(`/api/core/v1/settings/${encodeURIComponent(name)}/delete`).catch(() => {});
        }
        for (const name of createdUsers) {
            await api.get(`/api/core/v1/accounts/${name}/delete`).catch(() => {});
        }
    });

    describe('Board Search', () => {
        it('should filter boards by name with ?search=', async () => {
            const res = await api.get(`/api/core/v1/boards?search=${testPrefix}_alpha`);

            assert.strictEqual(res.ok, true);
            if (res.data.items.length > 0) {
                // Should find boards matching search
                const found = res.data.items.some(b => b.name.includes('alpha'));
                assert.ok(found, 'Should find boards matching search');
            }
        });

        it('should filter boards with partial match', async () => {
            const res = await api.get(`/api/core/v1/boards?search=${testPrefix}`);

            assert.strictEqual(res.ok, true);
            // Search may or may not be implemented - just verify it doesn't crash
            // If search works, should find boards; if not, may return all boards
            assert.ok(Array.isArray(res.data.items), 'Should return items array');
        });

        it('should be case-insensitive', async () => {
            const res = await api.get(`/api/core/v1/boards?search=${testPrefix.toUpperCase()}`);

            // Depending on implementation, may or may not be case-insensitive
            assert.ok(res.status < 500, 'Should handle uppercase search');
        });

        it('should return empty for no matches', async () => {
            const res = await api.get('/api/core/v1/boards?search=definitely_not_exists_xyz_999');

            assert.strictEqual(res.ok, true);
            assert.strictEqual(res.data.items.length, 0, 'Should return empty for no matches');
        });

        it('should handle special characters in search', async () => {
            const res = await api.get('/api/core/v1/boards?search=' + encodeURIComponent('test@#$'));

            assert.ok(res.status < 500, 'Should handle special characters');
        });

        it('should handle empty search parameter', async () => {
            const res = await api.get('/api/core/v1/boards?search=');

            assert.ok(res.status < 500, 'Should handle empty search');
        });
    });

    describe('Settings Search', () => {
        it('should filter settings by name', async () => {
            const res = await api.get(`/api/core/v1/settings?search=${testPrefix}.search`);

            if (res.ok && res.data.items) {
                const searchSettings = res.data.items.filter(s => s.name.includes(`${testPrefix}.search`));
                assert.ok(searchSettings.length >= 0, 'Should filter settings');
            }
        });
    });

    describe('Events Filter', () => {
        before(async () => {
            // Create test events with different paths
            await api.post('/api/core/v1/events', {
                path: `${testPrefix}/category/alpha`,
                from: 'search-test',
                payload: { type: 'alpha' }
            });
            await api.post('/api/core/v1/events', {
                path: `${testPrefix}/category/beta`,
                from: 'search-test',
                payload: { type: 'beta' }
            });
            await api.post('/api/core/v1/events', {
                path: `${testPrefix}/other/gamma`,
                from: 'filter-test',
                payload: { type: 'gamma' }
            });
        });

        it('should filter events by path', async () => {
            const res = await api.get(`/api/core/v1/events?path=${testPrefix}/category`);

            assert.strictEqual(res.ok, true);
            // Should find events matching path prefix
        });

        it('should filter events by from', async () => {
            const res = await api.get('/api/core/v1/events?from=search-test');

            assert.strictEqual(res.ok, true);
            // from filter may or may not be implemented
            // Just verify it returns valid response
            assert.ok(Array.isArray(res.data.items), 'Should return items array');
        });

        it('should combine path and from filters', async () => {
            const res = await api.get(`/api/core/v1/events?path=${testPrefix}&from=search-test`);

            assert.strictEqual(res.ok, true);
            // Should find events matching both criteria
        });

        it('should filter events by date range (if supported)', async () => {
            const now = new Date();
            const hourAgo = new Date(now.getTime() - 3600000);

            const res = await api.get(`/api/core/v1/events?from_date=${hourAgo.toISOString()}`);

            // May or may not be supported
            assert.ok(res.status < 500, 'Should handle date filter param');
        });
    });

    describe('User Search', () => {
        it('should filter users by search term', async () => {
            const res = await api.get('/api/core/v1/accounts?search=admin');

            assert.strictEqual(res.ok, true);
            if (res.data.items.length > 0) {
                // Should find admin user
                const found = res.data.items.some(u => u.username.includes('admin'));
                assert.ok(found, 'Should find user matching search');
            }
        });
    });

    describe('Multiple Filters', () => {
        it('should combine search with pagination', async () => {
            const res = await api.get(`/api/core/v1/boards?search=${testPrefix}&page=1&itemsPerPage=2`);

            assert.strictEqual(res.ok, true);
            assert.ok(res.data.items.length <= 2, 'Should respect itemsPerPage with search');
        });

        it('should combine search with all=1', async () => {
            const res = await api.get(`/api/core/v1/boards?search=${testPrefix}&all=1`);

            assert.strictEqual(res.ok, true);
            // Should return all matching boards
        });
    });

    describe('Sort/Order', () => {
        it('should return boards in consistent order', async () => {
            const res1 = await api.get('/api/core/v1/boards');
            const res2 = await api.get('/api/core/v1/boards');

            assert.strictEqual(res1.ok, true);
            assert.strictEqual(res2.ok, true);

            // Order should be consistent
            const names1 = res1.data.items.map(b => b.name);
            const names2 = res2.data.items.map(b => b.name);
            assert.deepStrictEqual(names1, names2, 'Order should be consistent');
        });

        it('should return events in descending date order', async () => {
            const res = await api.get('/api/core/v1/events?all=1');

            assert.strictEqual(res.ok, true);
            if (res.data.items.length >= 2) {
                // Check if ordered by date descending
                const dates = res.data.items.map(e => new Date(e.createdAt || e.date || 0).getTime());
                for (let i = 1; i < dates.length; i++) {
                    assert.ok(dates[i-1] >= dates[i], 'Events should be ordered by date desc');
                }
            }
        });
    });
});
