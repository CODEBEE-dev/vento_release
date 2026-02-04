/**
 * Blank Template E2E Tests
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../../utils/api');

const T = 3000; // 3s timeout per test

describe('Template: Blank Board', { timeout: 30000 }, () => {
    const testBoardName = `test_blank_${Date.now()}`;
    let boardCreated = false;

    it('should create board from blank template', { timeout: T }, async () => {
        const res = await api.post('/api/core/v1/import/board', {
            name: testBoardName,
            template: { id: 'blank' }
        });
        assert.strictEqual(res.ok, true, `Failed: ${JSON.stringify(res.data)}`);
        boardCreated = true;
    });

    it('should appear in boards list', { timeout: T }, async () => {
        const res = await api.get('/api/core/v1/boards');
        assert.strictEqual(res.ok, true);
        const found = res.data.items.some(b => b.name === testBoardName);
        assert.ok(found, `Board not found in list`);
    });

    it('should have zero cards', { timeout: T }, async () => {
        const res = await api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}`);
        assert.strictEqual(res.ok, true);
        assert.strictEqual(res.data.cards.length, 0, 'blank should have no cards');
    });

    it('should have autopilot disabled', { timeout: T }, async () => {
        const res = await api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}`);
        assert.strictEqual(res.data.autopilot, false);
    });

    it('should NOT have agent_input card', { timeout: T }, async () => {
        const res = await api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}`);
        const hasAgentInput = res.data.cards.some(c => c.name === 'agent_input');
        assert.strictEqual(hasAgentInput, false);
    });

    it('should add a value card', { timeout: T }, async () => {
        const res = await api.post(
            `/api/core/v1/boards/${encodeURIComponent(testBoardName)}/management/add/card`,
            { card: { name: 'test_value', type: 'value', rulesCode: 'return 42' } }
        );
        assert.strictEqual(res.ok, true, `Failed: ${JSON.stringify(res.data)}`);
    });

    it('should add an action card', { timeout: T }, async () => {
        const res = await api.post(
            `/api/core/v1/boards/${encodeURIComponent(testBoardName)}/management/add/card`,
            { card: { name: 'test_action', type: 'action', rulesCode: 'return "executed"' } }
        );
        assert.strictEqual(res.ok, true);
    });

    it('should now have 2 cards', { timeout: T }, async () => {
        const res = await api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}`);
        assert.strictEqual(res.data.cards.length, 2);
    });

    it('should add card with parameters', { timeout: T }, async () => {
        const res = await api.post(
            `/api/core/v1/boards/${encodeURIComponent(testBoardName)}/management/add/card`,
            {
                card: {
                    name: 'echo',
                    type: 'action',
                    configParams: { input: { visible: true, defaultValue: 'default', type: 'string' } },
                    rulesCode: 'return `Echo: ${params.input}`'
                }
            }
        );
        assert.strictEqual(res.ok, true);
    });

    it('should execute the action card', { timeout: T }, async () => {
        const res = await api.get(
            `/api/core/v1/boards/${encodeURIComponent(testBoardName)}/actions/test_action`
        );
        assert.strictEqual(res.ok, true);
        assert.strictEqual(res.data, 'executed');
    });

    it('should execute with default parameter', { timeout: T }, async () => {
        const res = await api.get(
            `/api/core/v1/boards/${encodeURIComponent(testBoardName)}/actions/echo`
        );
        assert.strictEqual(res.ok, true);
        assert.strictEqual(res.data, 'Echo: default');
    });

    it('should execute with custom parameter', { timeout: T }, async () => {
        const res = await api.get(
            `/api/core/v1/boards/${encodeURIComponent(testBoardName)}/actions/echo?input=hello`
        );
        assert.strictEqual(res.ok, true);
        assert.strictEqual(res.data, 'Echo: hello');
    });

    after(async () => {
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}/delete`).catch(() => {});
        }
    });
});
