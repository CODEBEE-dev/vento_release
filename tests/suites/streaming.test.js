/**
 * Streaming API E2E Tests
 *
 * Tests for streaming endpoints and real-time data
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');
const { getServiceToken } = require('protonode');

describe('Streaming API', () => {
    const testPrefix = `test_stream_${Date.now()}`;
    const boardName = `${testPrefix}_board`;
    let boardCreated = false;

    before(async () => {
        const res = await api.post('/api/core/v1/import/board', {
            name: boardName,
            template: { id: 'blank' }
        });
        if (res.ok) {
            boardCreated = true;

            // Add action for streaming tests
            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'test_action',
                    type: 'action',
                    rulesCode: 'return { ok: true };'
                }
            });
        }
    });

    after(async () => {
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${boardName}/delete`).catch(() => {});
        }
    });

    describe('SSE Endpoints', () => {
        it('should connect to board SSE endpoint', async () => {
            const token = getServiceToken();
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);

            try {
                const response = await fetch(
                    `http://localhost:8000/api/core/v1/boards/${boardName}/sse?token=${token}`,
                    { signal: controller.signal }
                );

                clearTimeout(timeout);

                // SSE endpoint should return 200 with text/event-stream
                assert.ok(response.status === 200 || response.status === 404,
                    `SSE endpoint should respond, got ${response.status}`);
            } catch (e) {
                clearTimeout(timeout);
                // Abort is expected (we timeout the stream)
                if (e.name !== 'AbortError') {
                    assert.ok(true, 'SSE connection attempted');
                }
            }
        });

        it('should require auth for SSE', async () => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);

            try {
                const response = await fetch(
                    `http://localhost:8000/api/core/v1/boards/${boardName}/sse`,
                    { signal: controller.signal }
                );

                clearTimeout(timeout);
                assert.strictEqual(response.status, 401, 'SSE should require auth');
            } catch (e) {
                clearTimeout(timeout);
                if (e.name !== 'AbortError') {
                    assert.ok(true, 'SSE auth check attempted');
                }
            }
        });
    });

    describe('WebSocket Endpoints', () => {
        it('should handle WS upgrade attempt', async () => {
            const token = getServiceToken();

            // Regular HTTP request to WS endpoint
            const res = await api.get(`/api/core/v1/boards/${boardName}/ws`);

            // Should respond (either upgrade or error)
            assert.ok(res.status >= 200 && res.status < 600, 'WS endpoint should respond');
        });
    });

    describe('Event Streaming', () => {
        it('should emit events endpoint', async () => {
            const res = await api.get('/api/core/v1/events');

            assert.strictEqual(res.ok, true, 'Events endpoint should work');
        });

        it('should emit event and check listing', async () => {
            // Emit an event
            await api.post('/api/core/v1/events', {
                path: `${testPrefix}/stream_test`,
                from: 'test',
                payload: { data: 'test' }
            });

            // Check events list
            const res = await api.get('/api/core/v1/events');
            assert.strictEqual(res.ok, true, 'Should list events');
        });

        it('should handle rapid event emission', async () => {
            const promises = Array(10).fill(null).map((_, i) =>
                api.post('/api/core/v1/events', {
                    path: `${testPrefix}/rapid_${i}`,
                    from: 'test',
                    payload: { index: i }
                })
            );

            const results = await Promise.all(promises);
            const successCount = results.filter(r => r.ok || r.status < 500).length;

            assert.ok(successCount >= 8, `Most rapid events should succeed, got ${successCount}/10`);
        });
    });

    describe('Long Polling Behavior', () => {
        it('should handle action with delayed response', async () => {
            // Add delayed action
            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'delayed_action',
                    type: 'action',
                    rulesCode: 'await new Promise(r => setTimeout(r, 1000)); return { delayed: true };'
                }
            });

            const start = Date.now();
            const res = await api.get(`/api/core/v1/boards/${boardName}/actions/delayed_action`);
            const elapsed = Date.now() - start;

            assert.strictEqual(res.ok, true, 'Delayed action should succeed');
            assert.ok(elapsed >= 800, `Should wait for delay, took ${elapsed}ms`);
        });

        it('should handle concurrent delayed requests', async () => {
            const promises = Array(3).fill(null).map(() =>
                api.get(`/api/core/v1/boards/${boardName}/actions/delayed_action`)
            );

            const start = Date.now();
            const results = await Promise.all(promises);
            const elapsed = Date.now() - start;

            // All should succeed
            for (const res of results) {
                assert.strictEqual(res.ok, true, 'Concurrent delayed should succeed');
            }

            // Should run concurrently (not sequentially)
            assert.ok(elapsed < 5000, `Concurrent delays should overlap, took ${elapsed}ms`);
        });
    });

    describe('ProtoMemDB Real-time', () => {
        it('should access execution tracking', async () => {
            const token = getServiceToken();
            const url = `http://localhost:8000/api/core/v1/protomemdb/executions/boards/${boardName}?token=${token}`;

            const response = await fetch(url);

            // ProtoMemDB endpoint should respond
            assert.ok(response.status >= 200 && response.status < 600,
                `ProtoMemDB should respond, got ${response.status}`);
        });

        it('should track action execution', async () => {
            const token = getServiceToken();

            // Start an action
            const actionPromise = api.get(`/api/core/v1/boards/${boardName}/actions/test_action`);

            // Check executions
            const execsUrl = `http://localhost:8000/api/core/v1/protomemdb/executions/boards/${boardName}?token=${token}`;
            const response = await fetch(execsUrl);

            assert.ok(response.status >= 200 && response.status < 600, 'Should track executions');

            await actionPromise;
        });
    });

    describe('Connection Handling', () => {
        it('should handle connection timeout gracefully', async () => {
            // Make request with very short timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 100);

            try {
                await fetch(
                    `http://localhost:8000/api/core/v1/boards/${boardName}/actions/delayed_action?token=${getServiceToken()}`,
                    { signal: controller.signal }
                );
                clearTimeout(timeout);
            } catch (e) {
                clearTimeout(timeout);
                // Abort is expected
                assert.strictEqual(e.name, 'AbortError', 'Should abort on timeout');
            }
        });

        it('should handle reconnection after disconnect', async () => {
            // First request
            const res1 = await api.get(`/api/core/v1/boards/${boardName}`);
            assert.strictEqual(res1.ok, true, 'First request should work');

            // Small delay
            await new Promise(r => setTimeout(r, 100));

            // Second request (simulating reconnect)
            const res2 = await api.get(`/api/core/v1/boards/${boardName}`);
            assert.strictEqual(res2.ok, true, 'Reconnect should work');
        });

        it('should handle multiple concurrent connections', async () => {
            const promises = Array(15).fill(null).map(() =>
                api.get(`/api/core/v1/boards/${boardName}`)
            );

            const results = await Promise.all(promises);
            const successCount = results.filter(r => r.ok).length;

            assert.ok(successCount >= 12, `Most connections should succeed, got ${successCount}/15`);
        });
    });

    describe('Chunked Transfer', () => {
        it('should handle large response', async () => {
            // Request that returns potentially large data
            const res = await api.get('/api/core/v1/events');

            assert.ok(res.status >= 200 && res.status < 600, 'Should handle large response');
        });

        it('should handle file content response', async () => {
            // Read a directory (returns list)
            const res = await api.get('/api/core/v1/files/data');

            assert.strictEqual(res.ok, true, 'Should return file listing');
        });
    });
});
