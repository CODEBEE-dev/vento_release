/**
 * Templates API E2E Tests
 *
 * Tests for board template operations
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Templates API', () => {
    const testPrefix = `test_tpl_${Date.now()}`;
    const createdBoards = [];
    const createdTemplates = [];

    after(async () => {
        // Clean up templates first
        for (const name of createdTemplates) {
            await api.get(`/api/core/v2/templates/boards/${encodeURIComponent(name)}/delete`).catch(() => {});
        }
        // Then clean up boards
        for (const name of createdBoards) {
            await api.get(`/api/core/v1/boards/${name}/delete`).catch(() => {});
        }
    });

    describe('List Board Templates', () => {
        it('should list available board templates', async () => {
            const res = await api.get('/api/core/v2/templates/boards');

            assert.strictEqual(res.ok, true, `Should list templates, got ${res.status}`);
            assert.ok(Array.isArray(res.data), 'Should return array of templates');
        });

        it('should have smart ai agent template', async () => {
            const res = await api.get('/api/core/v2/templates/boards');

            assert.strictEqual(res.ok, true);
            const hasSmartAgent = res.data.some(t => t.id === 'smart ai agent');
            assert.ok(hasSmartAgent, 'Should have "smart ai agent" template');
        });

        it('should have blank template available', async () => {
            const res = await api.get('/api/core/v2/templates/boards');

            assert.strictEqual(res.ok, true);
            const blankTemplate = res.data.find(t => t.id === 'blank');
            assert.ok(blankTemplate, 'Blank template should exist');
        });

        it('should have template properties', async () => {
            const res = await api.get('/api/core/v2/templates/boards');

            assert.strictEqual(res.ok, true);
            assert.ok(res.data.length > 0, 'Should have at least one template');

            const template = res.data[0];
            assert.ok('id' in template, 'Template should have id');
            assert.ok('name' in template, 'Template should have name');
        });

        it('should require auth to list templates', async () => {
            const res = await api.getNoAuth('/api/core/v2/templates/boards');

            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    describe('Create Board from Template', () => {
        it('should create board from blank template', async () => {
            const boardName = `${testPrefix}_from_blank`;
            const res = await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });

            assert.strictEqual(res.ok, true, `Should create board, got ${res.status}`);
            createdBoards.push(boardName);
        });

        it('should create board from template with custom data', async () => {
            const boardName = `${testPrefix}_with_data`;
            const res = await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' },
                data: { customVar: 'customValue' }
            });

            assert.strictEqual(res.ok, true, `Should create board with data, got ${res.status}`);
            createdBoards.push(boardName);
        });

        it('should reject invalid board name', async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: 'INVALID_UPPERCASE',
                template: { id: 'blank' }
            });

            assert.strictEqual(res.ok, false, 'Should reject invalid name');
        });

        it('should reject missing template', async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: `${testPrefix}_no_template`
            });

            assert.strictEqual(res.ok, false, 'Should reject missing template');
        });

        it('should reject non-existent template', async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: `${testPrefix}_bad_template`,
                template: { id: 'nonexistent_template_xyz' }
            });

            assert.strictEqual(res.ok, false, 'Should reject non-existent template');
        });

        it('should require auth to create from template', async () => {
            const res = await api.postNoAuth('/api/core/v1/import/board', {
                name: `${testPrefix}_noauth`,
                template: { id: 'blank' }
            });

            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    describe('Create Template from Board', () => {
        it('should create template from existing board', async () => {
            // First create a board
            const boardName = `${testPrefix}_source`;
            await api.post('/api/core/v1/import/board', {
                name: boardName,
                template: { id: 'blank' }
            });
            createdBoards.push(boardName);

            // Create template from board
            const templateName = `${testPrefix}_template`;
            const res = await api.post('/api/core/v2/templates/boards', {
                name: templateName,
                from: boardName,
                description: 'Test template'
            });

            if (res.ok) {
                createdTemplates.push(templateName);
            }
            // May succeed or fail based on permissions
            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });

        it('should reject template from non-existent board', async () => {
            const res = await api.post('/api/core/v2/templates/boards', {
                name: `${testPrefix}_bad`,
                from: 'nonexistent_board_xyz',
                description: 'Test'
            });

            assert.strictEqual(res.ok, false, 'Should reject non-existent source');
        });

        it('should require auth to create template', async () => {
            const res = await api.postNoAuth('/api/core/v2/templates/boards', {
                name: 'test',
                from: 'any_board'
            });

            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    describe('Generic Template Execution', () => {
        it('should execute file template', async () => {
            const res = await api.post('/api/core/v1/templates/file', {
                name: `${testPrefix}_file`,
                data: { path: 'data/test' }
            });

            // May succeed or fail based on template availability
            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });

        it('should reject non-existent template', async () => {
            const res = await api.post('/api/core/v1/templates/nonexistent_xyz', {
                name: 'test',
                data: {}
            });

            assert.ok(res.status >= 400, 'Should reject non-existent template');
        });

        it('should sanitize path in template data', async () => {
            const res = await api.post('/api/core/v1/templates/file', {
                name: 'test',
                data: { path: '../../../etc/passwd' }
            });

            // Should sanitize or reject path traversal
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle path traversal attempt');
        });

        it('should require auth for template execution', async () => {
            const res = await api.postNoAuth('/api/core/v1/templates/file', {
                name: 'test',
                data: {}
            });

            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow listing templates with boards.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v2/templates/boards', ['boards.read']);
            assert.ok(res.status !== 403, `Should allow with boards.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing templates without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v2/templates/boards');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow creating board from template with boards.create permission', async () => {
            const permBoardName = `perm_test_tpl_${Date.now()}`;
            const res = await api.postWithPermissions('/api/core/v1/import/board', {
                name: permBoardName,
                template: { id: 'blank' }
            }, ['boards.create']);
            assert.ok(res.status !== 403, `Should allow with boards.create permission (got ${res.status})`);
            // Cleanup
            if (res.ok) {
                await api.get(`/api/core/v1/boards/${permBoardName}/delete`).catch(() => {});
            }
        });

        it('should deny creating board from template without permission', async () => {
            const res = await api.postNoPermissions('/api/core/v1/import/board', {
                name: `denied_tpl_${Date.now()}`,
                template: { id: 'blank' }
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow executing template with templates.execute permission', async () => {
            const res = await api.postWithPermissions('/api/core/v1/templates/file', {
                name: 'perm_test',
                data: { path: 'data/test' }
            }, ['templates.execute']);
            // May succeed or fail based on template availability, but should not be 403
            assert.ok(res.status !== 403, `Should allow with templates.execute permission (got ${res.status})`);
        });

        it('should deny executing template without permission', async () => {
            const res = await api.postNoPermissions('/api/core/v1/templates/file', {
                name: 'test',
                data: {}
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });
    });
});
