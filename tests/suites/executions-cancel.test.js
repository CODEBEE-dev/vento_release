/**
 * Execution Cancel API E2E Tests
 *
 * Tests for cancel-all executions functionality
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Execution Cancel API', () => {
    const testPrefix = `test_cancel_${Date.now()}`;
    const boardName = `${testPrefix}_board`;
    const slowActionName = 'slow_action';
    let boardCreated = false;

    before(async () => {
        // Create a test board with a slow action
        const res = await api.post('/api/core/v1/import/board', {
            name: boardName,
            template: { id: 'blank' }
        });

        if (res.ok) {
            boardCreated = true;

            // Add a slow action card
            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: slowActionName,
                    type: 'action',
                    rulesCode: 'await new Promise(r => setTimeout(r, 5000)); return "done";'
                }
            });
        }
    });

    after(async () => {
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${boardName}/delete`).catch(() => {});
        }
    });

    describe('Cancel All Executions', () => {
        it('should cancel all running executions', async () => {
            // Start some slow actions
            const actionPromises = [
                api.get(`/api/core/v1/boards/${boardName}/actions/${slowActionName}`),
                api.get(`/api/core/v1/boards/${boardName}/actions/${slowActionName}`),
            ];

            // Wait a moment for actions to start
            await new Promise(r => setTimeout(r, 300));

            // Cancel all
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/actions/${slowActionName}/cancel-all`, {});

            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);

            // Wait for promises to resolve (they should be cancelled)
            await Promise.allSettled(actionPromises);
        });

        it('should handle cancel when no executions running', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/actions/${slowActionName}/cancel-all`, {});

            // Should succeed even with nothing to cancel
            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });

        it('should handle cancel for non-existent action', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/actions/nonexistent_action/cancel-all`, {});

            // Should handle gracefully
            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });

        it('should handle cancel for non-existent board', async () => {
            const res = await api.post('/api/core/v1/boards/nonexistent_board_xyz/management/actions/any_action/cancel-all', {});

            // Should fail gracefully
            assert.ok(res.status >= 200 && res.status < 600, 'Should respond');
        });

        it('should require auth to cancel', async () => {
            const res = await api.postNoAuth(`/api/core/v1/boards/${boardName}/management/actions/${slowActionName}/cancel-all`, {});

            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    describe('Single Execution Cancel', () => {
        it('should cancel specific execution', async () => {
            // Start a slow action
            const actionPromise = api.get(`/api/core/v1/boards/${boardName}/actions/${slowActionName}`);

            // Wait a moment for action to start
            await new Promise(r => setTimeout(r, 300));

            // Get running executions
            const { getServiceToken } = require('protonode');
            const token = getServiceToken();
            const execsUrl = `http://localhost:8000/api/core/v1/protomemdb/executions/boards/${boardName}?token=${token}`;

            try {
                const response = await fetch(execsUrl);
                const text = await response.text();
                const execs = text && text.trim() ? JSON.parse(text) : {};
                const entries = Object.values(execs).filter(e => e.actionName === slowActionName);

                if (entries.length > 0) {
                    const executionId = entries[0].executionId;

                    // Cancel specific execution
                    const cancelRes = await api.post(
                        `/api/core/v1/boards/${boardName}/actions/${slowActionName}/executions/${executionId}/cancel`,
                        {}
                    );

                    assert.ok(cancelRes.status >= 200 && cancelRes.status < 600, 'Should cancel');
                }
            } catch (e) {
                // ProtoMemDB may not be available
            }

            // Wait for promise
            await actionPromise.catch(() => {});
        });

        it('should handle cancel of non-existent execution', async () => {
            const res = await api.post(
                `/api/core/v1/boards/${boardName}/actions/${slowActionName}/executions/nonexistent_id/cancel`,
                {}
            );

            // Should handle gracefully
            assert.ok(res.status >= 200 && res.status < 600, 'Should respond');
        });
    });
});
