/**
 * Rule-Based Agent Template E2E Tests
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../../utils/api');

const T = 3000; // 3s timeout per test

describe('Template: Rule-Based Agent', { timeout: 60000 }, () => {
    const testBoardName = `test_rule_based_${Date.now()}`;
    let boardCreated = false;

    const getBoard = () => api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}`);
    const getCard = async (name) => {
        const res = await getBoard();
        return res.data.cards.find(c => c.name === name);
    };

    it('should create board from rule-based agent template', { timeout: T }, async () => {
        const res = await api.post('/api/core/v1/import/board', {
            name: testBoardName,
            template: { id: 'rule-based agent' }
        });
        assert.strictEqual(res.ok, true, `Failed: ${JSON.stringify(res.data)}`);
        boardCreated = true;
    });

    it('should have exactly 4 cards', { timeout: T }, async () => {
        const res = await getBoard();
        assert.strictEqual(res.data.cards.length, 4);
    });

    const expectedCards = ['agent_input', 'current_request', 'action', 'reply'];
    for (const cardName of expectedCards) {
        it(`should have ${cardName} card`, { timeout: T }, async () => {
            const card = await getCard(cardName);
            assert.ok(card, `${cardName} should exist`);
            assert.strictEqual(card.type, 'action');
        });
    }

    it('should NOT have agent_core card (no AI)', { timeout: T }, async () => {
        const card = await getCard('agent_core');
        assert.strictEqual(card, undefined);
    });

    it('current_request should link to action', { timeout: T }, async () => {
        const card = await getCard('current_request');
        const link = card.links?.find(l => l.name === 'action');
        assert.ok(link);
        assert.strictEqual(link.type, 'post');
    });

    it('action should link to reply', { timeout: T }, async () => {
        const card = await getCard('action');
        const link = card.links?.find(l => l.name === 'reply');
        assert.ok(link);
    });

    it('all cards should be on base layer', { timeout: T }, async () => {
        const res = await getBoard();
        for (const card of res.data.cards) {
            assert.strictEqual(card.layer, 'base', `${card.name} should be on base layer`);
        }
    });

    it('agent_input should have enableAgentInputMode', { timeout: T }, async () => {
        const card = await getCard('agent_input');
        assert.strictEqual(card.enableAgentInputMode, true);
    });

    it('agent_input should have manualAPIResponse', { timeout: T }, async () => {
        const card = await getCard('agent_input');
        assert.strictEqual(card.manualAPIResponse, true);
    });

    it('agent_input should have all presets', { timeout: T }, async () => {
        const card = await getCard('agent_input');
        assert.ok(card.presets?.push);
        assert.ok(card.presets?.reply);
        assert.ok(card.presets?.skip);
        assert.ok(card.presets?.reset);
        assert.ok(card.presets?.remove);
    });

    it('should have workflow icon', { timeout: T }, async () => {
        const res = await getBoard();
        assert.strictEqual(res.data.icon, 'workflow');
    });

    it('should have autopilot disabled', { timeout: T }, async () => {
        const res = await getBoard();
        assert.strictEqual(res.data.autopilot, false);
    });

    it('should have boardCode with boardConnect', { timeout: T }, async () => {
        const res = await getBoard();
        assert.ok(res.data.boardCode?.includes('boardConnect'));
    });

    it('should have boardUI with @card/react', { timeout: T }, async () => {
        const res = await getBoard();
        assert.ok(res.data.boardUI?.includes('@card/react'));
    });

    it('should execute action with default response', { timeout: T }, async () => {
        const res = await api.get(
            `/api/core/v1/boards/${encodeURIComponent(testBoardName)}/actions/action`
        );
        assert.strictEqual(res.ok, true);
        assert.ok(typeof res.data === 'string');
    });

    it('should execute reset action', { timeout: T }, async () => {
        const res = await api.get(
            `/api/core/v1/boards/${encodeURIComponent(testBoardName)}/actions/agent_input?action=reset`
        );
        assert.strictEqual(res.ok, true);
    });

    it('same action should produce deterministic result', { timeout: T }, async () => {
        const res1 = await api.get(
            `/api/core/v1/boards/${encodeURIComponent(testBoardName)}/actions/action`
        );
        const res2 = await api.get(
            `/api/core/v1/boards/${encodeURIComponent(testBoardName)}/actions/action`
        );
        assert.deepStrictEqual(res1.data, res2.data);
    });

    after(async () => {
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}/delete`).catch(() => {});
        }
    });
});
