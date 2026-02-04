/**
 * Board Graph Layout API Tests
 * Tests for board visual layout persistence
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Board Graph Layout API', () => {
    const testBoardName = `test_layout_${Date.now()}`;
    let boardCreated = false;

    // Setup: Create a board from template
    before(async () => {
        try {
            const res = await api.post('/api/core/v1/import/board', {
                name: testBoardName,
                template: { id: 'blank' }
            });
            if (res.ok) {
                boardCreated = true;
                // Wait for board to be ready
                await api.get(`/api/core/v1/boards/${testBoardName}/reload`);
            }
        } catch (e) {
            console.log(`[setup] Failed to create board: ${e.message}`);
        }
    });

    // Functional tests

    it('should get initial graph layout', async (t) => {
        if (!boardCreated) {
            t.skip('Board not created');
            return;
        }
        const res = await api.get(`/api/core/v1/boards/${testBoardName}/graphlayout`);
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.ok(res.data !== undefined, 'Response should have data');
    });

    it('should save graph layout', async (t) => {
        if (!boardCreated) {
            t.skip('Board not created');
            return;
        }
        const layout = {
            graphLayout: {
                nodes: {
                    'card1': { x: 100, y: 200 },
                    'card2': { x: 300, y: 400 }
                },
                zoom: 1.0,
                pan: { x: 0, y: 0 }
            }
        };

        const res = await api.post(`/api/core/v1/boards/${testBoardName}/graphlayout`, layout);
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
    });

    it('should retrieve saved layout', async (t) => {
        if (!boardCreated) {
            t.skip('Board not created');
            return;
        }
        const res = await api.get(`/api/core/v1/boards/${testBoardName}/graphlayout`);
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.ok(res.data, 'Response should have layout data');
    });

    it('should update layout with different positions', async (t) => {
        if (!boardCreated) {
            t.skip('Board not created');
            return;
        }
        const newLayout = {
            graphLayout: {
                nodes: {
                    'card1': { x: 500, y: 600 },
                    'card2': { x: 700, y: 800 },
                    'card3': { x: 100, y: 100 }
                },
                zoom: 1.5,
                pan: { x: 50, y: 50 }
            }
        };

        const res = await api.post(`/api/core/v1/boards/${testBoardName}/graphlayout`, newLayout);
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);

        const getRes = await api.get(`/api/core/v1/boards/${testBoardName}/graphlayout`);
        assert.strictEqual(getRes.ok, true);
    });

    it('should handle empty layout', async (t) => {
        if (!boardCreated) {
            t.skip('Board not created');
            return;
        }
        const emptyLayout = {
            graphLayout: {}
        };

        const res = await api.post(`/api/core/v1/boards/${testBoardName}/graphlayout`, emptyLayout);
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
    });

    // Corner cases - don't depend on board

    it('should handle non-existent board', async () => {
        const res = await api.get('/api/core/v1/boards/non_existent_board_12345/graphlayout');
        // Should return 404 or empty - either is acceptable
        assert.ok(res.status === 404 || res.status === 200, `Expected 404 or 200, got ${res.status}`);
    });

    it('should handle layout with special characters in node names', async (t) => {
        if (!boardCreated) {
            t.skip('Board not created');
            return;
        }
        const specialLayout = {
            graphLayout: {
                nodes: {
                    'card-with-dash': { x: 100, y: 100 },
                    'card_with_underscore': { x: 200, y: 200 }
                }
            }
        };

        const res = await api.post(`/api/core/v1/boards/${testBoardName}/graphlayout`, specialLayout);
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
    });

    it('should handle layout with large coordinates', async (t) => {
        if (!boardCreated) {
            t.skip('Board not created');
            return;
        }
        const largeLayout = {
            graphLayout: {
                nodes: {
                    'far_node': { x: 99999, y: 99999 }
                },
                zoom: 0.1
            }
        };

        const res = await api.post(`/api/core/v1/boards/${testBoardName}/graphlayout`, largeLayout);
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
    });

    it('should handle layout with negative coordinates', async (t) => {
        if (!boardCreated) {
            t.skip('Board not created');
            return;
        }
        const negativeLayout = {
            graphLayout: {
                nodes: {
                    'negative_node': { x: -100, y: -200 }
                },
                pan: { x: -50, y: -50 }
            }
        };

        const res = await api.post(`/api/core/v1/boards/${testBoardName}/graphlayout`, negativeLayout);
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
    });

    // Cleanup
    after(async () => {
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${testBoardName}/delete`).catch(() => {});
        }
    });
});
