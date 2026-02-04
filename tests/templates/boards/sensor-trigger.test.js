/**
 * Sensor Trigger Template E2E Tests
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../../utils/api');

const T = 3000; // 3s timeout per test

describe('Template: Sensor Trigger', { timeout: 60000 }, () => {
    const testBoardName = `test_sensor_trigger_${Date.now()}`;
    let boardCreated = false;

    const getBoard = () => api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}`);
    const getCard = async (name) => {
        const res = await getBoard();
        return res.data.cards.find(c => c.name === name);
    };
    const execAction = (name, params = {}) => {
        const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
        return api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}/actions/${name}${qs ? '?' + qs : ''}`);
    };

    it('should create board from sensor trigger template', { timeout: T }, async () => {
        const res = await api.post('/api/core/v1/import/board', {
            name: testBoardName,
            template: { id: 'sensor trigger' }
        });
        assert.strictEqual(res.ok, true, `Failed: ${JSON.stringify(res.data)}`);
        boardCreated = true;
    });

    it('should have exactly 4 cards', { timeout: T }, async () => {
        const res = await getBoard();
        assert.strictEqual(res.data.cards.length, 4);
    });

    it('should have sensor value card (type: value)', { timeout: T }, async () => {
        const card = await getCard('sensor value');
        assert.ok(card);
        assert.strictEqual(card.type, 'value');
    });

    it('should have thresholded value card (type: value)', { timeout: T }, async () => {
        const card = await getCard('thresholded value');
        assert.ok(card);
        assert.strictEqual(card.type, 'value');
    });

    it('should have below actions card (type: action)', { timeout: T }, async () => {
        const card = await getCard('below actions');
        assert.ok(card);
        assert.strictEqual(card.type, 'action');
    });

    it('should have above actions card (type: action)', { timeout: T }, async () => {
        const card = await getCard('above actions');
        assert.ok(card);
        assert.strictEqual(card.type, 'action');
    });

    it('should have 2 value cards and 2 action cards', { timeout: T }, async () => {
        const res = await getBoard();
        const valueCards = res.data.cards.filter(c => c.type === 'value');
        const actionCards = res.data.cards.filter(c => c.type === 'action');
        assert.strictEqual(valueCards.length, 2);
        assert.strictEqual(actionCards.length, 2);
    });

    it('threshold should default to 100', { timeout: T }, async () => {
        const card = await getCard('thresholded value');
        assert.strictEqual(card.configParams?.threshold?.defaultValue, '100');
    });

    it('threshold should be number type', { timeout: T }, async () => {
        const card = await getCard('thresholded value');
        assert.strictEqual(card.configParams?.threshold?.type, 'number');
    });

    it('below actions should have button label ON', { timeout: T }, async () => {
        const card = await getCard('below actions');
        assert.strictEqual(card.buttonLabel, 'ON');
    });

    it('above actions should have button label OFF', { timeout: T }, async () => {
        const card = await getCard('above actions');
        assert.strictEqual(card.buttonLabel, 'OFF');
    });

    it('action cards should have displayResponse: false', { timeout: T }, async () => {
        const below = await getCard('below actions');
        const above = await getCard('above actions');
        assert.strictEqual(below.displayResponse, false);
        assert.strictEqual(above.displayResponse, false);
    });

    it('sensor value should have sun icon', { timeout: T }, async () => {
        const card = await getCard('sensor value');
        assert.strictEqual(card.icon, 'sun');
    });

    it('thresholded value should have scan-eye icon', { timeout: T }, async () => {
        const card = await getCard('thresholded value');
        assert.strictEqual(card.icon, 'scan-eye');
    });

    it('should have boardCode with onChange', { timeout: T }, async () => {
        const res = await getBoard();
        assert.ok(res.data.boardCode?.includes('onChange'));
    });

    it('boardCode should watch thresholded value', { timeout: T }, async () => {
        const res = await getBoard();
        assert.ok(res.data.boardCode?.includes('thresholded value'));
    });

    it('boardCode should reference both actions', { timeout: T }, async () => {
        const res = await getBoard();
        assert.ok(res.data.boardCode?.includes('above actions'));
        assert.ok(res.data.boardCode?.includes('below actions'));
    });

    it('should have devices array', { timeout: T }, async () => {
        const res = await getBoard();
        assert.ok(Array.isArray(res.data.devices));
    });

    it('should have rules array', { timeout: T }, async () => {
        const res = await getBoard();
        assert.ok(Array.isArray(res.data.rules));
    });

    it('should have bot-message-square icon', { timeout: T }, async () => {
        const res = await getBoard();
        assert.strictEqual(res.data.icon, 'bot-message-square');
    });

    it('should have autopilot disabled', { timeout: T }, async () => {
        const res = await getBoard();
        assert.strictEqual(res.data.autopilot, false);
    });

    it('should have autoplay: false in settings', { timeout: T }, async () => {
        const res = await getBoard();
        assert.strictEqual(res.data.settings?.autoplay, false);
    });

    after(async () => {
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${encodeURIComponent(testBoardName)}/delete`).catch(() => {});
        }
    });
});
