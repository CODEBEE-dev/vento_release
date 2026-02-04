/**
 * Workspaces API E2E Tests
 *
 * Tests for workspace listing (read-only)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Workspaces API', () => {
    describe('List Workspaces', () => {
        it('should list all workspaces', async () => {
            const res = await api.get('/api/core/v1/workspaces');

            assert.strictEqual(res.ok, true, `Should list workspaces, got ${res.status}`);
            assert.ok(res.data.items !== undefined, 'Should have items array');
        });

        it('should have workspace with name property', async () => {
            const res = await api.get('/api/core/v1/workspaces');

            assert.strictEqual(res.ok, true);
            if (res.data.items && res.data.items.length > 0) {
                const workspace = res.data.items[0];
                assert.ok('name' in workspace, 'Workspace should have name property');
            }
        });

        it('should require auth to list workspaces', async () => {
            const res = await api.getNoAuth('/api/core/v1/workspaces');

            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow listing workspaces with workspaces.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/workspaces', ['workspaces.read']);
            assert.ok(res.status !== 403, `Should allow with workspaces.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing workspaces without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/workspaces');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });
    });
});
