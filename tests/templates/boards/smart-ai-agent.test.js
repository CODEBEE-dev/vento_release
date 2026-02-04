/**
 * Smart AI Agent Template E2E Tests
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../../utils/api');

const T = 3000; // 3s timeout per test

describe('Template: Smart AI Agent', { timeout: 60000 }, () => {
    const testBoardName = `test_smart_ai_${Date.now()}`;
    let boardCreated = false;

    const getBoard = () => api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}`);
    const getCard = async (name) => {
        const res = await getBoard();
        return res.data.cards.find(c => c.name === name);
    };

    it('should create board from smart ai agent template', { timeout: T }, async () => {
        const res = await api.post('/api/core/v1/import/board', {
            name: testBoardName,
            template: { id: 'smart ai agent' }
        });
        assert.strictEqual(res.ok, true, `Failed: ${JSON.stringify(res.data)}`);
        boardCreated = true;
    });

    it('should have exactly 6 cards', { timeout: T }, async () => {
        const res = await getBoard();
        assert.strictEqual(res.data.cards.length, 6);
    });

    const expectedCards = ['agent_input', 'user_request', 'agent_prepare', 'agent_core', 'reply', 'reset'];
    for (const cardName of expectedCards) {
        it(`should have ${cardName} card`, { timeout: T }, async () => {
            const card = await getCard(cardName);
            assert.ok(card, `${cardName} should exist`);
            assert.strictEqual(card.type, 'action');
        });
    }

    it('user_request should link to agent_prepare', { timeout: T }, async () => {
        const card = await getCard('user_request');
        const link = card.links?.find(l => l.name === 'agent_prepare');
        assert.ok(link);
        assert.strictEqual(link.type, 'post');
    });

    it('agent_prepare should link to agent_core', { timeout: T }, async () => {
        const card = await getCard('agent_prepare');
        const link = card.links?.find(l => l.name === 'agent_core');
        assert.ok(link);
    });

    it('agent_core should link to reply', { timeout: T }, async () => {
        const card = await getCard('agent_core');
        const link = card.links?.find(l => l.name === 'reply');
        assert.ok(link);
    });

    it('agent_prepare should have allow_execution: true', { timeout: T }, async () => {
        const card = await getCard('agent_prepare');
        const val = card.configParams?.allow_execution?.defaultValue;
        assert.ok(val === true || val === 'true', `Expected true, got ${val}`);
    });

    it('agent_prepare should have allow_read: false', { timeout: T }, async () => {
        const card = await getCard('agent_prepare');
        const val = card.configParams?.allow_read?.defaultValue;
        assert.ok(val === false || val === 'false', `Expected false, got ${val}`);
    });

    it('agent_core should have allow_read: true', { timeout: T }, async () => {
        const card = await getCard('agent_core');
        const val = card.configParams?.allow_read?.defaultValue;
        assert.ok(val === true || val === 'true', `Expected true, got ${val}`);
    });

    it('agent_core should have allow_execution: false', { timeout: T }, async () => {
        const card = await getCard('agent_core');
        const val = card.configParams?.allow_execution?.defaultValue;
        assert.ok(val === false || val === 'false', `Expected false, got ${val}`);
    });

    it('reset should have excluded params', { timeout: T }, async () => {
        const card = await getCard('reset');
        const excluded = card.configParams?.excluded?.defaultValue;
        // Can be array or string representation
        if (Array.isArray(excluded)) {
            assert.ok(excluded.includes('agent_input'));
            assert.ok(excluded.includes('user_request'));
        } else if (typeof excluded === 'string') {
            assert.ok(excluded.includes('agent_input'));
            assert.ok(excluded.includes('user_request'));
        } else {
            assert.fail(`Expected array or string, got ${typeof excluded}`);
        }
    });

    it('reply should have reset parameter defaulting to true', { timeout: T }, async () => {
        const card = await getCard('reply');
        const val = card.configParams?.reset?.defaultValue;
        assert.ok(val === true || val === 'true', `Expected true, got ${val}`);
    });

    it('should have graphLayout', { timeout: T }, async () => {
        const res = await getBoard();
        assert.ok(res.data.graphLayout);
        assert.ok(typeof res.data.graphLayout === 'object');
    });

    it('should have bot-message-square icon', { timeout: T }, async () => {
        const res = await getBoard();
        assert.strictEqual(res.data.icon, 'bot-message-square');
    });

    it('should have responsive layouts', { timeout: T }, async () => {
        const res = await getBoard();
        const layouts = res.data.layouts;
        assert.ok(layouts?.lg);
        assert.ok(layouts?.md);
        assert.ok(layouts?.sm);
        assert.ok(layouts?.xs);
    });

    after(async () => {
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}/delete`).catch(() => {});
        }
    });
});
