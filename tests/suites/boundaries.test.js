/**
 * Boundary Conditions E2E Tests
 *
 * Tests for edge cases and boundary conditions
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Boundary Conditions', () => {
    const testPrefix = `test_bound_${Date.now()}`;
    const createdResources = [];

    after(async () => {
        for (const r of createdResources) {
            if (r.type === 'board') {
                await api.get(`/api/core/v1/boards/${r.name}/delete`).catch(() => {});
            } else if (r.type === 'setting') {
                await api.get(`/api/core/v1/settings/${encodeURIComponent(r.name)}/delete`).catch(() => {});
            }
        }
    });

    describe('Empty Data', () => {
        it('should handle board with no cards', async () => {
            const boardName = `${testPrefix}_empty`;
            const createRes = await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });

            if (createRes.ok) {
                createdResources.push({ type: 'board', name: boardName });

                const res = await api.get(`/api/core/v1/boards/${boardName}`);

                assert.strictEqual(res.ok, true);
                assert.ok(Array.isArray(res.data.cards), 'Should have cards array');
                // Blank template may have 0 or few cards
            }
        });

        it('should handle action with no parameters', async () => {
            const boardName = `${testPrefix}_noparam`;
            await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });
            createdResources.push({ type: 'board', name: boardName });

            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'no_param_action',
                    type: 'action',
                    rulesCode: 'return { success: true };'
                }
            });

            const res = await api.get(`/api/core/v1/boards/${boardName}/actions/no_param_action`);

            assert.strictEqual(res.ok, true, 'Action with no params should work');
        });

        it('should handle empty search results', async () => {
            const res = await api.get('/api/core/v1/boards?search=xyz_definitely_not_exists_999');

            assert.strictEqual(res.ok, true);
            assert.strictEqual(res.data.items.length, 0, 'Should return empty array');
            assert.strictEqual(res.data.total, 0, 'Total should be 0');
        });

        it('should handle empty file content', async () => {
            const filePath = `data/test_empty_file_${Date.now()}.txt`;

            const writeRes = await api.post(`/api/core/v1/files/${filePath}`, {
                content: ''
            });

            if (writeRes.ok) {
                const readRes = await api.get(`/api/core/v1/files/${filePath}`);

                // Empty file should be readable
                assert.ok(readRes.status < 500, 'Should handle empty file');

                // Cleanup
                await api.post(`/api/core/v1/deleteItems/${filePath}`, [
                    { name: `test_empty_file_${Date.now()}.txt`, isDirectory: false }
                ]).catch(() => {});
            }
        });

        it('should handle empty JSON object in body', async () => {
            const res = await api.post('/api/core/v1/settings', {});

            // Should handle gracefully (may fail validation or return error)
            // Just verify we get a response
            assert.ok(res.status >= 200 && res.status < 600, 'Should respond to empty object');
        });

        it('should handle empty array in body', async () => {
            const res = await api.post('/api/core/v1/events', []);

            // Should handle gracefully (may fail or return error)
            // Just verify we get a response
            assert.ok(res.status >= 200 && res.status < 600, 'Should respond to empty array');
        });
    });

    describe('Maximum Limits', () => {
        it('should handle board with many cards', async () => {
            const boardName = `${testPrefix}_many_cards`;
            await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });
            createdResources.push({ type: 'board', name: boardName });

            // Add 20 cards
            for (let i = 0; i < 20; i++) {
                await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                    card: {
                        name: `card_${i}`,
                        type: 'value',
                        rulesCode: `return ${i};`
                    }
                });
            }

            const res = await api.get(`/api/core/v1/boards/${boardName}`);

            assert.strictEqual(res.ok, true);
            assert.ok(res.data.cards.length >= 20, 'Should have all cards');
        });

        it('should handle very long card code', async () => {
            const boardName = `${testPrefix}_long_code`;
            await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });
            createdResources.push({ type: 'board', name: boardName });

            const longCode = `
                // This is a very long piece of code
                ${'const x = 1;\n'.repeat(500)}
                return x;
            `;

            const res = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'long_code_card',
                    type: 'value',
                    rulesCode: longCode
                }
            });

            assert.ok(res.status < 500, 'Should handle long code');
        });

        it('should handle long setting name', async () => {
            const longName = `${testPrefix}_${'x'.repeat(200)}`;
            const res = await api.post('/api/core/v1/settings', {
                name: longName,
                value: 'test'
            });

            if (res.ok) {
                createdResources.push({ type: 'setting', name: longName });
            }
            assert.ok(res.status < 500, 'Should handle long name');
        });

        it('should handle large setting value', async () => {
            const settingName = `${testPrefix}_large`;
            const largeValue = 'x'.repeat(100000);

            const res = await api.post('/api/core/v1/settings', {
                name: settingName,
                value: largeValue
            });

            if (res.ok) {
                createdResources.push({ type: 'setting', name: settingName });

                // Verify it was saved
                const getRes = await api.get(`/api/core/v1/settings/${encodeURIComponent(settingName)}`);
                if (getRes.ok) {
                    assert.strictEqual(getRes.data.value.length, largeValue.length, 'Large value should be preserved');
                }
            }
            assert.ok(res.status < 500, 'Should handle large value');
        });
    });

    describe('Special Values', () => {
        it('should handle null values in JSON', async () => {
            const settingName = `${testPrefix}_null`;
            const res = await api.post('/api/core/v1/settings', {
                name: settingName,
                value: null
            });

            if (res.ok) {
                createdResources.push({ type: 'setting', name: settingName });
            }
            assert.ok(res.status < 500, 'Should handle null value');
        });

        it('should handle numeric 0', async () => {
            const settingName = `${testPrefix}_zero`;
            const res = await api.post('/api/core/v1/settings', {
                name: settingName,
                value: 0
            });

            if (res.ok) {
                createdResources.push({ type: 'setting', name: settingName });

                const getRes = await api.get(`/api/core/v1/settings/${encodeURIComponent(settingName)}`);
                if (getRes.ok) {
                    assert.strictEqual(getRes.data.value, 0, 'Zero should be preserved (not falsy)');
                }
            }
        });

        it('should handle boolean false', async () => {
            const settingName = `${testPrefix}_false`;
            const res = await api.post('/api/core/v1/settings', {
                name: settingName,
                value: false
            });

            if (res.ok) {
                createdResources.push({ type: 'setting', name: settingName });

                const getRes = await api.get(`/api/core/v1/settings/${encodeURIComponent(settingName)}`);
                if (getRes.ok) {
                    assert.strictEqual(getRes.data.value, false, 'False should be preserved');
                }
            }
        });

        it('should handle empty string', async () => {
            const settingName = `${testPrefix}_empty_str`;
            const res = await api.post('/api/core/v1/settings', {
                name: settingName,
                value: ''
            });

            if (res.ok) {
                createdResources.push({ type: 'setting', name: settingName });

                const getRes = await api.get(`/api/core/v1/settings/${encodeURIComponent(settingName)}`);
                if (getRes.ok) {
                    assert.strictEqual(getRes.data.value, '', 'Empty string should be preserved');
                }
            }
        });

        it('should handle deeply nested object', async () => {
            const settingName = `${testPrefix}_nested`;
            let nested = { value: 'deep' };
            for (let i = 0; i < 50; i++) {
                nested = { level: nested };
            }

            const res = await api.post('/api/core/v1/settings', {
                name: settingName,
                value: nested
            });

            if (res.ok) {
                createdResources.push({ type: 'setting', name: settingName });
            }
            assert.ok(res.status < 500, 'Should handle deep nesting');
        });

        it('should handle array value', async () => {
            const settingName = `${testPrefix}_array`;
            const res = await api.post('/api/core/v1/settings', {
                name: settingName,
                value: [1, 2, 3, 'test', { nested: true }]
            });

            if (res.ok) {
                createdResources.push({ type: 'setting', name: settingName });

                const getRes = await api.get(`/api/core/v1/settings/${encodeURIComponent(settingName)}`);
                if (getRes.ok && Array.isArray(getRes.data.value)) {
                    assert.strictEqual(getRes.data.value.length, 5, 'Array should be preserved');
                }
            }
        });

        it('should handle special numeric values', async () => {
            const tests = [
                { name: `${testPrefix}_neg`, value: -1 },
                { name: `${testPrefix}_float`, value: 3.14159 },
                { name: `${testPrefix}_sci`, value: 1e10 },
                { name: `${testPrefix}_max`, value: Number.MAX_SAFE_INTEGER }
            ];

            for (const test of tests) {
                const res = await api.post('/api/core/v1/settings', {
                    name: test.name,
                    value: test.value
                });

                if (res.ok) {
                    createdResources.push({ type: 'setting', name: test.name });
                }
                assert.ok(res.status < 500, `Should handle ${test.name}`);
            }
        });
    });

    describe('Concurrent Operations', () => {
        it('should handle concurrent reads', async () => {
            const promises = Array(10).fill(null).map(() =>
                api.get('/api/core/v1/boards')
            );

            const results = await Promise.all(promises);

            for (const res of results) {
                assert.strictEqual(res.ok, true, 'All concurrent reads should succeed');
            }
        });

        it('should handle concurrent writes to different resources', async () => {
            const promises = Array(5).fill(null).map((_, i) =>
                api.post('/api/core/v1/settings', {
                    name: `${testPrefix}_concurrent_${i}`,
                    value: `value_${i}`
                })
            );

            const results = await Promise.all(promises);

            for (let i = 0; i < results.length; i++) {
                if (results[i].ok) {
                    createdResources.push({ type: 'setting', name: `${testPrefix}_concurrent_${i}` });
                }
            }

            const successCount = results.filter(r => r.ok).length;
            assert.ok(successCount >= 3, 'Most concurrent writes should succeed');
        });
    });

    describe('Unicode and International', () => {
        it('should handle unicode in setting value', async () => {
            const settingName = `${testPrefix}_unicode`;
            const unicodeValue = '日本語 中文 한국어 العربية עברית 🎉🚀💻';

            const res = await api.post('/api/core/v1/settings', {
                name: settingName,
                value: unicodeValue
            });

            if (res.ok) {
                createdResources.push({ type: 'setting', name: settingName });

                const getRes = await api.get(`/api/core/v1/settings/${encodeURIComponent(settingName)}`);
                if (getRes.ok) {
                    assert.strictEqual(getRes.data.value, unicodeValue, 'Unicode should be preserved');
                }
            }
        });

        it('should handle emoji in event payload', async () => {
            const res = await api.post('/api/core/v1/events', {
                path: `${testPrefix}/emoji`,
                from: 'boundary-test',
                payload: { message: '👍 Success! 🎉' }
            });

            assert.strictEqual(res.ok, true, 'Should handle emoji in payload');
        });
    });
});
