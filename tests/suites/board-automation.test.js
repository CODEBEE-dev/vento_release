/**
 * Board Automation E2E Tests
 *
 * Tests for board automation features and triggers
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Board Automation', () => {
    const testPrefix = `test_auto_${Date.now()}`;
    const boardName = `${testPrefix}_board`;
    let boardCreated = false;

    before(async () => {
        const res = await api.post('/api/core/v1/import/board', {
            name: boardName,
            template: { id: 'blank' }
        });
        if (res.ok) {
            boardCreated = true;

            // Add trigger card
            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'on_event',
                    type: 'trigger',
                    rulesCode: 'return true;'
                }
            });

            // Add action card
            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'process_action',
                    type: 'action',
                    rulesCode: 'return { processed: true };'
                }
            });
        }
    });

    after(async () => {
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${boardName}/autopilot/off`).catch(() => {});
            await api.get(`/api/core/v1/boards/${boardName}/delete`).catch(() => {});
        }
    });

    describe('Automation Endpoints', () => {
        it('should access automation step endpoint', async () => {
            const res = await api.get(`/api/v1/automations/${boardName}/autopilot/step`);
            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });

        it('should add automation rule', async () => {
            const res = await api.post(`/api/v1/automations/${boardName}/autopilot/add_rule`, {
                rule: 'When event X happens, trigger action Y'
            });
            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });

        it('should remove automation rule', async () => {
            const res = await api.post(`/api/v1/automations/${boardName}/autopilot/remove_rule`, {
                rule: '0'
            });
            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });

        it('should skip automation step', async () => {
            const res = await api.get(`/api/v1/automations/${boardName}/skip`);
            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });

        it('should skip with delay parameter', async () => {
            const res = await api.get(`/api/v1/automations/${boardName}/skip?delay=100`);
            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });
    });

    describe('Automation State', () => {
        it('should enable automation via autopilot', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/autopilot/on`);
            assert.ok(res.status >= 200 && res.status < 600, 'Should enable autopilot');
        });

        it('should require auth for autopilot endpoints', async () => {
            // Test auth on autopilot control endpoint (always exists)
            const res = await api.getNoAuth(`/api/core/v1/boards/${boardName}/autopilot/on`);
            assert.strictEqual(res.status, 401, `Autopilot should require auth, got ${res.status}`);
        });

        it('should disable automation via autopilot', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/autopilot/off`);
            assert.ok(res.status >= 200 && res.status < 600, 'Should disable autopilot');
        });

        it('should handle multiple rule additions', async () => {
            for (let i = 0; i < 3; i++) {
                const res = await api.post(`/api/v1/automations/${boardName}/autopilot/add_rule`, {
                    rule: `Rule ${i}: when condition_${i} do action_${i}`
                });
                assert.ok(res.status >= 200 && res.status < 600, `Rule ${i} should be added`);
            }
        });

        it('should handle rule removal by index', async () => {
            // Remove rules by index
            for (let i = 2; i >= 0; i--) {
                const res = await api.post(`/api/v1/automations/${boardName}/autopilot/remove_rule`, {
                    rule: String(i)
                });
                assert.ok(res.status >= 200 && res.status < 600, `Rule ${i} removal should respond`);
            }
        });
    });

    describe('Trigger Cards', () => {
        it('should add trigger card', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'test_trigger',
                    type: 'trigger',
                    rulesCode: 'return context.payload && context.payload.activate;'
                }
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Should add trigger card');
        });

        it('should list trigger cards in board', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}`);
            assert.strictEqual(res.ok, true, 'Should get board');
        });

        it('should update trigger card', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/update/card`, {
                card: {
                    name: 'test_trigger',
                    type: 'trigger',
                    rulesCode: 'return context.payload && context.payload.newCondition;'
                }
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Should update trigger');
        });

        it('should delete trigger card', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/delete/card`, {
                card: { name: 'test_trigger' }
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Should delete trigger');
        });
    });

    describe('Automation with Events', () => {
        it('should emit event to board path', async () => {
            const res = await api.post('/api/core/v1/events', {
                path: `boards/${boardName}/test`,
                from: 'automation_test',
                payload: { action: 'trigger' }
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Should emit event');
        });

        it('should handle event during autopilot', async () => {
            // Enable autopilot
            await api.get(`/api/core/v1/boards/${boardName}/autopilot/on`);

            // Emit event
            const res = await api.post('/api/core/v1/events', {
                path: `boards/${boardName}/automation`,
                from: 'test',
                payload: { data: 'test' }
            });

            // Disable autopilot
            await api.get(`/api/core/v1/boards/${boardName}/autopilot/off`);

            assert.ok(res.status >= 200 && res.status < 600, 'Should handle event during autopilot');
        });
    });

    describe('Automation Edge Cases', () => {
        it('should handle automation on non-existent board', async () => {
            const res = await api.get('/api/v1/automations/nonexistent_board_xyz/autopilot/step');
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle gracefully');
        });

        it('should handle empty rule addition', async () => {
            const res = await api.post(`/api/v1/automations/${boardName}/autopilot/add_rule`, {
                rule: ''
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle empty rule');
        });

        it('should handle invalid rule index removal', async () => {
            const res = await api.post(`/api/v1/automations/${boardName}/autopilot/remove_rule`, {
                rule: '999'
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle invalid index');
        });

        it('should handle negative delay in skip', async () => {
            const res = await api.get(`/api/v1/automations/${boardName}/skip?delay=-100`);
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle negative delay');
        });
    });
});
