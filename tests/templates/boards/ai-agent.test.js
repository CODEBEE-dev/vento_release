/**
 * AI Agent Template E2E Tests
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../../utils/api');

const T = 3000; // 3s timeout per test

describe('Template: AI Agent', { timeout: 60000 }, () => {
    const testBoardName = `test_ai_agent_${Date.now()}`;
    let boardCreated = false;

    const getBoard = () => api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}`);

    it('should create board from ai agent template', { timeout: T }, async () => {
        const res = await api.post('/api/core/v1/import/board', {
            name: testBoardName,
            template: { id: 'ai agent' }
        });
        assert.strictEqual(res.ok, true, `Failed: ${JSON.stringify(res.data)}`);
        boardCreated = true;
    });

    it('should have exactly 4 cards', { timeout: T }, async () => {
        const res = await getBoard();
        assert.strictEqual(res.data.cards.length, 4);
    });

    it('should have agent_input card', { timeout: T }, async () => {
        const res = await getBoard();
        const card = res.data.cards.find(c => c.name === 'agent_input');
        assert.ok(card, 'agent_input should exist');
        assert.strictEqual(card.type, 'action');
        assert.strictEqual(card.enableAgentInputMode, true);
        assert.strictEqual(card.manualAPIResponse, true);
    });

    it('should have current_request card', { timeout: T }, async () => {
        const res = await getBoard();
        const card = res.data.cards.find(c => c.name === 'current_request');
        assert.ok(card);
        assert.strictEqual(card.type, 'action');
    });

    it('should have agent_core card', { timeout: T }, async () => {
        const res = await getBoard();
        const card = res.data.cards.find(c => c.name === 'agent_core');
        assert.ok(card);
        assert.strictEqual(card.type, 'action');
    });

    it('should have reply card', { timeout: T }, async () => {
        const res = await getBoard();
        const card = res.data.cards.find(c => c.name === 'reply');
        assert.ok(card);
        assert.strictEqual(card.type, 'action');
    });

    it('current_request should link to agent_core', { timeout: T }, async () => {
        const res = await getBoard();
        const card = res.data.cards.find(c => c.name === 'current_request');
        const link = card.links?.find(l => l.name === 'agent_core');
        assert.ok(link, 'should link to agent_core');
        assert.strictEqual(link.type, 'post');
    });

    it('agent_core should link to reply', { timeout: T }, async () => {
        const res = await getBoard();
        const card = res.data.cards.find(c => c.name === 'agent_core');
        const link = card.links?.find(l => l.name === 'reply');
        assert.ok(link, 'should link to reply');
    });

    it('agent_input should have presets', { timeout: T }, async () => {
        const res = await getBoard();
        const card = res.data.cards.find(c => c.name === 'agent_input');
        assert.ok(card.presets?.push, 'should have push preset');
        assert.ok(card.presets?.reply, 'should have reply preset');
        assert.ok(card.presets?.skip, 'should have skip preset');
        assert.ok(card.presets?.reset, 'should have reset preset');
    });

    it('should have bot icon', { timeout: T }, async () => {
        const res = await getBoard();
        assert.strictEqual(res.data.icon, 'bot');
    });

    it('should execute reset action', { timeout: T }, async () => {
        const res = await api.get(
            `/api/core/v1/boards/${encodeURIComponent(testBoardName)}/actions/agent_input?action=reset`
        );
        assert.strictEqual(res.ok, true);
    });

    it('should add custom action', { timeout: T }, async () => {
        const res = await api.post(
            `/api/core/v1/boards/${encodeURIComponent(testBoardName)}/management/add/card`,
            { card: { name: 'custom_helper', type: 'action', rulesCode: 'return { ok: true }' } }
        );
        assert.strictEqual(res.ok, true);
    });

    it('should execute custom action', { timeout: T }, async () => {
        const res = await api.get(
            `/api/core/v1/boards/${encodeURIComponent(testBoardName)}/actions/custom_helper`
        );
        assert.strictEqual(res.ok, true);
        assert.deepStrictEqual(res.data, { ok: true });
    });

    it('should now have 5 cards', { timeout: T }, async () => {
        const res = await getBoard();
        assert.strictEqual(res.data.cards.length, 5);
    });

    after(async () => {
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}/delete`).catch(() => {});
        }
    });
});
