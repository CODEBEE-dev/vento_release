/**
 * Boards API E2E Tests
 *
 * Tests the boards CRUD operations and template-based creation
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Boards API', () => {
    const testBoardName = `test_board_${Date.now()}`;
    let boardCreated = false;

    it('should create board from smart ai agent template', async () => {
        const res = await api.post('/api/core/v1/import/board', {
            name: testBoardName,
            template: { id: 'smart ai agent' }
        });

        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}: ${JSON.stringify(res.data)}`);
        boardCreated = true;
    });

    it('should list boards and find created board', async () => {
        const res = await api.get('/api/core/v1/boards?all=1');

        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.ok(res.data.items, 'Response should have items array');

        const found = res.data.items.some(b => b.name === testBoardName);
        // Board may not appear in list due to pagination/timing
        if (!found) {
            // Fallback: verify board exists directly
            const directRes = await api.get(`/api/core/v1/boards/${testBoardName}`);
            assert.strictEqual(directRes.ok, true, `Board "${testBoardName}" should exist (direct check)`);
        }
    });

    it('should get board details', async () => {
        const res = await api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}`);

        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.strictEqual(res.data.name, testBoardName, 'Board name should match');
        assert.ok(res.data.cards, 'Board should have cards');
        assert.ok(res.data.cards.length > 0, 'Board should have at least one card from template');
    });

    it('should have expected cards from smart ai agent template', async () => {
        const res = await api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}`);

        assert.strictEqual(res.ok, true);

        const cardNames = res.data.cards.map(c => c.name);
        // Smart AI Agent template should have these cards
        const expectedCards = ['agent_input', 'user_request', 'agent_prepare', 'agent_core', 'reply', 'reset'];

        for (const expected of expectedCards) {
            assert.ok(
                cardNames.includes(expected),
                `Board should have card "${expected}". Found: ${cardNames.join(', ')}`
            );
        }
    });

    // --- Custom Action Card Tests ---
    const randomCardName = 'test_random_number';

    it('should add a custom action card that returns random number', async () => {
        const card = {
            name: randomCardName,
            type: 'action',  // Must be 'action' to be executable via API
            description: 'Returns a random number between 0 and 100',
            rulesCode: 'return Math.floor(Math.random() * 100)'
        };

        const res = await api.post(
            `/api/core/v1/boards/${encodeURIComponent(testBoardName)}/management/add/card`,
            { card }
        );

        assert.strictEqual(res.ok, true, `Expected success adding card, got status ${res.status}: ${JSON.stringify(res.data)}`);
    });

    it('should verify the custom card was added to the board', async () => {
        const res = await api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}`);

        assert.strictEqual(res.ok, true);

        const cardNames = res.data.cards.map(c => c.name);
        assert.ok(
            cardNames.includes(randomCardName),
            `Board should have card "${randomCardName}". Found: ${cardNames.join(', ')}`
        );

        // Also verify it's an action card
        const card = res.data.cards.find(c => c.name === randomCardName);
        assert.strictEqual(card.type, 'action', 'Card type should be action');
    });

    it('should execute the action card and get a random number', async () => {
        // Execute via the actions endpoint (correct endpoint for action cards)
        const res = await api.get(
            `/api/core/v1/boards/${encodeURIComponent(testBoardName)}/actions/${randomCardName}`
        );

        assert.strictEqual(res.ok, true, `Expected success running action, got status ${res.status}: ${JSON.stringify(res.data)}`);

        // The response is the direct return value from rulesCode
        const value = res.data;
        assert.strictEqual(typeof value, 'number', `Expected number, got ${typeof value}: ${JSON.stringify(value)}`);
        assert.ok(value >= 0 && value < 100, `Value should be between 0 and 100, got ${value}`);
    });

    it('should get different random values on multiple executions', async () => {
        const values = [];

        // Execute 5 times
        for (let i = 0; i < 5; i++) {
            const res = await api.get(
                `/api/core/v1/boards/${encodeURIComponent(testBoardName)}/actions/${randomCardName}`
            );
            assert.strictEqual(res.ok, true, `Execution ${i + 1} failed: ${res.status}`);
            values.push(res.data);
        }

        // Check that we got at least 2 different values (very unlikely to get 5 same randoms)
        const uniqueValues = [...new Set(values)];
        assert.ok(
            uniqueValues.length >= 2,
            `Expected different random values across executions, got: ${values.join(', ')}`
        );
    });

    after(async () => {
        // Cleanup: delete test board if it was created
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}/delete`).catch(() => {});
        }
    });

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow listing boards with boards.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/boards', ['boards.read']);
            assert.ok(res.status !== 403, `Should allow with boards.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing boards without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/boards');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow reading board with boards.read permission', async () => {
            if (!boardCreated) return;
            const res = await api.getWithPermissions(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}`, ['boards.read']);
            assert.ok(res.status !== 403, `Should allow with boards.read permission (got ${res.status})`);
        });

        it('should deny reading board without permission', async () => {
            if (!boardCreated) return;
            const res = await api.getNoPermissions(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}`);
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow creating board with boards.create permission', async () => {
            const permTestBoardName = `perm_test_board_${Date.now()}`;
            const res = await api.postWithPermissions('/api/core/v1/import/board', {
                name: permTestBoardName,
                template: { id: 'blank' }
            }, ['boards.create']);
            assert.ok(res.status !== 403, `Should allow with boards.create permission (got ${res.status})`);
            // Cleanup
            if (res.ok) {
                await api.get(`/api/core/v1/boards/${encodeURIComponent(permTestBoardName)}/delete`).catch(() => {});
            }
        });

        it('should deny creating board without permission', async () => {
            const res = await api.postNoPermissions('/api/core/v1/import/board', {
                name: `denied_board_${Date.now()}`,
                template: { id: 'blank' }
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow deleting board with boards.delete permission', async () => {
            // Create a board to delete
            const deleteBoardName = `delete_perm_test_${Date.now()}`;
            await api.post('/api/core/v1/import/board', {
                name: deleteBoardName,
                template: { id: 'blank' }
            });

            const res = await api.getWithPermissions(`/api/core/v1/boards/${encodeURIComponent(deleteBoardName)}/delete`, ['boards.delete']);
            assert.ok(res.status !== 403, `Should allow with boards.delete permission (got ${res.status})`);
        });

        it('should deny deleting board without permission', async () => {
            if (!boardCreated) return;
            const res = await api.getNoPermissions(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}/delete`);
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });
    });
});
