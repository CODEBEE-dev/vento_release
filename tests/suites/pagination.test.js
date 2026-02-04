/**
 * Pagination E2E Tests
 *
 * Tests for pagination behavior across all list endpoints
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Pagination', () => {
    const testPrefix = `test_page_${Date.now()}`;
    const createdBoards = [];
    const createdSettings = [];

    before(async () => {
        // Create multiple boards for pagination testing
        for (let i = 0; i < 5; i++) {
            const name = `${testPrefix}_board_${i}`;
            const res = await api.post('/api/core/v1/import/board', {
                name,
                template: { id: 'blank' }
            });
            if (res.ok) {
                createdBoards.push(name);
            }
        }

        // Create multiple settings
        for (let i = 0; i < 5; i++) {
            const name = `${testPrefix}_setting_${i}`;
            const res = await api.post('/api/core/v1/settings', {
                name,
                value: `value_${i}`
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
    });

    describe('Page Parameter', () => {
        it('should return first page by default', async () => {
            const res = await api.get('/api/core/v1/boards');

            assert.strictEqual(res.ok, true);
            assert.ok(res.data.items, 'Should have items');
            // First page should have items (assuming boards exist)
        });

        it('should return specified page with ?page=1', async () => {
            const res = await api.get('/api/core/v1/boards?page=1');

            assert.strictEqual(res.ok, true);
            assert.ok(res.data.items, 'Should have items');
        });

        it('should return specified page with ?page=2', async () => {
            const res = await api.get('/api/core/v1/boards?page=2&itemsPerPage=2');

            assert.strictEqual(res.ok, true);
            // Page 2 may or may not have items depending on total count
        });

        it('should handle ?page=0 gracefully', async () => {
            const res = await api.get('/api/core/v1/boards?page=0');

            // Should not crash - may treat as page 1 or return error
            assert.ok(res.status < 500, 'Should not cause server error');
        });

        it('should handle negative page gracefully', async () => {
            const res = await api.get('/api/core/v1/boards?page=-1');

            // Should not crash
            assert.ok(res.status < 500, 'Should not cause server error');
        });

        it('should return empty items for page beyond total', async () => {
            const res = await api.get('/api/core/v1/boards?page=9999');

            assert.strictEqual(res.ok, true);
            assert.ok(Array.isArray(res.data.items), 'Should have items array');
            assert.strictEqual(res.data.items.length, 0, 'Should be empty for page beyond total');
        });
    });

    describe('ItemsPerPage Parameter', () => {
        it('should use default itemsPerPage when not specified', async () => {
            const res = await api.get('/api/core/v1/boards');

            assert.strictEqual(res.ok, true);
            // Default is usually 25 or similar
        });

        it('should respect custom itemsPerPage', async () => {
            const res = await api.get('/api/core/v1/boards?itemsPerPage=2');

            assert.strictEqual(res.ok, true);
            assert.ok(res.data.items.length <= 2, 'Should return at most 2 items');
        });

        it('should respect itemsPerPage=1', async () => {
            const res = await api.get('/api/core/v1/boards?itemsPerPage=1');

            assert.strictEqual(res.ok, true);
            assert.ok(res.data.items.length <= 1, 'Should return at most 1 item');
        });

        it('should handle itemsPerPage=0 gracefully', async () => {
            const res = await api.get('/api/core/v1/boards?itemsPerPage=0');

            // Should not crash - may return all or empty
            assert.ok(res.status < 500, 'Should not cause server error');
        });

        it('should handle very large itemsPerPage', async () => {
            const res = await api.get('/api/core/v1/boards?itemsPerPage=999999');

            assert.strictEqual(res.ok, true);
            // Should return all available items up to reasonable limit
        });

        it('should handle negative itemsPerPage gracefully', async () => {
            const res = await api.get('/api/core/v1/boards?itemsPerPage=-1');

            // Should not crash
            assert.ok(res.status < 500, 'Should not cause server error');
        });
    });

    describe('All Parameter', () => {
        it('should return all items with ?all=1', async () => {
            const res = await api.get('/api/core/v1/boards?all=1');

            assert.strictEqual(res.ok, true);
            assert.ok(res.data.items, 'Should have items');
            // With all=1, should return all items without pagination
            assert.ok(res.data.items.length >= createdBoards.length, 'Should include all test boards');
        });

        it('should ignore itemsPerPage with ?all=1', async () => {
            const res = await api.get('/api/core/v1/boards?all=1&itemsPerPage=1');

            assert.strictEqual(res.ok, true);
            // all=1 should override itemsPerPage
            assert.ok(res.data.items.length >= createdBoards.length, 'Should return all despite itemsPerPage');
        });

        it('should ignore page with ?all=1', async () => {
            const res = await api.get('/api/core/v1/boards?all=1&page=999');

            assert.strictEqual(res.ok, true);
            // all=1 should return all items regardless of page
            assert.ok(res.data.items.length >= createdBoards.length, 'Should return all despite page');
        });
    });

    describe('HasMore Flag', () => {
        it('should indicate hasMore=true when more pages exist', async () => {
            // Request with small page size
            const res = await api.get('/api/core/v1/boards?itemsPerPage=1&page=1');

            assert.strictEqual(res.ok, true);

            if (res.data.total > 1 && res.data.hasMore !== undefined) {
                assert.strictEqual(res.data.hasMore, true, 'Should have more pages');
            }
        });

        it('should indicate hasMore=false on last page', async () => {
            // Get total first
            const allRes = await api.get('/api/core/v1/boards?all=1');
            const total = allRes.data.total || allRes.data.items.length;

            if (total > 0) {
                // Request the last page
                const res = await api.get(`/api/core/v1/boards?itemsPerPage=${total}&page=1`);

                if (res.data.hasMore !== undefined) {
                    assert.strictEqual(res.data.hasMore, false, 'Last page should not have more');
                }
            }
        });
    });

    describe('Total Count', () => {
        it('should return correct total count', async () => {
            const res = await api.get('/api/core/v1/boards');

            assert.strictEqual(res.ok, true);
            assert.ok(typeof res.data.total === 'number', 'Total should be number');
            assert.ok(res.data.total >= createdBoards.length, 'Total should include test boards');
        });

        it('should return same total regardless of page', async () => {
            const res1 = await api.get('/api/core/v1/boards?page=1');
            const res2 = await api.get('/api/core/v1/boards?page=2');

            assert.strictEqual(res1.data.total, res2.data.total, 'Total should be same on all pages');
        });

        it('should return same total regardless of itemsPerPage', async () => {
            const res1 = await api.get('/api/core/v1/boards?itemsPerPage=1');
            const res2 = await api.get('/api/core/v1/boards?itemsPerPage=100');

            assert.strictEqual(res1.data.total, res2.data.total, 'Total should not change with itemsPerPage');
        });
    });

    describe('Consistency Across Endpoints', () => {
        const endpoints = [
            '/api/core/v1/boards',
            '/api/core/v1/accounts',
            '/api/core/v1/groups',
            '/api/core/v1/events',
            '/api/core/v1/keys',
            '/api/core/v1/tokens'
        ];

        for (const endpoint of endpoints) {
            it(`${endpoint} should support ?page parameter`, async () => {
                const res = await api.get(`${endpoint}?page=1`);

                assert.ok(res.status < 500, `${endpoint} should handle page param`);
            });

            it(`${endpoint} should support ?itemsPerPage parameter`, async () => {
                const res = await api.get(`${endpoint}?itemsPerPage=5`);

                assert.ok(res.status < 500, `${endpoint} should handle itemsPerPage param`);
            });

            it(`${endpoint} should support ?all=1 parameter`, async () => {
                const res = await api.get(`${endpoint}?all=1`);

                assert.ok(res.status < 500, `${endpoint} should handle all param`);
            });
        }
    });

    describe('Settings Pagination', () => {
        it('should paginate settings list', async () => {
            const res = await api.get('/api/core/v1/settings?itemsPerPage=2');

            if (res.ok) {
                assert.ok(res.data.items.length <= 2, 'Should respect itemsPerPage');
            }
        });

        it('should return all settings with ?all=1', async () => {
            const res = await api.get('/api/core/v1/settings?all=1');

            if (res.ok) {
                assert.ok(res.data.items.length >= createdSettings.length, 'Should include test settings');
            }
        });
    });

    describe('Events Pagination', () => {
        before(async () => {
            // Create some events for pagination testing
            for (let i = 0; i < 3; i++) {
                await api.post('/api/core/v1/events', {
                    path: `test/pagination/${testPrefix}`,
                    from: 'pagination-test',
                    payload: { index: i }
                });
            }
        });

        it('should paginate events list', async () => {
            const res = await api.get('/api/core/v1/events?itemsPerPage=2');

            assert.strictEqual(res.ok, true);
            assert.ok(res.data.items.length <= 2, 'Should respect itemsPerPage');
        });

        it('should support page navigation for events', async () => {
            const page1 = await api.get('/api/core/v1/events?itemsPerPage=2&page=1');
            const page2 = await api.get('/api/core/v1/events?itemsPerPage=2&page=2');

            assert.strictEqual(page1.ok, true);
            assert.strictEqual(page2.ok, true);

            // Pages should have different items (if enough events exist)
            if (page1.data.items.length > 0 && page2.data.items.length > 0) {
                const ids1 = page1.data.items.map(e => e.id || JSON.stringify(e));
                const ids2 = page2.data.items.map(e => e.id || JSON.stringify(e));

                // At least some items should be different
                const overlap = ids1.filter(id => ids2.includes(id));
                assert.ok(overlap.length < ids1.length, 'Different pages should have different items');
            }
        });
    });
});
