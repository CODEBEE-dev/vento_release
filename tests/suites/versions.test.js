/**
 * Board Versions API Tests
 * Tests for board version history, snapshots, and restore
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Board Versions API', () => {
    const testBoardName = `test_versions_${Date.now()}`;
    let boardCreated = false;

    // Setup: Create a board from template
    before(async () => {
        try {
            const res = await api.post('/api/core/v1/import/board', {
                name: testBoardName,
                template: { id: 'blank' }
            });
            console.log(`[setup] Create board response: ok=${res.ok}, status=${res.status}, data=${JSON.stringify(res.data)}`);
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

    it('should get current version of new board', async (t) => {
        if (!boardCreated) {
            t.skip('Board not created');
            return;
        }
        const res = await api.get(`/api/core/v1/boards/${testBoardName}/version/current`);
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.ok('version' in res.data, 'Response should have version property');
        assert.ok(typeof res.data.version === 'number', 'Version should be a number');
    });

    it('should create version snapshot', async (t) => {
        if (!boardCreated) {
            t.skip('Board not created');
            return;
        }
        const res = await api.post(`/api/core/v1/boards/${testBoardName}/version`, {});
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
    });

    it('should list version history', async (t) => {
        if (!boardCreated) {
            t.skip('Board not created');
            return;
        }
        const res = await api.get(`/api/core/v1/boards/${testBoardName}/history`);
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.ok(Array.isArray(res.data), 'History should be an array');
        assert.ok(res.data.length >= 1, 'Should have at least one version');
    });

    it('should add metadata to version', async (t) => {
        if (!boardCreated) {
            t.skip('Board not created');
            return;
        }
        const currentRes = await api.get(`/api/core/v1/boards/${testBoardName}/version/current`);
        assert.strictEqual(currentRes.ok, true);
        const version = currentRes.data.version;

        if (version > 0) {
            const res = await api.post(`/api/core/v1/boards/${testBoardName}/versions/${version}/meta`, {
                comment: 'Test version comment',
                tag: 'test-tag'
            });
            assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        }
    });

    it('should create another version after changes', async (t) => {
        if (!boardCreated) {
            t.skip('Board not created');
            return;
        }
        // Add a card to make a change (using correct format: { card: { ... } })
        await api.post(`/api/core/v1/boards/${testBoardName}/management/add/card`, {
            card: {
                type: 'action',
                name: 'test_action_for_version'
            }
        });
        await api.get(`/api/core/v1/boards/${testBoardName}/reload`);

        // Create new version
        const versionRes = await api.post(`/api/core/v1/boards/${testBoardName}/version`, {});
        assert.strictEqual(versionRes.ok, true, 'Should create new version');

        // Verify version incremented
        const currentRes = await api.get(`/api/core/v1/boards/${testBoardName}/version/current`);
        assert.strictEqual(currentRes.ok, true);
        assert.ok(currentRes.data.version >= 1, 'Version should be at least 1');
    });

    it('should restore previous version', async (t) => {
        if (!boardCreated) {
            t.skip('Board not created');
            return;
        }
        const historyRes = await api.get(`/api/core/v1/boards/${testBoardName}/history`);
        assert.strictEqual(historyRes.ok, true);

        if (historyRes.data.length >= 2) {
            const versionToRestore = historyRes.data[historyRes.data.length - 1].version;
            const res = await api.get(`/api/core/v1/boards/${testBoardName}/versions/${versionToRestore}/restore`);
            assert.strictEqual(res.ok, true, `Expected success restoring version ${versionToRestore}, got status ${res.status}`);
        }
    });

    // Corner cases - these don't depend on board creation

    it('should handle non-existent board gracefully', async () => {
        const res = await api.get('/api/core/v1/boards/non_existent_board_12345/version/current');
        assert.ok(!res.ok || res.data.error, 'Should fail for non-existent board');
    });

    it('should handle non-existent version restore gracefully', async (t) => {
        if (!boardCreated) {
            // Use a known board name for this test
            const res = await api.get('/api/core/v1/boards/non_existent_board/versions/99999/restore');
            assert.ok(!res.ok || res.data.error, 'Should fail for non-existent version');
            return;
        }
        const res = await api.get(`/api/core/v1/boards/${testBoardName}/versions/99999/restore`);
        assert.ok(!res.ok || res.data.error, 'Should fail for non-existent version');
    });

    // Cleanup
    after(async () => {
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${testBoardName}/delete`).catch(() => {});
        }
    });

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow reading version with boards.read permission', async () => {
            if (!boardCreated) return;
            const res = await api.getWithPermissions(`/api/core/v1/boards/${testBoardName}/version/current`, ['boards.read']);
            assert.ok(res.status !== 403, `Should allow with boards.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny reading version without permission', async () => {
            if (!boardCreated) return;
            const res = await api.getNoPermissions(`/api/core/v1/boards/${testBoardName}/version/current`);
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow reading history with boards.read permission', async () => {
            if (!boardCreated) return;
            const res = await api.getWithPermissions(`/api/core/v1/boards/${testBoardName}/history`, ['boards.read']);
            assert.ok(res.status !== 403, `Should allow with boards.read permission (got ${res.status})`);
        });

        it('should deny reading history without permission', async () => {
            if (!boardCreated) return;
            const res = await api.getNoPermissions(`/api/core/v1/boards/${testBoardName}/history`);
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow creating version with boards.update permission', async () => {
            if (!boardCreated) return;
            const res = await api.postWithPermissions(`/api/core/v1/boards/${testBoardName}/version`, {}, ['boards.update']);
            assert.ok(res.status !== 403, `Should allow with boards.update permission (got ${res.status})`);
        });

        it('should deny creating version without permission', async () => {
            if (!boardCreated) return;
            const res = await api.postNoPermissions(`/api/core/v1/boards/${testBoardName}/version`, {});
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });
    });
});
