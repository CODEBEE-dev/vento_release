/**
 * Assets API E2E Tests
 *
 * Tests for asset management CRUD operations and permission enforcement
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Assets API', () => {
    const testPrefix = `test_asset_${Date.now()}`;
    const createdAssets = [];

    after(async () => {
        for (const assetName of createdAssets) {
            await api.get(`/api/core/v1/assets/${encodeURIComponent(assetName)}/delete`).catch(() => {});
        }
    });

    describe('List Assets', () => {
        it('should list all assets', async () => {
            const res = await api.get('/api/core/v1/assets');
            assert.strictEqual(res.ok, true, `Should list assets, got ${res.status}`);
            assert.ok(res.data.items !== undefined, 'Should have items array');
        });

        it('should require auth to list assets', async () => {
            const res = await api.getNoAuth('/api/core/v1/assets');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow listing assets with assets.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/assets', ['assets.read']);
            assert.ok(res.status !== 403, `Should allow with assets.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing assets without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/assets');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should deny creating asset without assets.install permission', async () => {
            const res = await api.postNoPermissions('/api/core/v1/assets', {
                name: `denied_asset_${Date.now()}`
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow creating asset with assets.install permission', async () => {
            const permAssetName = `perm_asset_${Date.now()}`;
            const res = await api.postWithPermissions('/api/core/v1/assets', {
                name: permAssetName,
                type: 'extension'
            }, ['assets.install']);
            assert.ok(res.status !== 403, `Should allow with assets.install permission (got ${res.status})`);
            if (res.ok) {
                await api.get(`/api/core/v1/assets/${encodeURIComponent(permAssetName)}/delete`).catch(() => {});
            }
        });

        it('should allow deleting asset with assets.install permission', async () => {
            const deleteAssetName = `delete_perm_asset_${Date.now()}`;
            await api.post('/api/core/v1/assets', {
                name: deleteAssetName,
                type: 'extension'
            });

            const res = await api.getWithPermissions(`/api/core/v1/assets/${encodeURIComponent(deleteAssetName)}/delete`, ['assets.install']);
            assert.ok(res.status !== 403, `Should allow with assets.install permission (got ${res.status})`);
        });

        it('should deny deleting asset without assets.install permission', async () => {
            const denyDeleteAssetName = `deny_delete_asset_${Date.now()}`;
            await api.post('/api/core/v1/assets', {
                name: denyDeleteAssetName,
                type: 'extension'
            });

            const res = await api.getNoPermissions(`/api/core/v1/assets/${encodeURIComponent(denyDeleteAssetName)}/delete`);
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);

            await api.get(`/api/core/v1/assets/${encodeURIComponent(denyDeleteAssetName)}/delete`).catch(() => {});
        });
    });
});
