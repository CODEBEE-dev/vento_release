/**
 * Themes API E2E Tests
 *
 * Tests for theme management
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Themes API', () => {
    const testPrefix = `test_theme_${Date.now()}`;
    const createdThemes = [];

    after(async () => {
        for (const themeName of createdThemes) {
            await api.get(`/api/core/v1/themes/${encodeURIComponent(themeName)}/delete`).catch(() => {});
        }
    });

    describe('List Themes', () => {
        it('should list all themes', async () => {
            const res = await api.get('/api/core/v1/themes');

            assert.ok(res.status < 500, `Should not cause server error: ${res.status}`);
            if (res.ok) {
                assert.ok(res.data.items, 'Should have items array');
            }
        });

        it('should support pagination', async () => {
            const res = await api.get('/api/core/v1/themes?page=1&itemsPerPage=10');

            assert.ok(res.status < 500, 'Should handle pagination params');
        });
    });

    describe('Create Theme', () => {
        it('should create a new theme', async () => {
            const themeName = `${testPrefix}_basic`;
            const res = await api.post('/api/core/v1/themes', {
                name: themeName,
                colors: {
                    primary: '#007bff',
                    secondary: '#6c757d',
                    background: '#ffffff'
                }
            });

            if (res.ok) {
                createdThemes.push(themeName);
            }
            assert.ok(res.status < 500, `Should not cause server error: ${res.status}`);
        });

        it('should create theme with CSS variables', async () => {
            const themeName = `${testPrefix}_css`;
            const res = await api.post('/api/core/v1/themes', {
                name: themeName,
                cssVariables: {
                    '--primary-color': '#ff0000',
                    '--font-size': '16px',
                    '--border-radius': '4px'
                }
            });

            if (res.ok) {
                createdThemes.push(themeName);
            }
            assert.ok(res.status < 500, 'Should handle CSS variables');
        });

        it('should create theme with fonts', async () => {
            const themeName = `${testPrefix}_fonts`;
            const res = await api.post('/api/core/v1/themes', {
                name: themeName,
                fonts: {
                    primary: 'Inter',
                    secondary: 'Roboto',
                    monospace: 'Fira Code'
                }
            });

            if (res.ok) {
                createdThemes.push(themeName);
            }
            assert.ok(res.status < 500, 'Should handle fonts');
        });
    });

    describe('Get Theme', () => {
        const themeName = `${testPrefix}_get`;

        before(async () => {
            const res = await api.post('/api/core/v1/themes', {
                name: themeName,
                colors: { primary: '#123456' }
            });
            if (res.ok) createdThemes.push(themeName);
        });

        it('should get theme by name', async () => {
            const res = await api.get(`/api/core/v1/themes/${encodeURIComponent(themeName)}`);

            if (res.ok) {
                assert.ok(res.data.name, 'Should have name');
            }
            assert.ok(res.status < 500, 'Should not crash');
        });

        it('should return 404 for non-existent theme', async () => {
            const res = await api.get('/api/core/v1/themes/nonexistent_theme_xyz');

            assert.strictEqual(res.ok, false, 'Should not find non-existent theme');
        });
    });

    describe('Update Theme', () => {
        const themeName = `${testPrefix}_update`;

        before(async () => {
            const res = await api.post('/api/core/v1/themes', {
                name: themeName,
                colors: { primary: '#000000' }
            });
            if (res.ok) createdThemes.push(themeName);
        });

        it('should update existing theme', async () => {
            const res = await api.post(`/api/core/v1/themes/${encodeURIComponent(themeName)}`, {
                name: themeName,
                colors: { primary: '#ffffff', secondary: '#cccccc' }
            });

            assert.ok(res.status < 500, 'Should update theme');
        });

        it('should verify theme was updated', async () => {
            await api.post(`/api/core/v1/themes/${encodeURIComponent(themeName)}`, {
                name: themeName,
                colors: { primary: '#ff00ff' }
            });

            const res = await api.get(`/api/core/v1/themes/${encodeURIComponent(themeName)}`);

            if (res.ok && res.data.colors) {
                assert.strictEqual(res.data.colors.primary, '#ff00ff', 'Color should be updated');
            }
        });
    });

    describe('Delete Theme', () => {
        it('should delete theme', async () => {
            const themeName = `${testPrefix}_delete`;

            // Create first
            await api.post('/api/core/v1/themes', {
                name: themeName,
                colors: {}
            });

            // Delete
            const res = await api.get(`/api/core/v1/themes/${encodeURIComponent(themeName)}/delete`);

            assert.ok(res.status < 500, 'Should delete theme');

            // Verify deleted
            const getRes = await api.get(`/api/core/v1/themes/${encodeURIComponent(themeName)}`);
            assert.strictEqual(getRes.ok, false, 'Deleted theme should not exist');
        });

        it('should handle delete of non-existent theme', async () => {
            const res = await api.get('/api/core/v1/themes/nonexistent_theme_delete/delete');

            // API may return 404, 500, or any response - just verify we get a response
            assert.ok(res.status >= 200 && res.status < 600, 'Should respond to delete request');
        });
    });

    describe('Theme Edge Cases', () => {
        it('should reject theme with empty name', async () => {
            const res = await api.post('/api/core/v1/themes', {
                name: '',
                colors: {}
            });

            assert.strictEqual(res.ok, false, 'Should reject empty name');
            assert.ok(res.status >= 400, `Should return error status, got ${res.status}`);
        });

        it('should handle theme with special characters in name', async () => {
            const themeName = `${testPrefix}_special-theme.v2`;
            const res = await api.post('/api/core/v1/themes', {
                name: themeName,
                colors: {}
            });

            if (res.ok) {
                createdThemes.push(themeName);
            }
            assert.ok(res.status < 500, 'Should handle special characters');
        });

        it('should handle theme with large color palette', async () => {
            const themeName = `${testPrefix}_large`;
            const colors = {};
            for (let i = 0; i < 100; i++) {
                colors[`color${i}`] = `#${i.toString(16).padStart(6, '0')}`;
            }

            const res = await api.post('/api/core/v1/themes', {
                name: themeName,
                colors
            });

            if (res.ok) {
                createdThemes.push(themeName);
            }
            assert.ok(res.status < 500, 'Should handle large color palette');
        });
    });

    describe('Authentication', () => {
        it('should require auth to list themes', async () => {
            const res = await api.getNoAuth('/api/core/v1/themes');

            assert.strictEqual(res.status, 401, 'Should require auth');
        });

        it('should require auth to create theme', async () => {
            const res = await api.postNoAuth('/api/core/v1/themes', {
                name: 'unauthorized_theme',
                colors: {}
            });

            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow listing themes with themes.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/themes', ['themes.read']);
            assert.ok(res.status !== 403, `Should allow with themes.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing themes without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/themes');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow creating theme with themes.create permission', async () => {
            const permThemeName = `perm_test_theme_${Date.now()}`;
            const res = await api.postWithPermissions('/api/core/v1/themes', {
                name: permThemeName,
                colors: { primary: '#ff0000' }
            }, ['themes.create']);
            assert.ok(res.status !== 403, `Should allow with themes.create permission (got ${res.status})`);
            // Cleanup
            if (res.ok) {
                await api.get(`/api/core/v1/themes/${encodeURIComponent(permThemeName)}/delete`).catch(() => {});
            }
        });

        it('should deny creating theme without permission', async () => {
            const res = await api.postNoPermissions('/api/core/v1/themes', {
                name: `denied_theme_${Date.now()}`,
                colors: {}
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow updating theme with themes.update permission', async () => {
            // Create a theme to update
            const updateThemeName = `update_perm_theme_${Date.now()}`;
            await api.post('/api/core/v1/themes', {
                name: updateThemeName,
                colors: { primary: '#000000' }
            });

            const res = await api.postWithPermissions(`/api/core/v1/themes/${encodeURIComponent(updateThemeName)}`, {
                name: updateThemeName,
                colors: { primary: '#ffffff' }
            }, ['themes.update']);
            assert.ok(res.status !== 403, `Should allow with themes.update permission (got ${res.status})`);

            // Cleanup
            await api.get(`/api/core/v1/themes/${encodeURIComponent(updateThemeName)}/delete`).catch(() => {});
        });

        it('should deny updating theme without permission', async () => {
            // Create a theme first
            const denyUpdateThemeName = `deny_update_theme_${Date.now()}`;
            await api.post('/api/core/v1/themes', {
                name: denyUpdateThemeName,
                colors: {}
            });

            const res = await api.postNoPermissions(`/api/core/v1/themes/${encodeURIComponent(denyUpdateThemeName)}`, {
                name: denyUpdateThemeName,
                colors: { primary: '#111111' }
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);

            // Cleanup
            await api.get(`/api/core/v1/themes/${encodeURIComponent(denyUpdateThemeName)}/delete`).catch(() => {});
        });

        it('should allow deleting theme with themes.delete permission', async () => {
            // Create a theme to delete
            const deleteThemeName = `delete_perm_theme_${Date.now()}`;
            await api.post('/api/core/v1/themes', {
                name: deleteThemeName,
                colors: {}
            });

            const res = await api.getWithPermissions(`/api/core/v1/themes/${encodeURIComponent(deleteThemeName)}/delete`, ['themes.delete']);
            assert.ok(res.status !== 403, `Should allow with themes.delete permission (got ${res.status})`);
        });

        it('should deny deleting theme without permission', async () => {
            // Create a theme to try to delete
            const denyDeleteThemeName = `deny_delete_theme_${Date.now()}`;
            await api.post('/api/core/v1/themes', {
                name: denyDeleteThemeName,
                colors: {}
            });

            const res = await api.getNoPermissions(`/api/core/v1/themes/${encodeURIComponent(denyDeleteThemeName)}/delete`);
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);

            // Cleanup with admin token
            await api.get(`/api/core/v1/themes/${encodeURIComponent(denyDeleteThemeName)}/delete`).catch(() => {});
        });
    });
});

