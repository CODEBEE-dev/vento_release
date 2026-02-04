/**
 * Permissions E2E Tests
 *
 * Tests for permission enforcement across endpoints:
 * 1. Unauthenticated access should return 401
 * 2. Authenticated WITHOUT required permission should return 403
 * 3. Authenticated WITH required permission should succeed
 * 4. Admin tokens should always succeed
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');
const { createTokenWithPermissions, createTokenWithoutPermissions } = require('../utils/tokens');

describe('Permissions', () => {
    const testPrefix = `test_perms_${Date.now()}`;
    const createdResources = [];

    after(async () => {
        for (const r of createdResources) {
            if (r.type === 'board') {
                await api.get(`/api/core/v1/boards/${r.name}/delete`).catch(() => {});
            } else if (r.type === 'user') {
                await api.get(`/api/core/v1/accounts/${r.name}/delete`).catch(() => {});
            } else if (r.type === 'setting') {
                await api.get(`/api/core/v1/settings/${encodeURIComponent(r.name)}/delete`).catch(() => {});
            } else if (r.type === 'key') {
                await api.get(`/api/core/v1/keys/${encodeURIComponent(r.name)}/delete`).catch(() => {});
            } else if (r.type === 'object') {
                await api.get(`/api/core/v1/objects/${encodeURIComponent(r.name)}/delete`).catch(() => {});
            } else if (r.type === 'group') {
                await api.get(`/api/core/v1/groups/${encodeURIComponent(r.name)}/delete`).catch(() => {});
            }
        }
    });

    // ==========================================================================
    // UNAUTHENTICATED ACCESS (401)
    // ==========================================================================

    describe('Unauthenticated Access', () => {
        it('should require auth for boards list', async () => {
            const res = await api.getNoAuth('/api/core/v1/boards');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });

        it('should require auth for accounts list', async () => {
            const res = await api.getNoAuth('/api/core/v1/accounts');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });

        it('should require auth for settings list', async () => {
            const res = await api.getNoAuth('/api/core/v1/settings');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });

        it('should require auth for keys list', async () => {
            const res = await api.getNoAuth('/api/core/v1/keys');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });

        it('should require auth for groups list', async () => {
            const res = await api.getNoAuth('/api/core/v1/groups');
            assert.strictEqual(res.status, 401, `Groups should require auth, got ${res.status}`);
        });

        it('should require auth for events list', async () => {
            const res = await api.getNoAuth('/api/core/v1/events');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });

        it('should require auth for tokens list', async () => {
            const res = await api.getNoAuth('/api/core/v1/tokens');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });

        it('should require auth for databases list', async () => {
            const res = await api.getNoAuth('/api/core/v1/databases');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });

        it('should require auth for themes list', async () => {
            const res = await api.getNoAuth('/api/core/v1/themes');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });

        it('should require auth for files access', async () => {
            const res = await api.getNoAuth('/api/core/v1/files/data');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });

        it('should require auth for objects list', async () => {
            const res = await api.getNoAuth('/api/core/v1/objects');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });

        it('should require auth for devices list', async () => {
            const res = await api.getNoAuth('/api/core/v1/devices');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });

        it('should require auth for cards list', async () => {
            const res = await api.getNoAuth('/api/core/v1/cards');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    // ==========================================================================
    // BOARDS PERMISSIONS
    // ==========================================================================

    describe('Boards Permission Enforcement', () => {
        const boardName = `${testPrefix}_board`;

        before(async () => {
            // Create a test board with admin token
            const res = await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });
            if (res.ok) {
                createdResources.push({ type: 'board', name: boardName });
            }
        });

        describe('boards.read', () => {
            it('should allow with boards.read permission', async () => {
                const res = await api.getWithPermissions('/api/core/v1/boards', ['boards.read']);
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
                assert.ok(res.status !== 401, 'Token should be valid');
            });

            it('should deny without boards.read permission', async () => {
                const res = await api.getNoPermissions('/api/core/v1/boards');
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });

            it('should allow reading specific board with permission', async () => {
                const res = await api.getWithPermissions(`/api/core/v1/boards/${boardName}`, ['boards.read']);
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny reading specific board without permission', async () => {
                const res = await api.getNoPermissions(`/api/core/v1/boards/${boardName}`);
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });

        describe('boards.create', () => {
            it('should allow with boards.create permission', async () => {
                const newBoardName = `${testPrefix}_create_perm`;
                const res = await api.postWithPermissions('/api/core/v1/import/board', {
                    name: newBoardName,
                    template: { id: 'blank' }
                }, ['boards.create']);

                if (res.ok) {
                    createdResources.push({ type: 'board', name: newBoardName });
                }
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny without boards.create permission', async () => {
                const res = await api.postNoPermissions('/api/core/v1/import/board', {
                    name: 'should_not_create',
                    template: { id: 'blank' }
                });
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });

        describe('boards.update', () => {
            it('should allow updating board with permission', async () => {
                const res = await api.postWithPermissions(`/api/core/v1/boards/${boardName}`, {
                    name: boardName,
                    description: 'Updated by permission test'
                }, ['boards.update']);
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny updating board without permission', async () => {
                const res = await api.postNoPermissions(`/api/core/v1/boards/${boardName}`, {
                    name: boardName,
                    description: 'Should not update'
                });
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });

        describe('boards.delete', () => {
            it('should allow deleting board with permission', async () => {
                // Create a board to delete
                const deleteBoardName = `${testPrefix}_delete_perm`;
                await api.post('/api/core/v1/import/board', {
                    name: deleteBoardName,
                    template: { id: 'blank' }
                });

                const res = await api.getWithPermissions(
                    `/api/core/v1/boards/${deleteBoardName}/delete`,
                    ['boards.delete']
                );
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny deleting board without permission', async () => {
                const res = await api.getNoPermissions(`/api/core/v1/boards/${boardName}/delete`);
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });
    });

    // ==========================================================================
    // USERS PERMISSIONS
    // ==========================================================================

    describe('Users Permission Enforcement', () => {
        describe('users.read', () => {
            it('should allow listing accounts with permission', async () => {
                const res = await api.getWithPermissions('/api/core/v1/accounts', ['users.read']);
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny listing accounts without permission', async () => {
                const res = await api.getNoPermissions('/api/core/v1/accounts');
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });

        describe('users.create', () => {
            it('should allow creating user with permission', async () => {
                const username = `${testPrefix}_user_perm`;
                const res = await api.postWithPermissions('/api/core/v1/accounts', {
                    username: username,
                    email: `${username}@test.com`,
                    password: 'TestPassword123!',
                    type: 'user'
                }, ['users.create']);

                if (res.ok) {
                    createdResources.push({ type: 'user', name: username });
                }
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny creating user without permission', async () => {
                const res = await api.postNoPermissions('/api/core/v1/accounts', {
                    username: 'should_not_create',
                    email: 'should_not_create@test.com',
                    password: 'TestPassword123!',
                    type: 'user'
                });
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });
    });

    // ==========================================================================
    // SETTINGS PERMISSIONS
    // ==========================================================================

    describe('Settings Permission Enforcement', () => {
        describe('settings.read', () => {
            it('should allow listing settings with permission', async () => {
                const res = await api.getWithPermissions('/api/core/v1/settings', ['settings.read']);
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny listing settings without permission', async () => {
                const res = await api.getNoPermissions('/api/core/v1/settings');
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });

        describe('settings.update', () => {
            it('should allow creating setting with permission', async () => {
                const settingName = `${testPrefix}_setting`;
                const res = await api.postWithPermissions('/api/core/v1/settings', {
                    name: settingName,
                    value: 'test_value'
                }, ['settings.update']);

                if (res.ok) {
                    createdResources.push({ type: 'setting', name: settingName });
                }
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny creating setting without permission', async () => {
                const res = await api.postNoPermissions('/api/core/v1/settings', {
                    name: 'should_not_create',
                    value: 'test'
                });
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });
    });

    // ==========================================================================
    // KEYS PERMISSIONS
    // ==========================================================================

    describe('Keys Permission Enforcement', () => {
        describe('keys.read', () => {
            it('should allow listing keys with permission', async () => {
                const res = await api.getWithPermissions('/api/core/v1/keys', ['keys.read']);
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny listing keys without permission', async () => {
                const res = await api.getNoPermissions('/api/core/v1/keys');
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });

        describe('keys.create', () => {
            it('should allow creating key with permission', async () => {
                const keyName = `${testPrefix}_key`;
                const res = await api.postWithPermissions('/api/core/v1/keys', {
                    name: keyName,
                    value: 'secret_value'
                }, ['keys.create']);

                if (res.ok) {
                    createdResources.push({ type: 'key', name: keyName });
                }
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny creating key without permission', async () => {
                const res = await api.postNoPermissions('/api/core/v1/keys', {
                    name: 'should_not_create',
                    value: 'secret'
                });
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });
    });

    // ==========================================================================
    // GROUPS PERMISSIONS
    // ==========================================================================

    describe('Groups Permission Enforcement', () => {
        describe('groups.read', () => {
            it('should allow listing groups with permission', async () => {
                const res = await api.getWithPermissions('/api/core/v1/groups', ['groups.read']);
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny listing groups without permission', async () => {
                const res = await api.getNoPermissions('/api/core/v1/groups');
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });

        describe('groups.create', () => {
            it('should allow creating group with permission', async () => {
                const groupName = `${testPrefix}_group`;
                const res = await api.postWithPermissions('/api/core/v1/groups', {
                    name: groupName,
                    permissions: ['boards.read']
                }, ['groups.create']);

                if (res.ok) {
                    createdResources.push({ type: 'group', name: groupName });
                }
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny creating group without permission', async () => {
                const res = await api.postNoPermissions('/api/core/v1/groups', {
                    name: 'should_not_create',
                    permissions: []
                });
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });
    });

    // ==========================================================================
    // EVENTS PERMISSIONS
    // ==========================================================================

    describe('Events Permission Enforcement', () => {
        describe('events.read', () => {
            it('should allow listing events with permission', async () => {
                const res = await api.getWithPermissions('/api/core/v1/events', ['events.read']);
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny listing events without permission', async () => {
                const res = await api.getNoPermissions('/api/core/v1/events');
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });
    });

    // ==========================================================================
    // DATABASES PERMISSIONS
    // ==========================================================================

    describe('Databases Permission Enforcement', () => {
        describe('databases.read', () => {
            it('should allow listing databases with permission', async () => {
                const res = await api.getWithPermissions('/api/core/v1/databases', ['databases.read']);
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny listing databases without permission', async () => {
                const res = await api.getNoPermissions('/api/core/v1/databases');
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });
    });

    // ==========================================================================
    // THEMES PERMISSIONS
    // ==========================================================================

    describe('Themes Permission Enforcement', () => {
        describe('themes.read', () => {
            it('should allow listing themes with permission', async () => {
                const res = await api.getWithPermissions('/api/core/v1/themes', ['themes.read']);
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny listing themes without permission', async () => {
                const res = await api.getNoPermissions('/api/core/v1/themes');
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });
    });

    // ==========================================================================
    // FILES PERMISSIONS
    // ==========================================================================

    describe('Files Permission Enforcement', () => {
        describe('files.read', () => {
            it('should allow reading files with permission', async () => {
                const res = await api.getWithPermissions('/api/core/v1/files?path=data', ['files.read']);
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny reading files without permission', async () => {
                const res = await api.getNoPermissions('/api/core/v1/files?path=data');
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });
    });

    // ==========================================================================
    // OBJECTS PERMISSIONS
    // ==========================================================================

    describe('Objects Permission Enforcement', () => {
        describe('objects.read', () => {
            it('should allow listing objects with permission', async () => {
                const res = await api.getWithPermissions('/api/core/v1/objects', ['objects.read']);
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny listing objects without permission', async () => {
                const res = await api.getNoPermissions('/api/core/v1/objects');
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });

        describe('objects.create', () => {
            it('should allow creating object with permission', async () => {
                const objectName = `${testPrefix}_object`;
                const res = await api.postWithPermissions('/api/core/v1/objects', {
                    name: objectName,
                    id: objectName
                }, ['objects.create']);

                if (res.ok) {
                    createdResources.push({ type: 'object', name: objectName });
                }
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny creating object without permission', async () => {
                const res = await api.postNoPermissions('/api/core/v1/objects', {
                    name: 'should_not_create',
                    id: 'should_not_create'
                });
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });
    });

    // ==========================================================================
    // DEVICES PERMISSIONS
    // ==========================================================================

    describe('Devices Permission Enforcement', () => {
        describe('devices.read', () => {
            it('should allow listing devices with permission', async () => {
                const res = await api.getWithPermissions('/api/core/v1/devices', ['devices.read']);
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny listing devices without permission', async () => {
                const res = await api.getNoPermissions('/api/core/v1/devices');
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });
    });

    // ==========================================================================
    // TOKENS PERMISSIONS
    // ==========================================================================

    describe('Tokens Permission Enforcement', () => {
        describe('tokens.read', () => {
            it('should allow listing tokens with permission', async () => {
                const res = await api.getWithPermissions('/api/core/v1/tokens', ['tokens.read']);
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny listing tokens without permission', async () => {
                const res = await api.getNoPermissions('/api/core/v1/tokens');
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });

        describe('tokens.create', () => {
            it('should allow creating token with permission', async () => {
                const res = await api.getWithPermissions('/api/core/v1/tokens/service/create', ['tokens.create']);
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny creating token without permission', async () => {
                const res = await api.getNoPermissions('/api/core/v1/tokens/service/create');
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });
    });

    // ==========================================================================
    // CARDS PERMISSIONS
    // ==========================================================================

    describe('Cards Permission Enforcement', () => {
        describe('cards.read', () => {
            it('should allow listing cards with permission', async () => {
                const res = await api.getWithPermissions('/api/core/v1/cards', ['cards.read']);
                assert.ok(res.status !== 403, `Should allow with permission, got ${res.status}`);
            });

            it('should deny listing cards without permission', async () => {
                const res = await api.getNoPermissions('/api/core/v1/cards');
                assert.strictEqual(res.status, 403, `Should deny without permission, got ${res.status}`);
            });
        });
    });

    // ==========================================================================
    // WILDCARD PERMISSIONS
    // ==========================================================================

    describe('Wildcard Permissions', () => {
        it('should allow boards.* to read boards', async () => {
            const res = await api.getWithPermissions('/api/core/v1/boards', ['boards.*']);
            assert.ok(res.status !== 403, `boards.* should allow read, got ${res.status}`);
        });

        it('should allow boards.* to create boards', async () => {
            const boardName = `${testPrefix}_wildcard`;
            const res = await api.postWithPermissions('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            }, ['boards.*']);

            if (res.ok) {
                createdResources.push({ type: 'board', name: boardName });
            }
            assert.ok(res.status !== 403, `boards.* should allow create, got ${res.status}`);
        });

        it('should not allow users.* to access boards', async () => {
            const res = await api.getWithPermissions('/api/core/v1/boards', ['users.*']);
            assert.strictEqual(res.status, 403, `users.* should not allow boards access, got ${res.status}`);
        });
    });

    // ==========================================================================
    // ADMIN ACCESS (backward compatibility)
    // ==========================================================================

    describe('Admin Access', () => {
        it('should allow admin to list accounts', async () => {
            const res = await api.get('/api/core/v1/accounts');
            assert.strictEqual(res.ok, true, 'Admin should access accounts');
        });

        it('should allow admin to list keys', async () => {
            const res = await api.get('/api/core/v1/keys');
            assert.strictEqual(res.ok, true, 'Admin should access keys');
        });

        it('should allow admin to access databases', async () => {
            const res = await api.get('/api/core/v1/databases');
            assert.strictEqual(res.ok, true, 'Admin should access databases');
        });
    });
});
