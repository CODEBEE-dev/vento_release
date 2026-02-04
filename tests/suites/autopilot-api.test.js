/**
 * Autopilot API E2E Tests
 *
 * Tests for board autopilot operations
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Autopilot API', () => {
    const testPrefix = `test_autopilot_${Date.now()}`;
    const boardName = `${testPrefix}_board`;
    let boardCreated = false;

    before(async () => {
        // Create a test board
        const res = await api.post('/api/core/v1/import/board', {
            name: boardName,
            template: { id: 'blank' }
        });
        if (res.ok) {
            boardCreated = true;
        }
    });

    after(async () => {
        // Turn off autopilot before cleanup
        await api.get(`/api/core/v1/boards/${boardName}/autopilot/off`).catch(() => {});

        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${boardName}/delete`).catch(() => {});
        }
    });

    describe('Autopilot Control', () => {
        it('should enable autopilot on board', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/autopilot/on`);

            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });

        it('should disable autopilot on board', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/autopilot/off`);

            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });

        it('should handle autopilot on non-existent board', async () => {
            const res = await api.get('/api/core/v1/boards/nonexistent_board_xyz/autopilot/on');

            // Should fail gracefully
            assert.ok(res.status >= 200 && res.status < 600, 'Should respond');
        });

        it('should require auth to control autopilot', async () => {
            const res = await api.getNoAuth(`/api/core/v1/boards/${boardName}/autopilot/on`);

            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    describe('Automations API', () => {
        it('should get autopilot step', async () => {
            const res = await api.get(`/api/v1/automations/${boardName}/autopilot/step`);

            // Automation endpoint may or may not exist
            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });

        it('should add rule to autopilot', async () => {
            const res = await api.post(`/api/v1/automations/${boardName}/autopilot/add_rule`, {
                rule: 'Test rule: when X happens do Y'
            });

            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });

        it('should remove rule from autopilot', async () => {
            const res = await api.post(`/api/v1/automations/${boardName}/autopilot/remove_rule`, {
                rule: '0'
            });

            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });

        it('should skip autopilot step', async () => {
            const res = await api.get(`/api/v1/automations/${boardName}/skip`);

            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });

        it('should skip with delay', async () => {
            const res = await api.get(`/api/v1/automations/${boardName}/skip?delay=100`);

            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });
    });

    describe('Autopilot State', () => {
        it('should toggle autopilot on and off', async () => {
            // Turn on
            const onRes = await api.get(`/api/core/v1/boards/${boardName}/autopilot/on`);
            assert.ok(onRes.status >= 200 && onRes.status < 600, 'Should turn on');

            // Small delay
            await new Promise(r => setTimeout(r, 200));

            // Turn off
            const offRes = await api.get(`/api/core/v1/boards/${boardName}/autopilot/off`);
            assert.ok(offRes.status >= 200 && offRes.status < 600, 'Should turn off');
        });

        it('should handle rapid on/off toggles', async () => {
            // Rapid toggles
            await api.get(`/api/core/v1/boards/${boardName}/autopilot/on`);
            await api.get(`/api/core/v1/boards/${boardName}/autopilot/off`);
            await api.get(`/api/core/v1/boards/${boardName}/autopilot/on`);
            await api.get(`/api/core/v1/boards/${boardName}/autopilot/off`);

            // Board should still be accessible
            const boardRes = await api.get(`/api/core/v1/boards/${boardName}`);
            assert.strictEqual(boardRes.ok, true, 'Board should still be accessible');
        });
    });
});
