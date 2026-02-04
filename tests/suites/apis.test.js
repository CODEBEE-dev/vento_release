/**
 * APIs (Automations) API E2E Tests
 *
 * Tests for API definition CRUD operations and permission enforcement
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('APIs API', () => {
    const testPrefix = `test_api_${Date.now()}`;
    const createdApis = [];

    after(async () => {
        for (const apiName of createdApis) {
            await api.get(`/api/core/v1/apis/${encodeURIComponent(apiName)}/delete`).catch(() => {});
        }
    });

    describe('List APIs', () => {
        it('should list all APIs', async () => {
            const res = await api.get('/api/core/v1/apis');
            assert.strictEqual(res.ok, true, `Should list APIs, got ${res.status}`);
            assert.ok(res.data.items !== undefined, 'Should have items array');
        });

        it('should require auth to list APIs', async () => {
            const res = await api.getNoAuth('/api/core/v1/apis');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow listing APIs with apis.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/apis', ['apis.read']);
            assert.ok(res.status !== 403, `Should allow with apis.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing APIs without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/apis');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should deny creating API without permission', async () => {
            const res = await api.postNoPermissions('/api/core/v1/apis', {
                name: `denied_api_${Date.now()}`
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow creating API with apis.create permission', async () => {
            const permApiName = `perm_api_${Date.now()}`;
            const res = await api.postWithPermissions('/api/core/v1/apis', {
                name: permApiName,
                path: `/test/${permApiName}`,
                method: 'GET'
            }, ['apis.create']);
            assert.ok(res.status !== 403, `Should allow with apis.create permission (got ${res.status})`);
            if (res.ok) {
                await api.get(`/api/core/v1/apis/${encodeURIComponent(permApiName)}/delete`).catch(() => {});
            }
        });

        it('should allow deleting API with apis.delete permission', async () => {
            const deleteApiName = `delete_perm_api_${Date.now()}`;
            await api.post('/api/core/v1/apis', {
                name: deleteApiName,
                path: `/test/${deleteApiName}`,
                method: 'GET'
            });

            const res = await api.getWithPermissions(`/api/core/v1/apis/${encodeURIComponent(deleteApiName)}/delete`, ['apis.delete']);
            assert.ok(res.status !== 403, `Should allow with apis.delete permission (got ${res.status})`);
        });

        it('should deny deleting API without permission', async () => {
            const denyDeleteApiName = `deny_delete_api_${Date.now()}`;
            await api.post('/api/core/v1/apis', {
                name: denyDeleteApiName,
                path: `/test/${denyDeleteApiName}`,
                method: 'GET'
            });

            const res = await api.getNoPermissions(`/api/core/v1/apis/${encodeURIComponent(denyDeleteApiName)}/delete`);
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);

            await api.get(`/api/core/v1/apis/${encodeURIComponent(denyDeleteApiName)}/delete`).catch(() => {});
        });
    });
});
