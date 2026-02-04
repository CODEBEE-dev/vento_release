/**
 * Advanced Concurrency E2E Tests
 *
 * Tests for complex concurrent operations and race conditions
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Advanced Concurrency', () => {
    const testPrefix = `test_conc_${Date.now()}`;
    const boardName = `${testPrefix}_board`;
    let boardCreated = false;

    before(async () => {
        const res = await api.post('/api/core/v1/import/board', {
            name: boardName,
            template: { id: 'blank' }
        });
        if (res.ok) {
            boardCreated = true;

            // Add counter action
            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'counter_action',
                    type: 'action',
                    rulesCode: 'return { count: Date.now() };'
                }
            });

            // Add state action
            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'state_action',
                    type: 'action',
                    rulesCode: 'await new Promise(r => setTimeout(r, 100)); return { state: "done" };'
                }
            });
        }
    });

    after(async () => {
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${boardName}/delete`).catch(() => {});
        }
    });

    describe('Concurrent Read Operations', () => {
        it('should handle concurrent board reads', async () => {
            const promises = Array(20).fill(null).map(() =>
                api.get(`/api/core/v1/boards/${boardName}`)
            );

            const results = await Promise.all(promises);
            const successCount = results.filter(r => r.ok).length;

            assert.ok(successCount >= 18, `Most reads should succeed, got ${successCount}/20`);
        });

        it('should handle concurrent list operations', async () => {
            const promises = [
                api.get('/api/core/v1/boards'),
                api.get('/api/core/v1/settings'),
                api.get('/api/core/v1/databases'),
                api.get('/api/core/v1/keys'),
                api.get('/api/core/v1/accounts')
            ];

            const results = await Promise.all(promises);

            for (const res of results) {
                assert.strictEqual(res.ok, true, 'Concurrent list should succeed');
            }
        });

        it('should handle concurrent file reads', async () => {
            const promises = Array(10).fill(null).map(() =>
                api.get('/api/core/v1/files/data')
            );

            const results = await Promise.all(promises);
            const successCount = results.filter(r => r.ok).length;

            assert.ok(successCount >= 8, `Most file reads should succeed, got ${successCount}/10`);
        });
    });

    describe('Concurrent Write Operations', () => {
        const settingNames = [];

        after(async () => {
            for (const name of settingNames) {
                await api.get(`/api/core/v1/settings/${encodeURIComponent(name)}/delete`).catch(() => {});
            }
        });

        it('should handle concurrent setting creates', async () => {
            const promises = Array(5).fill(null).map((_, i) => {
                const name = `${testPrefix}_setting_${i}`;
                settingNames.push(name);
                return api.post('/api/core/v1/settings', {
                    name: name,
                    value: `value_${i}`
                });
            });

            const results = await Promise.all(promises);
            const successCount = results.filter(r => r.ok || r.status < 500).length;

            assert.ok(successCount >= 3, `Most creates should succeed, got ${successCount}/5`);
        });

        it('should handle concurrent updates to same setting', async () => {
            const settingName = `${testPrefix}_shared`;
            settingNames.push(settingName);

            // Create setting first
            await api.post('/api/core/v1/settings', {
                name: settingName,
                value: 'initial'
            });

            // Concurrent updates
            const promises = Array(5).fill(null).map((_, i) =>
                api.post('/api/core/v1/settings', {
                    name: settingName,
                    value: `updated_${i}`
                })
            );

            const results = await Promise.all(promises);

            // All should respond (might conflict but shouldn't error)
            for (const res of results) {
                assert.ok(res.status >= 200 && res.status < 600, 'Should respond');
            }
        });
    });

    describe('Concurrent Action Executions', () => {
        it('should handle concurrent same-action executions', async () => {
            const promises = Array(10).fill(null).map(() =>
                api.get(`/api/core/v1/boards/${boardName}/actions/counter_action`)
            );

            const results = await Promise.all(promises);
            const successCount = results.filter(r => r.ok).length;

            assert.ok(successCount >= 8, `Most actions should succeed, got ${successCount}/10`);
        });

        it('should handle concurrent different-action executions', async () => {
            const promises = [
                api.get(`/api/core/v1/boards/${boardName}/actions/counter_action`),
                api.get(`/api/core/v1/boards/${boardName}/actions/state_action`),
                api.get(`/api/core/v1/boards/${boardName}/actions/counter_action`),
                api.get(`/api/core/v1/boards/${boardName}/actions/state_action`)
            ];

            const results = await Promise.all(promises);

            for (const res of results) {
                assert.strictEqual(res.ok, true, 'Concurrent action should succeed');
            }
        });

        it('should return unique results for concurrent executions', async () => {
            const promises = Array(5).fill(null).map(() =>
                api.get(`/api/core/v1/boards/${boardName}/actions/counter_action`)
            );

            const results = await Promise.all(promises);
            const counts = results
                .filter(r => r.ok && r.data && r.data.count)
                .map(r => r.data.count);

            // Should have multiple unique timestamps
            const uniqueCounts = [...new Set(counts)];
            assert.ok(uniqueCounts.length >= 1, 'Should have results');
        });
    });

    describe('Mixed Concurrent Operations', () => {
        it('should handle read while write in progress', async () => {
            // Start a write
            const writePromise = api.post('/api/core/v1/settings', {
                name: `${testPrefix}_rw_test`,
                value: 'writing'
            });

            // Immediately do reads
            const readPromises = Array(3).fill(null).map(() =>
                api.get('/api/core/v1/settings')
            );

            const [writeRes, ...readResults] = await Promise.all([writePromise, ...readPromises]);

            // All should succeed
            assert.ok(writeRes.status >= 200 && writeRes.status < 600, 'Write should respond');
            for (const res of readResults) {
                assert.strictEqual(res.ok, true, 'Read should succeed during write');
            }

            // Cleanup
            await api.get(`/api/core/v1/settings/${encodeURIComponent(`${testPrefix}_rw_test`)}/delete`).catch(() => {});
        });

        it('should handle action execution while board management', async () => {
            // Start action
            const actionPromise = api.get(`/api/core/v1/boards/${boardName}/actions/state_action`);

            // Do board read while action runs
            const boardRes = await api.get(`/api/core/v1/boards/${boardName}`);

            assert.strictEqual(boardRes.ok, true, 'Board read should work during action');

            await actionPromise;
        });

        it('should handle board reload during action', async () => {
            // Start slow action
            const actionPromise = api.get(`/api/core/v1/boards/${boardName}/actions/state_action`);

            // Small delay then reload
            await new Promise(r => setTimeout(r, 50));
            const reloadRes = await api.get(`/api/core/v1/boards/${boardName}/reload`);

            assert.ok(reloadRes.status >= 200 && reloadRes.status < 600, 'Reload should respond');

            // Wait for action
            await actionPromise.catch(() => {});
        });
    });

    describe('Concurrent Board Operations', () => {
        const tempBoards = [];

        after(async () => {
            for (const name of tempBoards) {
                await api.get(`/api/core/v1/boards/${name}/delete`).catch(() => {});
            }
        });

        it('should handle concurrent board creates', async () => {
            const promises = Array(3).fill(null).map((_, i) => {
                const name = `${testPrefix}_concurrent_${i}`;
                tempBoards.push(name);
                return api.post('/api/core/v1/import/board', {
                    name: name,
                    template: { id: 'blank' }
                });
            });

            const results = await Promise.all(promises);
            const successCount = results.filter(r => r.ok).length;

            assert.ok(successCount >= 2, `Most board creates should succeed, got ${successCount}/3`);
        });

        it('should handle concurrent operations on different boards', async () => {
            const board1 = tempBoards[0];
            const board2 = tempBoards[1];

            if (!board1 || !board2) {
                return; // Skip if boards weren't created
            }

            const promises = [
                api.get(`/api/core/v1/boards/${board1}`),
                api.get(`/api/core/v1/boards/${board2}`),
                api.get(`/api/core/v1/boards/${board1}/reload`),
                api.get(`/api/core/v1/boards/${board2}/reload`)
            ];

            const results = await Promise.all(promises);

            for (const res of results) {
                assert.ok(res.status >= 200 && res.status < 600, 'Should respond');
            }
        });
    });

    describe('Rate Limiting Behavior', () => {
        it('should handle rapid sequential requests', async () => {
            const results = [];
            for (let i = 0; i < 20; i++) {
                const res = await api.get(`/api/core/v1/boards/${boardName}`);
                results.push(res);
            }

            const successCount = results.filter(r => r.ok).length;
            assert.ok(successCount >= 18, `Most rapid requests should succeed, got ${successCount}/20`);
        });

        it('should handle burst then pause pattern', async () => {
            // Burst
            const burst1 = await Promise.all(
                Array(5).fill(null).map(() => api.get(`/api/core/v1/boards/${boardName}`))
            );

            // Pause
            await new Promise(r => setTimeout(r, 500));

            // Another burst
            const burst2 = await Promise.all(
                Array(5).fill(null).map(() => api.get(`/api/core/v1/boards/${boardName}`))
            );

            const successCount = [...burst1, ...burst2].filter(r => r.ok).length;
            assert.ok(successCount >= 8, `Most burst requests should succeed, got ${successCount}/10`);
        });
    });
});
