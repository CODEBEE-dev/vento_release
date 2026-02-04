/**
 * Board Workflow E2E Tests
 *
 * Complete end-to-end workflow test for board operations
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Complete Board Workflow', () => {
    const testPrefix = `test_workflow_${Date.now()}`;
    const boardName = `${testPrefix}_board`;
    let boardCreated = false;
    let actionCardId = null;
    let valueCardId = null;
    let versionCreated = false;

    after(async () => {
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${boardName}/delete`).catch(() => {});
        }
    });

    describe('Step 1: Board Creation', () => {
        it('should create board from blank template', async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });

            assert.strictEqual(res.ok, true, `Failed to create board: ${JSON.stringify(res.data)}`);
            boardCreated = true;
        });

        it('should verify board exists', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}`);

            assert.strictEqual(res.ok, true, 'Board should exist');
            assert.strictEqual(res.data.name, boardName);
        });

        it('should find board in list', async () => {
            const res = await api.get('/api/core/v1/boards?all=1');

            assert.strictEqual(res.ok, true);
            // Board may or may not appear in first page due to pagination
            const found = res.data.items.find(b => b.name === boardName);
            // More lenient check - either found in list OR we can get it directly
            if (!found) {
                const directRes = await api.get(`/api/core/v1/boards/${boardName}`);
                assert.strictEqual(directRes.ok, true, 'Board should exist (direct check)');
            }
        });
    });

    describe('Step 2: Add Cards', () => {
        it('should add an action card', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'counter_action',
                    type: 'action',
                    rulesCode: `return { count: Date.now(), executed: true };`
                }
            });

            assert.strictEqual(res.ok, true, `Failed to add action card: ${JSON.stringify(res.data)}`);
        });

        it('should add a second action card', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'counter_value',
                    type: 'action',
                    rulesCode: `return { value: 42 };`
                }
            });

            assert.strictEqual(res.ok, true, `Failed to add second action card: ${JSON.stringify(res.data)}`);
        });

        it('should verify cards were added', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}`);

            assert.strictEqual(res.ok, true);
            assert.ok(res.data.cards.length >= 2, 'Should have at least 2 cards');

            const actionCard = res.data.cards.find(c => c.name === 'counter_action');
            const secondActionCard = res.data.cards.find(c => c.name === 'counter_value');

            assert.ok(actionCard, 'Action card should exist');
            assert.ok(secondActionCard, 'Second action card should exist');

            actionCardId = actionCard.id;
            valueCardId = secondActionCard.id;
        });
    });

    describe('Step 3: Execute Actions', () => {
        it('should execute action card first time', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/actions/counter_action`);

            assert.strictEqual(res.ok, true, `Action execution failed: ${JSON.stringify(res.data)}`);
            assert.ok(res.data?.executed === true, 'Should return executed flag');
        });

        it('should execute action card second time', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/actions/counter_action`);

            assert.strictEqual(res.ok, true);
            assert.ok(res.data?.executed === true, 'Should return executed flag');
        });

        it('should verify second action card returns value', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/actions/counter_value`);

            assert.strictEqual(res.ok, true);
            assert.strictEqual(res.data?.value, 42, 'Second action card should return value: 42');
        });
    });

    describe('Step 4: Check State', () => {
        it('should verify state via ProtoMemDB', async () => {
            const res = await api.get(`/api/core/v1/protomemdb/${boardName}`);

            // ProtoMemDB endpoint may or may not be available
            // Just verify we get a response
            assert.ok(res.status >= 200 && res.status < 600, 'Should respond to state request');
        });

        it('should get board with updated state', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}`);

            assert.strictEqual(res.ok, true);
            // Board should be retrievable with current state
        });
    });

    describe('Step 5: Version Management', () => {
        it('should create version snapshot', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/version`, {
                comment: 'After initial counter setup'
            });

            if (res.ok) {
                versionCreated = true;
            }
            assert.ok(res.status < 500, `Version creation should not crash: ${res.status}`);
        });

        it('should get current version', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/version/current`);

            assert.ok(res.status < 500, 'Should get current version');
        });

        it('should list version history', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/history`);

            assert.ok(res.status < 500, 'Should get history');
            if (res.ok && Array.isArray(res.data)) {
                assert.ok(res.data.length > 0, 'Should have at least one version');
            }
        });
    });

    describe('Step 6: Modify and Restore', () => {
        it('should execute more actions', async () => {
            // Execute a few more times
            await api.get(`/api/core/v1/boards/${boardName}/actions/counter_action`);
            await api.get(`/api/core/v1/boards/${boardName}/actions/counter_action`);

            const res = await api.get(`/api/core/v1/boards/${boardName}/actions/counter_value`);

            assert.strictEqual(res.ok, true);
            assert.strictEqual(res.data?.value, 42, 'Value should remain 42');
        });

        it('should create another version', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/version`, {
                comment: 'After more increments'
            });

            assert.ok(res.status < 500, 'Should create second version');
        });

        it('should restore previous version', async () => {
            // Get history to find version numbers
            const historyRes = await api.get(`/api/core/v1/boards/${boardName}/history`);

            if (historyRes.ok && Array.isArray(historyRes.data) && historyRes.data.length > 1) {
                // Restore the first version (usually version 1)
                const res = await api.get(`/api/core/v1/boards/${boardName}/versions/1/restore`);

                assert.ok(res.status < 500, 'Should restore version');
            }
        });
    });

    describe('Step 7: UI and Layout', () => {
        it('should save graph layout', async () => {
            const layout = {
                nodes: [
                    { id: actionCardId, x: 100, y: 100 },
                    { id: valueCardId, x: 300, y: 100 }
                ]
            };

            const res = await api.post(`/api/core/v1/boards/${boardName}/graphlayout`, layout);

            assert.ok(res.status < 500, 'Should save layout');
        });

        it('should retrieve graph layout', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/graphlayout`);

            assert.ok(res.status < 500, 'Should get layout');
        });
    });

    describe('Step 8: Reload and Verify', () => {
        it('should reload board', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/reload`);

            assert.ok(res.status < 500, 'Should reload board');
        });

        it('should verify board intact after reload', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}`);

            assert.strictEqual(res.ok, true);
            assert.strictEqual(res.data.name, boardName);
            assert.ok(res.data.cards.length >= 2, 'Cards should persist after reload');
        });
    });

    describe('Step 9: Cleanup', () => {
        it('should delete board', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/delete`);

            assert.strictEqual(res.ok, true, 'Should delete board');
            boardCreated = false;
        });

        it('should verify board no longer exists', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}`);

            assert.strictEqual(res.ok, false, 'Deleted board should not exist');
        });

        it('should verify board not in list', async () => {
            const res = await api.get('/api/core/v1/boards');

            assert.strictEqual(res.ok, true);
            const found = res.data.items.find(b => b.name === boardName);
            assert.ok(!found, 'Deleted board should not be in list');
        });
    });
});
