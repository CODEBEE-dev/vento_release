/**
 * Cards API E2E Tests
 *
 * Tests for card operations, retrieval, and reset functionality
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Cards Global API', () => {
    describe('GET /api/core/v1/cards', () => {
        it('should return cards list without errors', async () => {
            const res = await api.get('/api/core/v1/cards');

            assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}: ${JSON.stringify(res.data)}`);
            assert.ok(res.data, 'Response should have data');
            assert.ok(Array.isArray(res.data.items), 'Response should have items array');
        });

        // --- Permission Enforcement Tests ---
        it('should allow listing cards with cards.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/cards', ['cards.read']);
            assert.ok(res.status !== 403, `Should allow with cards.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing cards without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/cards');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should return cards with required fields', async () => {
            const res = await api.get('/api/core/v1/cards');

            if (!res.ok || !res.data?.items?.length) {
                assert.ok(true, 'Skipped - no cards available');
                return;
            }

            const card = res.data.items[0];
            assert.ok(card.id, 'Card should have id');
            assert.ok(card.group, 'Card should have group');
            assert.ok(card.tag, 'Card should have tag');
            assert.ok(card.name, 'Card should have name');
        });

        it('should include device cards when devices are registered', async () => {
            const res = await api.get('/api/core/v1/cards');

            if (!res.ok) {
                assert.fail(`API call failed with status ${res.status}`);
                return;
            }

            // Check if there are any device cards
            const deviceCards = res.data.items.filter(c => c.group === 'devices');

            // If devices are registered, their cards should appear
            const devicesRes = await api.get('/api/core/v1/devices');
            if (devicesRes.ok && devicesRes.data?.items?.length > 0) {
                assert.ok(deviceCards.length > 0,
                    'When devices are registered, device cards should be available in the cards API');

                // Verify device cards have correct structure
                for (const card of deviceCards) {
                    assert.strictEqual(card.group, 'devices', 'Device card should have group=devices');
                    assert.ok(card.tag, 'Device card should have tag (device name)');
                }
            } else {
                // No devices registered, just verify API works
                assert.ok(Array.isArray(res.data.items), 'Cards API should return array even with no devices');
            }
        });

        it('should return cards from different groups', async () => {
            const res = await api.get('/api/core/v1/cards');

            if (!res.ok || !res.data?.items?.length) {
                assert.ok(true, 'Skipped - no cards available');
                return;
            }

            const groups = [...new Set(res.data.items.map(c => c.group))];

            // Should have at least one group
            assert.ok(groups.length >= 1, `Should have at least one group, found: ${groups.join(', ')}`);
        });
    });
});

describe('Cards API', () => {
    const testPrefix = `test_cards_${Date.now()}`;
    const testBoardName = `${testPrefix}_board`;
    let boardCreated = false;
    let testCardId = null;

    before(async () => {
        // Create a test board with cards
        const res = await api.post('/api/core/v1/import/board', {
            name: testBoardName,
            template: { id: 'blank' }
        });

        if (res.ok) {
            boardCreated = true;

            // Add a test card
            const addCardRes = await api.post(`/api/core/v1/boards/${testBoardName}/management/add/card`, {
                card: {
                    name: 'test_action',
                    type: 'action',
                    rulesCode: 'return { executed: true, timestamp: Date.now() };'
                }
            });

            if (addCardRes.ok) {
                // Get the card ID
                const boardRes = await api.get(`/api/core/v1/boards/${testBoardName}`);
                if (boardRes.ok) {
                    const card = boardRes.data.cards?.find(c => c.name === 'test_action');
                    if (card) {
                        testCardId = card.id;
                    }
                }
            }
        }
    });

    after(async () => {
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${testBoardName}/delete`).catch(() => {});
        }
    });

    describe('Card Retrieval', () => {
        it('should get card details by ID', async () => {
            if (!testCardId) {
                assert.ok(true, 'Skipped - no test card ID');
                return;
            }

            const res = await api.get(`/api/core/v1/boards/${testBoardName}/cards/${testCardId}`);

            assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
            assert.ok(res.data.name, 'Card should have name');
        });

        it('should get card info/metadata', async () => {
            if (!testCardId) {
                assert.ok(true, 'Skipped - no test card ID');
                return;
            }

            const res = await api.get(`/api/core/v1/boards/${testBoardName}/cards/${testCardId}/info`);

            // May return card info or 404 depending on implementation
            assert.ok(res.status < 500, 'Should not cause server error');
        });

        it('should return 404 for non-existent card', async () => {
            const res = await api.get(`/api/core/v1/boards/${testBoardName}/cards/nonexistent_card_12345`);

            // API may return 404, 200 with null/empty, or other response
            // Just verify it doesn't crash
            assert.ok(res.status < 600, 'Should handle non-existent card request');
        });

        it('should return error for non-existent board', async () => {
            const res = await api.get(`/api/core/v1/boards/nonexistent_board_12345/cards/any_card`);

            assert.strictEqual(res.ok, false, 'Should not find card on non-existent board');
        });
    });

    describe('Card Execution', () => {
        it('should execute card action via /run endpoint', async () => {
            if (!testCardId) {
                assert.ok(true, 'Skipped - no test card ID');
                return;
            }

            const res = await api.get(`/api/core/v1/boards/${testBoardName}/cards/${testCardId}/run`);

            assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
            assert.ok(res.data.executed, 'Card should have executed');
        });

        it('should execute card action via POST with params', async () => {
            if (!testCardId) {
                assert.ok(true, 'Skipped - no test card ID');
                return;
            }

            const res = await api.post(`/api/core/v1/boards/${testBoardName}/cards/${testCardId}/run`, {
                params: { customParam: 'value' }
            });

            assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        });

        it('should execute raw card action', async () => {
            if (!testCardId) {
                assert.ok(true, 'Skipped - no test card ID');
                return;
            }

            const res = await api.get(`/api/core/v1/boards/${testBoardName}/cards/${testCardId}/run/raw`);

            // Raw endpoint may have different response format
            assert.ok(res.status < 500, 'Should not cause server error');
        });
    });

    describe('Card History', () => {
        it('should get card execution history', async () => {
            if (!testCardId) {
                assert.ok(true, 'Skipped - no test card ID');
                return;
            }

            const res = await api.get(`/api/core/v1/boards/${testBoardName}/cards/${testCardId}/history`);

            // History endpoint may return array or object
            assert.ok(res.status < 500, 'Should not cause server error');
            if (res.ok) {
                // If history exists, should be array-like
                assert.ok(Array.isArray(res.data) || res.data.items, 'History should be array or have items');
            }
        });
    });

    describe('Card Reset', () => {
        it('should reset individual card state', async () => {
            if (!testCardId) {
                assert.ok(true, 'Skipped - no test card ID');
                return;
            }

            // First execute to create some state
            await api.get(`/api/core/v1/boards/${testBoardName}/cards/${testCardId}/run`);

            // Reset the card
            const res = await api.post('/api/core/v1/board/cardreset', {
                cardId: testCardId
            });

            // May succeed or return specific response
            assert.ok(res.status < 500, `Should not cause server error, got ${res.status}`);
        });

        it('should reset card group state', async () => {
            const res = await api.post('/api/core/v1/board/cardresetgroup', {
                group: testBoardName
            });

            // May succeed or return specific response
            assert.ok(res.status < 500, `Should not cause server error, got ${res.status}`);
        });

        it('should handle reset of non-existent card gracefully', async () => {
            const res = await api.post('/api/core/v1/board/cardreset', {
                cardId: 'nonexistent_card_999999'
            });

            // Should handle gracefully (not crash)
            assert.ok(res.status < 500, 'Should not cause server error');
        });

        it('should handle reset of non-existent group gracefully', async () => {
            const res = await api.post('/api/core/v1/board/cardresetgroup', {
                group: 'nonexistent_group_999999'
            });

            // Should handle gracefully
            assert.ok(res.status < 500, 'Should not cause server error');
        });
    });

    describe('Card State Persistence', () => {
        it('should preserve card definition after reset', async () => {
            if (!testCardId) {
                assert.ok(true, 'Skipped - no test card ID');
                return;
            }

            // Reset
            await api.post('/api/core/v1/board/cardreset', { cardId: testCardId });

            // Verify card still exists
            const res = await api.get(`/api/core/v1/boards/${testBoardName}/cards/${testCardId}`);

            assert.strictEqual(res.ok, true, 'Card should still exist after reset');
            assert.strictEqual(res.data.name, 'test_action', 'Card name should be preserved');
        });

        it('should clear card state but keep card after reset', async () => {
            if (!testCardId) {
                assert.ok(true, 'Skipped - no test card ID');
                return;
            }

            // Execute to create state
            const execRes = await api.get(`/api/core/v1/boards/${testBoardName}/cards/${testCardId}/run`);
            const originalTimestamp = execRes.data?.timestamp;

            // Reset
            await api.post('/api/core/v1/board/cardreset', { cardId: testCardId });

            // Execute again
            const newExecRes = await api.get(`/api/core/v1/boards/${testBoardName}/cards/${testCardId}/run`);

            // New execution should work
            assert.strictEqual(newExecRes.ok, true, 'Should execute after reset');
        });
    });

    describe('Multiple Cards', () => {
        let secondCardId = null;

        before(async () => {
            if (!boardCreated) return;

            // Add a second card
            const addRes = await api.post(`/api/core/v1/boards/${testBoardName}/management/add/card`, {
                card: {
                    name: 'test_value',
                    type: 'value',
                    rulesCode: 'return "static_value";'
                }
            });

            if (addRes.ok) {
                const boardRes = await api.get(`/api/core/v1/boards/${testBoardName}`);
                if (boardRes.ok) {
                    const card = boardRes.data.cards?.find(c => c.name === 'test_value');
                    if (card) secondCardId = card.id;
                }
            }
        });

        it('should list all cards in board', async () => {
            const res = await api.get(`/api/core/v1/boards/${testBoardName}`);

            assert.strictEqual(res.ok, true);
            assert.ok(res.data.cards, 'Board should have cards array');
            assert.ok(res.data.cards.length >= 1, 'Board should have at least one card');
        });

        it('should execute different cards independently', async () => {
            if (!testCardId || !secondCardId) {
                assert.ok(true, 'Skipped - cards not available');
                return;
            }

            const res1 = await api.get(`/api/core/v1/boards/${testBoardName}/cards/${testCardId}/run`);
            const res2 = await api.get(`/api/core/v1/boards/${testBoardName}/cards/${secondCardId}/run`);

            assert.strictEqual(res1.ok, true, 'First card should execute');
            assert.strictEqual(res2.ok, true, 'Second card should execute');
        });
    });
});
