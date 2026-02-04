/**
 * Chatbots API E2E Tests
 *
 * Tests for chatbot management CRUD operations and permission enforcement
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Chatbots API', () => {
    const testPrefix = `test_chatbot_${Date.now()}`;
    const createdChatbots = [];

    after(async () => {
        for (const chatbotName of createdChatbots) {
            await api.get(`/api/core/v1/chatbots/${encodeURIComponent(chatbotName)}/delete`).catch(() => {});
        }
    });

    describe('List Chatbots', () => {
        it('should list all chatbots', async () => {
            const res = await api.get('/api/core/v1/chatbots');
            assert.strictEqual(res.ok, true, `Should list chatbots, got ${res.status}`);
            assert.ok(res.data.items !== undefined, 'Should have items array');
        });

        it('should require auth to list chatbots', async () => {
            const res = await api.getNoAuth('/api/core/v1/chatbots');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow listing chatbots with chatbots.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/chatbots', ['chatbots.read']);
            assert.ok(res.status !== 403, `Should allow with chatbots.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing chatbots without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/chatbots');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should deny creating chatbot without permission', async () => {
            const res = await api.postNoPermissions('/api/core/v1/chatbots', {
                name: `denied_chatbot_${Date.now()}`
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow creating chatbot with chatbots.create permission', async () => {
            const permChatbotName = `perm_chatbot_${Date.now()}`;
            const res = await api.postWithPermissions('/api/core/v1/chatbots', {
                name: permChatbotName,
                type: 'custom'
            }, ['chatbots.create']);
            assert.ok(res.status !== 403, `Should allow with chatbots.create permission (got ${res.status})`);
            if (res.ok) {
                await api.get(`/api/core/v1/chatbots/${encodeURIComponent(permChatbotName)}/delete`).catch(() => {});
            }
        });

        it('should allow deleting chatbot with chatbots.delete permission', async () => {
            const deleteChatbotName = `delete_perm_chatbot_${Date.now()}`;
            await api.post('/api/core/v1/chatbots', {
                name: deleteChatbotName,
                type: 'custom'
            });

            const res = await api.getWithPermissions(`/api/core/v1/chatbots/${encodeURIComponent(deleteChatbotName)}/delete`, ['chatbots.delete']);
            assert.ok(res.status !== 403, `Should allow with chatbots.delete permission (got ${res.status})`);
        });

        it('should deny deleting chatbot without permission', async () => {
            const denyDeleteChatbotName = `deny_delete_chatbot_${Date.now()}`;
            await api.post('/api/core/v1/chatbots', {
                name: denyDeleteChatbotName,
                type: 'custom'
            });

            const res = await api.getNoPermissions(`/api/core/v1/chatbots/${encodeURIComponent(denyDeleteChatbotName)}/delete`);
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);

            await api.get(`/api/core/v1/chatbots/${encodeURIComponent(denyDeleteChatbotName)}/delete`).catch(() => {});
        });
    });
});
