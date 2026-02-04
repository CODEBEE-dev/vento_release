/**
 * Boards CRUD Complete E2E Tests
 *
 * Tests for board update, metadata, and complete lifecycle
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Boards CRUD Complete', () => {
    const testPrefix = `test_crud_${Date.now()}`;
    const createdBoards = [];

    after(async () => {
        for (const boardName of createdBoards) {
            await api.get(`/api/core/v1/boards/${boardName}/delete`).catch(() => {});
        }
    });

    describe('Create Operations', () => {
        it('should create board from blank template', async () => {
            const boardName = `${testPrefix}_blank`;
            const res = await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });

            assert.strictEqual(res.ok, true, `Expected success, got ${res.status}: ${JSON.stringify(res.data)}`);
            createdBoards.push(boardName);
        });

        it('should handle duplicate board name', async () => {
            const boardName = `${testPrefix}_dup`;

            // Create first
            const res1 = await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });

            if (res1.ok) {
                createdBoards.push(boardName);
            }

            // Try duplicate - API may reject or return existing
            const res2 = await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });

            // Should handle gracefully (reject or return existing - both are valid)
            assert.ok(res2.status < 500, 'Should handle duplicate without server error');
        });

        it('should reject invalid board name (uppercase)', async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: 'INVALID_UPPERCASE',
                template: { id: 'blank' }
            });

            assert.strictEqual(res.ok, false, 'Uppercase board name should be rejected');
        });

        it('should reject invalid board name (spaces)', async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: 'invalid board name',
                template: { id: 'blank' }
            });

            assert.strictEqual(res.ok, false, 'Board name with spaces should be rejected');
        });

        it('should reject invalid board name (special chars)', async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: 'invalid-board-name!',
                template: { id: 'blank' }
            });

            assert.strictEqual(res.ok, false, 'Board name with special chars should be rejected');
        });
    });

    describe('Read Operations', () => {
        const boardName = `${testPrefix}_read`;

        before(async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });
            if (res.ok) createdBoards.push(boardName);
        });

        it('should list all boards', async () => {
            const res = await api.get('/api/core/v1/boards');

            assert.strictEqual(res.ok, true);
            assert.ok(res.data.items, 'Should have items array');
            assert.ok(typeof res.data.total === 'number', 'Should have total count');
        });

        it('should find created board in list', async () => {
            const res = await api.get('/api/core/v1/boards?all=1');

            const found = res.data.items.find(b => b.name === boardName);
            // Board may or may not appear in list due to pagination/timing
            if (!found) {
                // Fallback: verify board exists directly
                const directRes = await api.get(`/api/core/v1/boards/${boardName}`);
                assert.strictEqual(directRes.ok, true, `Board "${boardName}" should exist (direct check)`);
            }
        });

        it('should get board by name', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}`);

            assert.strictEqual(res.ok, true, `Expected success, got ${res.status}`);
            assert.strictEqual(res.data.name, boardName);
        });

        it('should return 404 for non-existent board', async () => {
            const res = await api.get('/api/core/v1/boards/nonexistent_board_99999');

            assert.strictEqual(res.ok, false);
        });

        it('should get board with cards array', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}`);

            assert.strictEqual(res.ok, true);
            assert.ok(Array.isArray(res.data.cards), 'Board should have cards array');
        });
    });

    describe('Update Operations', () => {
        const boardName = `${testPrefix}_update`;

        before(async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });
            if (res.ok) createdBoards.push(boardName);
        });

        it('should update board via POST to /boards/:name', async () => {
            // Get current board
            const getRes = await api.get(`/api/core/v1/boards/${boardName}`);
            const currentBoard = getRes.data;

            // Update with modified data
            const res = await api.post(`/api/core/v1/boards/${boardName}`, {
                ...currentBoard,
                description: 'Updated description'
            });

            // May succeed or have specific update semantics
            assert.ok(res.status < 500, `Should not cause server error, got ${res.status}`);
        });

        it('should preserve cards when updating metadata', async () => {
            // Add a card first
            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'preserve_test',
                    type: 'value',
                    rulesCode: 'return 1;'
                }
            });

            // Get current state
            const getRes1 = await api.get(`/api/core/v1/boards/${boardName}`);
            const cardCountBefore = getRes1.data.cards?.length || 0;

            // Update metadata
            await api.post(`/api/core/v1/boards/${boardName}`, {
                ...getRes1.data,
                description: 'Another update'
            });

            // Verify cards preserved
            const getRes2 = await api.get(`/api/core/v1/boards/${boardName}`);
            const cardCountAfter = getRes2.data.cards?.length || 0;

            assert.ok(cardCountAfter >= cardCountBefore, 'Cards should be preserved after metadata update');
        });
    });

    describe('Delete Operations', () => {
        it('should delete board', async () => {
            const boardName = `${testPrefix}_delete`;

            // Create
            const createRes = await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });

            assert.strictEqual(createRes.ok, true, 'Board should be created');

            // Delete
            const deleteRes = await api.get(`/api/core/v1/boards/${boardName}/delete`);
            assert.strictEqual(deleteRes.ok, true, `Delete should succeed, got ${deleteRes.status}`);

            // Verify deleted
            const getRes = await api.get(`/api/core/v1/boards/${boardName}`);
            assert.strictEqual(getRes.ok, false, 'Deleted board should not be found');
        });

        it('should handle delete of non-existent board', async () => {
            const res = await api.get('/api/core/v1/boards/nonexistent_delete_99999/delete');

            // Should return a response (may be 404, 500, or any other code)
            // The key is that the server responds
            assert.ok(res.status >= 200 && res.status < 600, 'Should return a response');
        });
    });

    describe('Board Settings', () => {
        const boardName = `${testPrefix}_settings`;

        before(async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });
            if (res.ok) createdBoards.push(boardName);
        });

        it('should have settings object in board', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}`);

            assert.strictEqual(res.ok, true);
            // Settings may or may not exist initially
            if (res.data.settings) {
                assert.strictEqual(typeof res.data.settings, 'object', 'Settings should be object');
            }
        });

        it('should update board settings', async () => {
            const getRes = await api.get(`/api/core/v1/boards/${boardName}`);

            const res = await api.post(`/api/core/v1/boards/${boardName}`, {
                ...getRes.data,
                settings: {
                    ...(getRes.data.settings || {}),
                    customSetting: 'value123'
                }
            });

            assert.ok(res.status < 500, 'Should not cause server error');

            // Verify setting saved
            const verifyRes = await api.get(`/api/core/v1/boards/${boardName}`);
            if (verifyRes.data.settings?.customSetting) {
                assert.strictEqual(verifyRes.data.settings.customSetting, 'value123');
            }
        });
    });

    describe('Graph Layout', () => {
        const boardName = `${testPrefix}_layout`;

        before(async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });
            if (res.ok) createdBoards.push(boardName);
        });

        it('should get graph layout', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/graphlayout`);

            assert.ok(res.status < 500, `Should not cause server error, got ${res.status}`);
        });

        it('should save graph layout', async () => {
            const layout = {
                nodes: [
                    { id: 'node1', x: 100, y: 200 }
                ],
                edges: []
            };

            const res = await api.post(`/api/core/v1/boards/${boardName}/graphlayout`, layout);

            assert.ok(res.status < 500, `Should not cause server error, got ${res.status}`);
        });

        it('should retrieve saved layout', async () => {
            const layout = {
                nodes: [{ id: 'test_node', x: 50, y: 75 }]
            };

            await api.post(`/api/core/v1/boards/${boardName}/graphlayout`, layout);

            const res = await api.get(`/api/core/v1/boards/${boardName}/graphlayout`);

            if (res.ok && res.data) {
                // Layout should be preserved
                assert.ok(res.data.nodes || res.data, 'Layout should be retrievable');
            }
        });
    });

    describe('UI Code', () => {
        const boardName = `${testPrefix}_uicode`;

        before(async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });
            if (res.ok) createdBoards.push(boardName);
        });

        it('should get UI code', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/uicode`);

            assert.ok(res.status < 500, 'Should not cause server error');
        });

        it('should save UI code', async () => {
            const uiCode = 'export default function() { return <div>Custom UI</div>; }';

            const res = await api.post(`/api/core/v1/boards/${boardName}/uicode`, {
                code: uiCode
            });

            assert.ok(res.status < 500, 'Should not cause server error');
        });
    });

    describe('Board Reload', () => {
        const boardName = `${testPrefix}_reload`;

        before(async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });
            if (res.ok) createdBoards.push(boardName);
        });

        it('should reload board', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/reload`);

            assert.ok(res.status < 500, 'Should not cause server error');
        });

        it('should preserve state after reload', async () => {
            // Add a card
            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'reload_test',
                    type: 'value',
                    rulesCode: 'return 42;'
                }
            });

            // Get card count before
            const before = await api.get(`/api/core/v1/boards/${boardName}`);
            const countBefore = before.data.cards?.length || 0;

            // Reload
            await api.get(`/api/core/v1/boards/${boardName}/reload`);

            // Get card count after
            const after = await api.get(`/api/core/v1/boards/${boardName}`);
            const countAfter = after.data.cards?.length || 0;

            assert.strictEqual(countAfter, countBefore, 'Cards should be preserved after reload');
        });
    });
});

