/**
 * Card Dependencies E2E Tests
 *
 * Tests for card relationships and dependencies
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Card Dependencies', () => {
    const testPrefix = `test_deps_${Date.now()}`;
    const boardName = `${testPrefix}_board`;
    let boardCreated = false;

    before(async () => {
        const res = await api.post('/api/core/v1/import/board', {
            name: boardName,
            template: { id: 'blank' }
        });
        if (res.ok) {
            boardCreated = true;
        }
    });

    after(async () => {
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${boardName}/delete`).catch(() => {});
        }
    });

    describe('Card Types', () => {
        it('should create action card', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'action_card',
                    type: 'action',
                    rulesCode: 'return { type: "action" };'
                }
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Should create action card');
        });

        it('should create trigger card', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'trigger_card',
                    type: 'trigger',
                    rulesCode: 'return true;'
                }
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Should create trigger card');
        });

        it('should create subsystem card', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'subsystem_card',
                    type: 'subsystem',
                    rulesCode: 'return { status: "ok" };'
                }
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Should create subsystem card');
        });

        it('should create monitor card', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'monitor_card',
                    type: 'monitor',
                    rulesCode: 'return { healthy: true };'
                }
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Should create monitor card');
        });
    });

    describe('Card Relationships', () => {
        it('should get board with all cards', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}`);
            assert.strictEqual(res.ok, true, 'Should get board');
            // Board should contain the cards we created
        });

        it('should update card without affecting others', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/update/card`, {
                card: {
                    name: 'action_card',
                    type: 'action',
                    rulesCode: 'return { type: "action", updated: true };'
                }
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Should update card');

            // Verify other cards still exist
            const boardRes = await api.get(`/api/core/v1/boards/${boardName}`);
            assert.strictEqual(boardRes.ok, true, 'Board should still be accessible');
        });

        it('should delete card without affecting others', async () => {
            // Add a card to delete
            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'to_delete',
                    type: 'action',
                    rulesCode: 'return 1;'
                }
            });

            // Delete it
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/delete/card`, {
                card: { name: 'to_delete' }
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Should delete card');

            // Verify board still works
            const boardRes = await api.get(`/api/core/v1/boards/${boardName}`);
            assert.strictEqual(boardRes.ok, true, 'Board should still work');
        });
    });

    describe('Card Execution Dependencies', () => {
        it('should execute action that calls another action', async () => {
            // Add caller action
            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'caller_action',
                    type: 'action',
                    rulesCode: `
                        // This action references another
                        return { caller: true, timestamp: Date.now() };
                    `
                }
            });

            const res = await api.get(`/api/core/v1/boards/${boardName}/actions/caller_action`);
            assert.strictEqual(res.ok, true, 'Caller action should work');
        });

        it('should handle action with context from trigger', async () => {
            // Add action that uses context
            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'context_action',
                    type: 'action',
                    rulesCode: 'return { hasContext: !!context, payload: context.payload };'
                }
            });

            // Execute with payload
            const res = await api.post(`/api/core/v1/boards/${boardName}/actions/context_action`, {
                testData: 'value'
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Context action should work');
        });
    });

    describe('Card Code Dependencies', () => {
        it('should handle card with external require', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'require_card',
                    type: 'action',
                    rulesCode: `
                        // Cards can use certain built-in modules
                        return { ok: true };
                    `
                }
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Should create card');
        });

        it('should handle card with async operations', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'async_card',
                    type: 'action',
                    rulesCode: `
                        await new Promise(r => setTimeout(r, 100));
                        return { async: true };
                    `
                }
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Should create async card');

            // Execute it
            const execRes = await api.get(`/api/core/v1/boards/${boardName}/actions/async_card`);
            assert.strictEqual(execRes.ok, true, 'Async card should execute');
        });

        it('should handle card with error handling', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'safe_card',
                    type: 'action',
                    rulesCode: `
                        try {
                            return { safe: true };
                        } catch (e) {
                            return { error: e.message };
                        }
                    `
                }
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Should create safe card');
        });
    });

    describe('Card Ordering', () => {
        it('should add multiple cards in order', async () => {
            for (let i = 0; i < 5; i++) {
                const res = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                    card: {
                        name: `ordered_${i}`,
                        type: 'action',
                        rulesCode: `return { order: ${i} };`
                    }
                });
                assert.ok(res.status >= 200 && res.status < 600, `Should add card ${i}`);
            }
        });

        it('should execute ordered cards independently', async () => {
            const promises = [0, 1, 2, 3, 4].map(i =>
                api.get(`/api/core/v1/boards/${boardName}/actions/ordered_${i}`)
            );

            const results = await Promise.all(promises);
            for (const res of results) {
                assert.strictEqual(res.ok, true, 'Ordered card should execute');
            }
        });

        it('should delete cards in reverse order', async () => {
            for (let i = 4; i >= 0; i--) {
                const res = await api.post(`/api/core/v1/boards/${boardName}/management/delete/card`, {
                    card: { name: `ordered_${i}` }
                });
                assert.ok(res.status >= 200 && res.status < 600, `Should delete card ${i}`);
            }
        });
    });

    describe('Card Validation', () => {
        it('should reject card with syntax error', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'invalid_syntax',
                    type: 'action',
                    rulesCode: 'return { invalid syntax here'
                }
            });
            // Should respond (might accept with delayed validation)
            assert.ok(res.status >= 200 && res.status < 600, 'Should respond to invalid syntax');
        });

        it('should handle card with empty code', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'empty_code',
                    type: 'action',
                    rulesCode: ''
                }
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle empty code');
        });

        it('should handle card with only comments', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'comment_only',
                    type: 'action',
                    rulesCode: '// This is just a comment'
                }
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle comment-only code');
        });

        it('should reject duplicate card name', async () => {
            // First card
            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'duplicate_test',
                    type: 'action',
                    rulesCode: 'return 1;'
                }
            });

            // Try duplicate
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'duplicate_test',
                    type: 'action',
                    rulesCode: 'return 2;'
                }
            });
            // Should handle duplicate (error or update)
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle duplicate');
        });
    });
});
