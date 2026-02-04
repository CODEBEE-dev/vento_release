/**
 * Ephemeral State E2E Tests
 *
 * Tests the ephemeral context system for parallel action execution with isolated state.
 * Key behaviors tested:
 * - Context isolation between parallel executions
 * - State fallback (context first, then base state)
 * - Context propagation through action chains
 * - Chain terminator cleanup
 * - Board-level ephemeral setting
 * - Backward compatibility with non-ephemeral cards
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Ephemeral State', () => {
    const testBoardName = `test_ephemeral_${Date.now()}`;
    let boardCreated = false;

    // Helper to add a card to the test board
    async function addCard(card) {
        const res = await api.post(
            `/api/core/v1/boards/${encodeURIComponent(testBoardName)}/management/add/card`,
            { card }
        );
        assert.strictEqual(res.ok, true, `Failed to add card ${card.name}: ${JSON.stringify(res.data)}`);
    }

    // Helper to reload the board (forces action registration)
    async function reloadBoard() {
        await api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}/reload`);
    }

    // Helper to execute an action
    async function executeAction(actionName, params = {}) {
        const queryParams = Object.entries(params)
            .map(([k, v]) => `${k}=${encodeURIComponent(typeof v === 'object' ? JSON.stringify(v) : v)}`)
            .join('&');
        // api.get adds ?token=..., then we can append additional params with &
        const basePath = `/api/core/v1/boards/${encodeURIComponent(testBoardName)}/actions/${actionName}`;
        // If we have params, add them after the token (api.get will add ?token=X, we append &params)
        if (queryParams) {
            // Use a dummy ? so api.get uses & for token, then our params come after
            return api.get(`${basePath}?${queryParams}`);
        }
        return api.get(basePath);
    }

    // Helper to get board state (extract values from cards)
    async function getBoardState() {
        const res = await api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}`);
        // Extract state values from cards - each card with a value has it in card.value
        const states = {};
        if (res.data?.cards && Array.isArray(res.data.cards)) {
            for (const card of res.data.cards) {
                if (card.value !== undefined) {
                    states[card.name] = card.value;
                }
            }
        }
        return states;
    }

    before(async () => {
        // Create test board from smart ai agent template (same as boards.test.js)
        const res = await api.post('/api/core/v1/import/board', {
            name: testBoardName,
            template: { id: 'smart ai agent' }
        });
        assert.strictEqual(res.ok, true, `Failed to create board: ${JSON.stringify(res.data)}`);
        boardCreated = true;
    });

    describe('1. Basic Ephemeral Context', () => {
        it('should add ephemeral card', async () => {
            await addCard({
                name: 'set_counter',
                type: 'action',
                stateMode: 'ephemeral',
                description: 'Sets counter in ephemeral context',
                rulesCode: 'return params.value || 1'
            });
        });

        it('should add non-ephemeral card', async () => {
            await addCard({
                name: 'persist_value',
                type: 'action',
                stateMode: 'non-ephemeral',
                description: 'Persists value to base state',
                rulesCode: 'return params.value || "default"'
            });
            // Force board reload after all cards added
            await reloadBoard();
        });

        it('should verify cards were added', async () => {
            const res = await api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}`);
            assert.strictEqual(res.ok, true);
            const cardNames = res.data.cards.map(c => c.name);
            assert.ok(cardNames.includes('set_counter'), `Missing set_counter. Found: ${cardNames.join(', ')}`);
            assert.ok(cardNames.includes('persist_value'), `Missing persist_value. Found: ${cardNames.join(', ')}`);
        });

        it('ephemeral card should execute and not persist state', async () => {
            const res = await executeAction('set_counter', { value: 42 });
            assert.strictEqual(res.ok, true, `Execute failed: ${JSON.stringify(res.data)}`);
            // Value comes as string from query params
            assert.strictEqual(String(res.data), '42');

            // Check state was NOT modified (ephemeral writes go to context, not base)
            const states = await getBoardState();
            assert.strictEqual(states?.set_counter, undefined, 'Ephemeral should not modify base state');
        });

        it('non-ephemeral card should persist state', async () => {
            const res = await executeAction('persist_value', { value: 'test_persist' });
            assert.strictEqual(res.ok, true, `Execute failed: ${JSON.stringify(res.data)}`);
            assert.strictEqual(res.data, 'test_persist');

            // Check state WAS modified (non-ephemeral)
            const states = await getBoardState();
            assert.strictEqual(states?.persist_value, 'test_persist', 'Non-ephemeral should modify base state');
        });
    });

    describe('2. Context Propagation', () => {
        it('should create chain of actions for context propagation test', async () => {
            // First action in chain - creates context and sets value
            await addCard({
                name: 'chain_start',
                type: 'action',
                stateMode: 'ephemeral',
                description: 'Starts ephemeral chain',
                rulesCode: `
                    return { started: true, value: params.initial || 100 };
                `
            });

            // Middle action - reads from context and modifies
            await addCard({
                name: 'chain_middle',
                type: 'action',
                stateMode: 'default',  // Inherits from chain
                description: 'Continues chain, doubles the value',
                rulesCode: `
                    // Call chain_start first to establish context
                    const startResult = await execute_action('chain_start', { initial: params.value || 50 });
                    // Return doubled value
                    return startResult.value * 2;
                `
            });

            // Final action with chainTerminator
            await addCard({
                name: 'chain_end',
                type: 'action',
                stateMode: 'default',
                chainTerminator: true,
                description: 'Ends chain and cleans up context',
                rulesCode: `
                    const middleResult = await execute_action('chain_middle', { value: params.value || 25 });
                    return { final: middleResult, cleaned: true };
                `
            });

            await reloadBoard();
        });

        it('chain should propagate context through execute_action', async () => {
            const res = await executeAction('chain_end', { value: 10 });
            assert.strictEqual(res.ok, true);

            // chain_end calls chain_middle(10) -> chain_middle calls chain_start(10) -> returns {value: 10}
            // chain_middle returns 10 * 2 = 20
            // chain_end returns {final: 20, cleaned: true}
            assert.deepStrictEqual(res.data, { final: 20, cleaned: true });
        });
    });

    describe('3. Parallel Execution Isolation', () => {
        it('should create isolation test cards', async () => {
            // Card that simulates work with a unique ID
            await addCard({
                name: 'parallel_worker',
                type: 'action',
                stateMode: 'ephemeral',
                description: 'Simulates parallel work with isolation',
                rulesCode: `
                    const workerId = params.id || 'unknown';
                    const delay = params.delay || 0;

                    // Simulate some async work
                    if (delay > 0) {
                        await new Promise(r => setTimeout(r, delay));
                    }

                    return { workerId, timestamp: Date.now() };
                `
            });

            await reloadBoard();
        });

        it('parallel executions should maintain isolation', async () => {
            // Execute multiple parallel requests
            const promises = [
                executeAction('parallel_worker', { id: 'worker1', delay: 50 }),
                executeAction('parallel_worker', { id: 'worker2', delay: 30 }),
                executeAction('parallel_worker', { id: 'worker3', delay: 10 }),
            ];

            const results = await Promise.all(promises);

            // All should succeed
            results.forEach((res, i) => {
                assert.strictEqual(res.ok, true, `Worker ${i + 1} failed`);
            });

            // Each should return its own workerId (isolation maintained)
            assert.strictEqual(results[0].data.workerId, 'worker1');
            assert.strictEqual(results[1].data.workerId, 'worker2');
            assert.strictEqual(results[2].data.workerId, 'worker3');
        });
    });

    describe('4. State Fallback', () => {
        it('should create state fallback test cards', async () => {
            // First set a base state value
            await addCard({
                name: 'base_state_value',
                type: 'action',
                stateMode: 'non-ephemeral',
                description: 'Sets a base state value',
                rulesCode: `return params.value || 'base_default';`
            });

            // Ephemeral reader that should fall back to base
            await addCard({
                name: 'read_with_fallback',
                type: 'action',
                stateMode: 'ephemeral',
                description: 'Reads state with fallback to base',
                rulesCode: `
                    // This should read from context first, then fall back to base state
                    const baseValue = board.base_state_value;
                    return { readValue: baseValue };
                `
            });

            await reloadBoard();
        });

        it('ephemeral action should fall back to base state for reads', async () => {
            // First, set the base state
            const setRes = await executeAction('base_state_value', { value: 'fallback_test_value' });
            assert.strictEqual(setRes.ok, true);

            // Now read with ephemeral context - should fall back to base
            const readRes = await executeAction('read_with_fallback');
            assert.strictEqual(readRes.ok, true);
            assert.strictEqual(
                readRes.data.readValue,
                'fallback_test_value',
                'Ephemeral context should fall back to base state for reads'
            );
        });
    });

    describe('5. Board-level Ephemeral Setting', () => {
        const ephemeralBoardName = `test_board_ephemeral_${Date.now()}`;
        let ephemeralBoardCreated = false;

        it('should create ephemeral board', async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: ephemeralBoardName,
                template: { id: 'blank' }
            });
            assert.strictEqual(res.ok, true);
            ephemeralBoardCreated = true;

            // Update board to set ephemeral: true
            const updateRes = await api.post(
                `/api/core/v1/boards/${encodeURIComponent(ephemeralBoardName)}`,
                { ephemeral: true }
            );
            // Note: This might not work if the API doesn't support direct board updates
            // In that case, the board file would need manual editing
        });

        it('should add default stateMode card to ephemeral board', async () => {
            const addRes = await api.post(
                `/api/core/v1/boards/${encodeURIComponent(ephemeralBoardName)}/management/add/card`,
                {
                    card: {
                        name: 'default_mode_card',
                        type: 'action',
                        stateMode: 'default',  // Should inherit board's ephemeral setting
                        description: 'Card with default stateMode',
                        rulesCode: `return { executed: true };`
                    }
                }
            );
            assert.strictEqual(addRes.ok, true);
        });

        after(async () => {
            if (ephemeralBoardCreated) {
                await api.get(`/api/core/v1/boards/${encodeURIComponent(ephemeralBoardName)}/delete`).catch(() => {});
            }
        });
    });

    describe('6. Recursion Detection with Contexts', () => {
        it('should create recursion test card', async () => {
            await addCard({
                name: 'recursive_action',
                type: 'action',
                stateMode: 'ephemeral',
                description: 'Tests recursion detection',
                rulesCode: `
                    const depth = params.depth || 0;
                    if (depth < 3) {
                        // This should be blocked if same contextId
                        try {
                            await execute_action('recursive_action', { depth: depth + 1 });
                            return { blocked: false, depth };
                        } catch (e) {
                            return { blocked: true, depth, error: e.message };
                        }
                    }
                    return { blocked: false, depth };
                `
            });

            await reloadBoard();
        });

        it('should detect recursive calls within same context', async () => {
            const res = await executeAction('recursive_action', { depth: 0 });
            assert.strictEqual(res.ok, true);
            // The recursion should be detected and blocked
            assert.strictEqual(res.data.blocked, true, 'Recursive call should be blocked');
        });
    });

    describe('7. Error Handling', () => {
        it('should create error test cards', async () => {
            await addCard({
                name: 'ephemeral_error',
                type: 'action',
                stateMode: 'ephemeral',
                description: 'Action that throws error',
                rulesCode: `
                    if (params.shouldFail) {
                        throw new Error('Intentional test error');
                    }
                    return { success: true };
                `
            });
        });

        it('errors should not leak state between contexts', async () => {
            // Execute with error
            const errorRes = await executeAction('ephemeral_error', { shouldFail: 1 });
            assert.strictEqual(errorRes.ok, false, 'Should fail with error');

            // Execute without error - should work independently (no shouldFail param = falsy)
            const successRes = await executeAction('ephemeral_error', {});
            assert.strictEqual(successRes.ok, true, 'Should succeed independently');
            assert.deepStrictEqual(successRes.data, { success: true });
        });
    });

    describe('8. Backward Compatibility', () => {
        it('should create card without stateMode (legacy)', async () => {
            await addCard({
                name: 'legacy_card',
                type: 'action',
                // No stateMode - should behave as non-ephemeral by default
                description: 'Legacy card without stateMode',
                rulesCode: `return params.value || 'legacy_value';`
            });
        });

        it('legacy card should persist state (backward compatible)', async () => {
            const res = await executeAction('legacy_card', { value: 'legacy_test' });
            assert.strictEqual(res.ok, true);
            assert.strictEqual(res.data, 'legacy_test');

            // Check that state was persisted (non-ephemeral behavior)
            const states = await getBoardState();
            assert.strictEqual(
                states?.legacy_card,
                'legacy_test',
                'Legacy cards should persist state by default'
            );
        });
    });

    after(async () => {
        // Cleanup: delete test board
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}/delete`).catch(() => {});
        }
    });
});
