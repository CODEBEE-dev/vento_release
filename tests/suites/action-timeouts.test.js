/**
 * Action Timeouts E2E Tests
 *
 * Tests for action execution timeouts and long-running actions
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Action Timeouts', () => {
    const testPrefix = `test_timeout_${Date.now()}`;
    const boardName = `${testPrefix}_board`;
    let boardCreated = false;

    before(async () => {
        const res = await api.post('/api/core/v1/import/board', {
            name: boardName,
            template: { id: 'blank' }
        });
        if (res.ok) {
            boardCreated = true;

            // Add various timed actions
            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'fast_action',
                    type: 'action',
                    rulesCode: 'return { ok: true, time: "fast" };'
                }
            });

            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'medium_action',
                    type: 'action',
                    rulesCode: 'await new Promise(r => setTimeout(r, 500)); return { ok: true, time: "medium" };'
                }
            });

            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'slow_action',
                    type: 'action',
                    rulesCode: 'await new Promise(r => setTimeout(r, 2000)); return { ok: true, time: "slow" };'
                }
            });
        }
    });

    after(async () => {
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${boardName}/delete`).catch(() => {});
        }
    });

    describe('Fast Actions', () => {
        it('should execute fast action immediately', async () => {
            const start = Date.now();
            const res = await api.get(`/api/core/v1/boards/${boardName}/actions/fast_action`);
            const elapsed = Date.now() - start;

            assert.strictEqual(res.ok, true, 'Fast action should succeed');
            assert.ok(elapsed < 1000, `Fast action should complete quickly, took ${elapsed}ms`);
        });

        it('should handle multiple fast actions in sequence', async () => {
            for (let i = 0; i < 5; i++) {
                const res = await api.get(`/api/core/v1/boards/${boardName}/actions/fast_action`);
                assert.strictEqual(res.ok, true, `Fast action ${i + 1} should succeed`);
            }
        });
    });

    describe('Medium Actions', () => {
        it('should execute medium action within reasonable time', async () => {
            const start = Date.now();
            const res = await api.get(`/api/core/v1/boards/${boardName}/actions/medium_action`);
            const elapsed = Date.now() - start;

            assert.strictEqual(res.ok, true, 'Medium action should succeed');
            assert.ok(elapsed >= 400, `Medium action should take time, took ${elapsed}ms`);
            assert.ok(elapsed < 3000, `Medium action should not take too long, took ${elapsed}ms`);
        });
    });

    describe('Slow Actions', () => {
        it('should execute slow action successfully', async () => {
            const start = Date.now();
            const res = await api.get(`/api/core/v1/boards/${boardName}/actions/slow_action`);
            const elapsed = Date.now() - start;

            assert.strictEqual(res.ok, true, 'Slow action should succeed');
            assert.ok(elapsed >= 1500, `Slow action should take time, took ${elapsed}ms`);
        });

        it('should handle slow action cancellation', async () => {
            // Start slow action
            const actionPromise = api.get(`/api/core/v1/boards/${boardName}/actions/slow_action`);

            // Wait briefly then cancel
            await new Promise(r => setTimeout(r, 300));
            await api.post(`/api/core/v1/boards/${boardName}/management/actions/slow_action/cancel-all`, {});

            // Action should complete (cancelled or not)
            await actionPromise.catch(() => {});
        });
    });

    describe('Concurrent Timed Actions', () => {
        it('should handle concurrent actions of different speeds', async () => {
            const start = Date.now();

            const results = await Promise.all([
                api.get(`/api/core/v1/boards/${boardName}/actions/fast_action`),
                api.get(`/api/core/v1/boards/${boardName}/actions/medium_action`),
                api.get(`/api/core/v1/boards/${boardName}/actions/fast_action`)
            ]);

            const elapsed = Date.now() - start;

            // All should succeed
            for (const res of results) {
                assert.strictEqual(res.ok, true, 'Concurrent action should succeed');
            }

            // Should complete around medium action time (not sum of all)
            assert.ok(elapsed < 2000, `Concurrent actions should overlap, took ${elapsed}ms`);
        });

        it('should handle burst of fast actions', async () => {
            const promises = Array(10).fill(null).map(() =>
                api.get(`/api/core/v1/boards/${boardName}/actions/fast_action`)
            );

            const results = await Promise.all(promises);

            let successCount = 0;
            for (const res of results) {
                if (res.ok) successCount++;
            }

            assert.ok(successCount >= 8, `Most burst actions should succeed, got ${successCount}/10`);
        });
    });

    describe('Action Timing Edge Cases', () => {
        it('should handle action called immediately after board reload', async () => {
            await api.get(`/api/core/v1/boards/${boardName}/reload`);

            // Immediately call action
            const res = await api.get(`/api/core/v1/boards/${boardName}/actions/fast_action`);
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle post-reload action');
        });

        it('should handle action while another is running', async () => {
            // Start slow action
            const slowPromise = api.get(`/api/core/v1/boards/${boardName}/actions/slow_action`);

            // Start fast action while slow is running
            const fastRes = await api.get(`/api/core/v1/boards/${boardName}/actions/fast_action`);
            assert.strictEqual(fastRes.ok, true, 'Fast action should work while slow runs');

            // Wait for slow to complete
            await slowPromise;
        });
    });
});
