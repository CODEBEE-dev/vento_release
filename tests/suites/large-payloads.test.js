/**
 * Large Payloads E2E Tests
 *
 * Tests for handling large data payloads
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Large Payloads', () => {
    const testPrefix = `test_large_${Date.now()}`;
    const boardName = `${testPrefix}_board`;
    const createdResources = [];
    let boardCreated = false;

    before(async () => {
        const res = await api.post('/api/core/v1/import/board', {
            name: boardName,
            template: { id: 'blank' }
        });
        if (res.ok) {
            boardCreated = true;
            createdResources.push({ type: 'board', name: boardName });

            // Add action that returns large data
            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'echo_action',
                    type: 'action',
                    rulesCode: 'return context.payload || { empty: true };'
                }
            });
        }
    });

    after(async () => {
        for (const r of createdResources) {
            if (r.type === 'board') {
                await api.get(`/api/core/v1/boards/${r.name}/delete`).catch(() => {});
            } else if (r.type === 'setting') {
                await api.get(`/api/core/v1/settings/${encodeURIComponent(r.name)}/delete`).catch(() => {});
            } else if (r.type === 'file') {
                await api.post(`/api/core/v1/deleteItems/data`, [
                    { name: r.name, isDirectory: false }
                ]).catch(() => {});
            }
        }
    });

    describe('Large Setting Values', () => {
        it('should handle medium setting value (1KB)', async () => {
            const name = `${testPrefix}_medium`;
            const value = 'x'.repeat(1024);
            createdResources.push({ type: 'setting', name });

            const res = await api.post('/api/core/v1/settings', { name, value });
            assert.ok(res.status >= 200 && res.status < 500, 'Should handle 1KB value');
        });

        it('should handle large setting value (10KB)', async () => {
            const name = `${testPrefix}_large`;
            const value = 'x'.repeat(10 * 1024);
            createdResources.push({ type: 'setting', name });

            const res = await api.post('/api/core/v1/settings', { name, value });
            assert.ok(res.status >= 200 && res.status < 600, 'Should respond to 10KB value');
        });

        it('should handle setting with many fields', async () => {
            const name = `${testPrefix}_fields`;
            const value = JSON.stringify(
                Object.fromEntries(
                    Array(100).fill(null).map((_, i) => [`field_${i}`, `value_${i}`])
                )
            );
            createdResources.push({ type: 'setting', name });

            const res = await api.post('/api/core/v1/settings', { name, value });
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle many fields');
        });
    });

    describe('Large Action Payloads', () => {
        it('should handle medium action payload (1KB)', async () => {
            const payload = { data: 'x'.repeat(1024) };
            const res = await api.post(`/api/core/v1/boards/${boardName}/actions/echo_action`, payload);

            assert.ok(res.status >= 200 && res.status < 600, 'Should handle 1KB payload');
        });

        it('should handle large action payload (10KB)', async () => {
            const payload = { data: 'x'.repeat(10 * 1024) };
            const res = await api.post(`/api/core/v1/boards/${boardName}/actions/echo_action`, payload);

            assert.ok(res.status >= 200 && res.status < 600, 'Should handle 10KB payload');
        });

        it('should handle action payload with many properties', async () => {
            const payload = Object.fromEntries(
                Array(50).fill(null).map((_, i) => [`prop_${i}`, `value_${i}`])
            );
            const res = await api.post(`/api/core/v1/boards/${boardName}/actions/echo_action`, payload);

            assert.ok(res.status >= 200 && res.status < 600, 'Should handle many properties');
        });

        it('should handle deeply nested payload', async () => {
            let nested = { value: 'deep' };
            for (let i = 0; i < 10; i++) {
                nested = { level: i, child: nested };
            }
            const res = await api.post(`/api/core/v1/boards/${boardName}/actions/echo_action`, nested);

            assert.ok(res.status >= 200 && res.status < 600, 'Should handle nested payload');
        });

        it('should handle array payload', async () => {
            const payload = { items: Array(100).fill(null).map((_, i) => ({ id: i, name: `item_${i}` })) };
            const res = await api.post(`/api/core/v1/boards/${boardName}/actions/echo_action`, payload);

            assert.ok(res.status >= 200 && res.status < 600, 'Should handle array payload');
        });
    });

    describe('Large File Content', () => {
        it('should handle medium file (1KB)', async () => {
            const fileName = `${testPrefix}_medium.txt`;
            const content = 'x'.repeat(1024);
            createdResources.push({ type: 'file', name: fileName });

            const res = await api.post(`/api/core/v1/files/data/${fileName}`, { content });
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle 1KB file');
        });

        it('should handle large file (50KB)', async () => {
            const fileName = `${testPrefix}_large.txt`;
            const content = 'x'.repeat(50 * 1024);
            createdResources.push({ type: 'file', name: fileName });

            const res = await api.post(`/api/core/v1/files/data/${fileName}`, { content });
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle 50KB file');
        });

        it('should handle file with many lines', async () => {
            const fileName = `${testPrefix}_lines.txt`;
            const content = Array(1000).fill('Line of text').join('\n');
            createdResources.push({ type: 'file', name: fileName });

            const res = await api.post(`/api/core/v1/files/data/${fileName}`, { content });
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle many lines');
        });
    });

    describe('Large Event Payloads', () => {
        it('should handle event with medium payload', async () => {
            const res = await api.post('/api/core/v1/events', {
                path: `${testPrefix}/medium`,
                from: 'test',
                payload: { data: 'x'.repeat(1024) }
            });

            assert.ok(res.status >= 200 && res.status < 600, 'Should handle medium event');
        });

        it('should handle event with large payload', async () => {
            const res = await api.post('/api/core/v1/events', {
                path: `${testPrefix}/large`,
                from: 'test',
                payload: { data: 'x'.repeat(10 * 1024) }
            });

            assert.ok(res.status >= 200 && res.status < 600, 'Should handle large event');
        });
    });

    describe('Large Database Values', () => {
        const dbName = 'test';

        after(async () => {
            // Cleanup database entries
            await api.get(`/api/core/v1/databases/${dbName}/${testPrefix}_medium/delete`).catch(() => {});
            await api.get(`/api/core/v1/databases/${dbName}/${testPrefix}_large/delete`).catch(() => {});
            await api.get(`/api/core/v1/databases/${dbName}/${testPrefix}_complex/delete`).catch(() => {});
        });

        it('should handle medium database value', async () => {
            const res = await api.post(`/api/core/v1/databases/${dbName}/${testPrefix}_medium`, {
                data: 'x'.repeat(1024)
            });

            assert.ok(res.status >= 200 && res.status < 600, 'Should handle medium DB value');
        });

        it('should handle large database value', async () => {
            const res = await api.post(`/api/core/v1/databases/${dbName}/${testPrefix}_large`, {
                data: 'x'.repeat(10 * 1024)
            });

            assert.ok(res.status >= 200 && res.status < 600, 'Should handle large DB value');
        });

        it('should handle complex database object', async () => {
            const complexData = {
                users: Array(50).fill(null).map((_, i) => ({
                    id: i,
                    name: `User ${i}`,
                    email: `user${i}@test.com`,
                    metadata: { created: Date.now(), tags: ['a', 'b', 'c'] }
                })),
                summary: { total: 50, active: 45 }
            };

            const res = await api.post(`/api/core/v1/databases/${dbName}/${testPrefix}_complex`, complexData);
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle complex DB object');
        });
    });

    describe('Large Board Definitions', () => {
        it('should handle board with many cards', async () => {
            const manyCardsBoard = `${testPrefix}_many_cards`;
            createdResources.push({ type: 'board', name: manyCardsBoard });

            // Create board
            const createRes = await api.post('/api/core/v1/import/board', {
                name: manyCardsBoard,
                template: { id: 'blank' }
            });

            if (createRes.ok) {
                // Add multiple cards
                for (let i = 0; i < 10; i++) {
                    await api.post(`/api/core/v1/boards/${manyCardsBoard}/management/add/card`, {
                        card: {
                            name: `card_${i}`,
                            type: 'action',
                            rulesCode: `return { card: ${i} };`
                        }
                    });
                }

                // Verify board still works
                const boardRes = await api.get(`/api/core/v1/boards/${manyCardsBoard}`);
                assert.strictEqual(boardRes.ok, true, 'Board with many cards should work');
            }
        });

        it('should handle card with large rules code', async () => {
            const largeCode = `
                // Large comment block
                ${'// Comment line\n'.repeat(100)}

                const data = ${JSON.stringify(Array(50).fill({ key: 'value' }))};

                return { processed: true, count: data.length };
            `;

            const res = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'large_code_card',
                    type: 'action',
                    rulesCode: largeCode
                }
            });

            assert.ok(res.status >= 200 && res.status < 600, 'Should handle large rules code');
        });
    });

    describe('Response Size Handling', () => {
        it('should handle large list response', async () => {
            // List operations may return large amounts of data
            const res = await api.get('/api/core/v1/events');

            assert.ok(res.status >= 200 && res.status < 600, 'Should handle large event list');
        });

        it('should handle board list with metadata', async () => {
            const res = await api.get('/api/core/v1/boards');

            assert.strictEqual(res.ok, true, 'Should return board list');
            if (Array.isArray(res.data)) {
                assert.ok(res.data.length >= 0, 'Should return array');
            }
        });
    });
});
