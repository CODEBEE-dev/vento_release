/**
 * Groups API E2E Tests
 *
 * Tests user groups management
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Groups API', () => {
    const testGroupName = `test_group_${Date.now()}`;
    let groupCreated = false;

    it('should list groups', async () => {
        const res = await api.get('/api/core/v1/groups');

        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.ok(res.data.items, 'Response should have items array');
    });

    it('should have default admin group', async () => {
        const res = await api.get('/api/core/v1/groups');

        assert.strictEqual(res.ok, true);

        const hasAdmin = res.data.items.some(g => g.name === 'admin');
        assert.ok(hasAdmin, 'Should have admin group');
    });

    it('should create a new group', async () => {
        const res = await api.post('/api/core/v1/groups', {
            name: testGroupName,
            workspaces: ['editor'],
            admin: false
        });

        assert.strictEqual(res.ok, true, `Expected success creating group, got status ${res.status}: ${JSON.stringify(res.data)}`);
        groupCreated = true;
    });

    it('should list groups and find created group', async () => {
        const res = await api.get('/api/core/v1/groups');

        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);

        const found = res.data.items.some(g => g.name === testGroupName);
        assert.ok(found, `Group "${testGroupName}" should exist in list`);
    });

    it('should get group details', async () => {
        const res = await api.get(`/api/core/v1/groups/${encodeURIComponent(testGroupName)}`);

        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.strictEqual(res.data.name, testGroupName, 'Group name should match');
    });

    it('should update group', async () => {
        // AutoAPI uses POST for updates, not PUT
        const res = await api.post(`/api/core/v1/groups/${encodeURIComponent(testGroupName)}`, {
            name: testGroupName,
            workspaces: ['editor', 'admin'],
            admin: false
        });

        assert.strictEqual(res.ok, true, `Expected success updating group, got status ${res.status}`);

        // Verify update
        const verify = await api.get(`/api/core/v1/groups/${encodeURIComponent(testGroupName)}`);
        assert.ok(verify.data.workspaces.includes('admin'), 'Workspaces should be updated');
    });

    it('should delete group', async () => {
        // AutoAPI uses GET /:key/delete, not DELETE
        const res = await api.get(`/api/core/v1/groups/${encodeURIComponent(testGroupName)}/delete`);

        assert.strictEqual(res.ok, true, `Expected success deleting group, got status ${res.status}`);
        groupCreated = false;
    });

    after(async () => {
        if (groupCreated) {
            await api.get(`/api/core/v1/groups/${encodeURIComponent(testGroupName)}/delete`).catch(() => {});
        }
    });

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow listing groups with groups.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/groups', ['groups.read']);
            assert.ok(res.status !== 403, `Should allow with groups.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing groups without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/groups');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow creating group with groups.create permission', async () => {
            const permTestGroupName = `perm_test_group_${Date.now()}`;
            const res = await api.postWithPermissions('/api/core/v1/groups', {
                name: permTestGroupName,
                workspaces: ['editor'],
                admin: false
            }, ['groups.create']);
            assert.ok(res.status !== 403, `Should allow with groups.create permission (got ${res.status})`);
            // Cleanup
            if (res.ok) {
                await api.get(`/api/core/v1/groups/${encodeURIComponent(permTestGroupName)}/delete`).catch(() => {});
            }
        });

        it('should deny creating group without permission', async () => {
            const res = await api.postNoPermissions('/api/core/v1/groups', {
                name: `denied_group_${Date.now()}`,
                workspaces: ['editor'],
                admin: false
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow updating group with groups.update permission', async () => {
            // Create a group to update
            const updateGroupName = `update_perm_test_${Date.now()}`;
            await api.post('/api/core/v1/groups', {
                name: updateGroupName,
                workspaces: ['editor'],
                admin: false
            });

            const res = await api.postWithPermissions(`/api/core/v1/groups/${encodeURIComponent(updateGroupName)}`, {
                name: updateGroupName,
                workspaces: ['editor', 'viewer'],
                admin: false
            }, ['groups.update']);
            assert.ok(res.status !== 403, `Should allow with groups.update permission (got ${res.status})`);

            // Cleanup
            await api.get(`/api/core/v1/groups/${encodeURIComponent(updateGroupName)}/delete`).catch(() => {});
        });

        it('should deny updating group without permission', async () => {
            if (!groupCreated) return;
            const res = await api.postNoPermissions(`/api/core/v1/groups/${encodeURIComponent(testGroupName)}`, {
                name: testGroupName,
                workspaces: ['editor', 'viewer'],
                admin: false
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow deleting group with groups.delete permission', async () => {
            // Create a group to delete
            const deleteGroupName = `delete_perm_test_${Date.now()}`;
            await api.post('/api/core/v1/groups', {
                name: deleteGroupName,
                workspaces: ['editor'],
                admin: false
            });

            const res = await api.getWithPermissions(`/api/core/v1/groups/${encodeURIComponent(deleteGroupName)}/delete`, ['groups.delete']);
            assert.ok(res.status !== 403, `Should allow with groups.delete permission (got ${res.status})`);
        });

        it('should deny deleting group without permission', async () => {
            if (!groupCreated) return;
            const res = await api.getNoPermissions(`/api/core/v1/groups/${encodeURIComponent(testGroupName)}/delete`);
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });
    });
});
