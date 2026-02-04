/**
 * Packages API E2E Tests
 *
 * Tests for package management CRUD operations and permission enforcement
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Packages API', () => {
    const testPrefix = `test_pkg_${Date.now()}`;
    const createdPackages = [];

    after(async () => {
        for (const pkgName of createdPackages) {
            await api.get(`/api/core/v1/packages/${encodeURIComponent(pkgName)}/delete`).catch(() => {});
        }
    });

    describe('List Packages', () => {
        it('should list all packages', async () => {
            const res = await api.get('/api/core/v1/packages');
            assert.strictEqual(res.ok, true, `Should list packages, got ${res.status}`);
            assert.ok(res.data.items !== undefined, 'Should have items array');
        });

        it('should require auth to list packages', async () => {
            const res = await api.getNoAuth('/api/core/v1/packages');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow listing packages with packages.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/packages', ['packages.read']);
            assert.ok(res.status !== 403, `Should allow with packages.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing packages without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/packages');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should deny creating package without permission', async () => {
            const res = await api.postNoPermissions('/api/core/v1/packages', {
                name: `denied_pkg_${Date.now()}`,
                version: '1.0.0'
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow creating package with packages.create permission', async () => {
            const permPackageName = `perm_pkg_${Date.now()}`;
            const res = await api.postWithPermissions('/api/core/v1/packages', {
                name: permPackageName,
                version: '1.0.0'
            }, ['packages.create']);
            assert.ok(res.status !== 403, `Should allow with packages.create permission (got ${res.status})`);
            if (res.ok) {
                await api.get(`/api/core/v1/packages/${encodeURIComponent(permPackageName)}/delete`).catch(() => {});
            }
        });

        it('should allow deleting package with packages.delete permission', async () => {
            const deletePackageName = `delete_perm_pkg_${Date.now()}`;
            await api.post('/api/core/v1/packages', {
                name: deletePackageName,
                version: '1.0.0'
            });

            const res = await api.getWithPermissions(`/api/core/v1/packages/${encodeURIComponent(deletePackageName)}/delete`, ['packages.delete']);
            assert.ok(res.status !== 403, `Should allow with packages.delete permission (got ${res.status})`);
        });

        it('should deny deleting package without permission', async () => {
            const denyDeletePackageName = `deny_delete_pkg_${Date.now()}`;
            await api.post('/api/core/v1/packages', {
                name: denyDeletePackageName,
                version: '1.0.0'
            });

            const res = await api.getNoPermissions(`/api/core/v1/packages/${encodeURIComponent(denyDeletePackageName)}/delete`);
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);

            await api.get(`/api/core/v1/packages/${encodeURIComponent(denyDeletePackageName)}/delete`).catch(() => {});
        });
    });
});
