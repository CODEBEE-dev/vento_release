/**
 * Board Edge Cases Tests
 * Specific edge cases for board operations
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

/**
 * Board name validation regex: /^[a-z0-9_]+$/
 * Only lowercase letters, numbers, and underscores are allowed
 */
describe('Board Edge Cases', () => {
    const testPrefix = `test_bed_${Date.now()}`;
    const createdBoards = [];

    after(async () => {
        for (const name of createdBoards) {
            await api.get(`/api/core/v1/boards/${name}/delete`).catch(() => {});
        }
    });

    describe('Board Naming - Valid Names', () => {
        it('should accept valid lowercase name with underscores', async () => {
            const name = `${testPrefix}_valid`;
            const res = await api.post('/api/core/v1/import/board', {
                name,
                template: { id: 'blank' }
            });
            assert.strictEqual(res.ok, true, 'Valid name should be accepted');
            if (res.ok) {
                createdBoards.push(name);
            }
        });

        it('should accept board name starting with number', async () => {
            // Regex /^[a-z0-9_]+$/ allows numbers
            const name = `123_${testPrefix}`;
            const res = await api.post('/api/core/v1/import/board', {
                name,
                template: { id: 'blank' }
            });
            assert.strictEqual(res.ok, true, 'Name starting with number should be accepted');
            if (res.ok) {
                createdBoards.push(name);
            }
        });

        it('should accept single character name', async () => {
            const name = 'z';
            const res = await api.post('/api/core/v1/import/board', {
                name,
                template: { id: 'blank' }
            });
            assert.strictEqual(res.ok, true, 'Single char name should be accepted');
            if (res.ok) {
                createdBoards.push(name);
            }
        });
    });

    describe('Board Naming - Invalid Names (regex: /^[a-z0-9_]+$/)', () => {
        it('should reject board name with leading spaces', async () => {
            const name = `   ${testPrefix}_leading`;
            const res = await api.post('/api/core/v1/import/board', {
                name,
                template: { id: 'blank' }
            });
            // Spaces not allowed by regex
            assert.strictEqual(res.ok, false, 'Leading spaces should be rejected');
        });

        it('should reject board name with trailing spaces', async () => {
            const name = `${testPrefix}_trailing   `;
            const res = await api.post('/api/core/v1/import/board', {
                name,
                template: { id: 'blank' }
            });
            assert.strictEqual(res.ok, false, 'Trailing spaces should be rejected');
        });

        it('should reject board name with forward slashes', async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: `${testPrefix}/invalid`,
                template: { id: 'blank' }
            });
            assert.strictEqual(res.ok, false, 'Forward slashes should be rejected');
        });

        it('should reject board name with backslashes', async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: `${testPrefix}\\invalid`,
                template: { id: 'blank' }
            });
            assert.strictEqual(res.ok, false, 'Backslashes should be rejected');
        });

        it('should reject board name with dots', async () => {
            const name = `${testPrefix}.with.dots`;
            const res = await api.post('/api/core/v1/import/board', {
                name,
                template: { id: 'blank' }
            });
            // Dots not allowed by regex /^[a-z0-9_]+$/
            assert.strictEqual(res.ok, false, 'Dots should be rejected');
        });

        it('should reject board name with dashes', async () => {
            const name = `${testPrefix}-with-dashes`;
            const res = await api.post('/api/core/v1/import/board', {
                name,
                template: { id: 'blank' }
            });
            // Dashes not allowed by regex
            assert.strictEqual(res.ok, false, 'Dashes should be rejected');
        });

        it('should reject board name with uppercase letters', async () => {
            const name = `${testPrefix}_UPPERCASE`;
            const res = await api.post('/api/core/v1/import/board', {
                name,
                template: { id: 'blank' }
            });
            // Uppercase not allowed by regex
            assert.strictEqual(res.ok, false, 'Uppercase should be rejected');
        });

        it('should reject empty board name', async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: '',
                template: { id: 'blank' }
            });
            assert.strictEqual(res.ok, false, 'Empty name should be rejected');
        });
    });

    describe('Board Naming - Reserved Names', () => {
        // These are valid per regex but might conflict with system paths
        it('should handle reserved name "board"', async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: 'board',
                template: { id: 'blank' }
            });
            // Valid per regex, may or may not be reserved
            if (res.ok) {
                createdBoards.push('board');
            }
            assert.ok(res.status !== 500, 'Should handle reserved name');
        });

        it('should handle reserved name "cards"', async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: 'cards',
                template: { id: 'blank' }
            });
            if (res.ok) {
                createdBoards.push('cards');
            }
            assert.ok(res.status !== 500, 'Should handle reserved name');
        });
    });

    describe('Board Template Edge Cases', () => {
        it('should return 404 for non-existent template', async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: `${testPrefix}_no_tpl`,
                template: { id: 'nonexistent_template_12345' }
            });
            assert.strictEqual(res.status, 404, 'Non-existent template should return 404');
        });

        it('should return 400 for empty template ID', async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: `${testPrefix}_empty_tpl`,
                template: { id: '' }
            });
            // Empty string is an invalid template ID format
            assert.strictEqual(res.status, 400, 'Empty template ID should return 400');
        });

        it('should return 400 for null template ID', async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: `${testPrefix}_null_tpl`,
                template: { id: null }
            });
            // null is not a valid template ID
            assert.strictEqual(res.status, 400, 'Null template ID should return 400');
        });

        it('should return 400 for template as string instead of object', async () => {
            const res = await api.post('/api/core/v1/import/board', {
                name: `${testPrefix}_str_tpl`,
                template: 'blank'
            });
            // String is not a valid template format (should be { id: "..." })
            assert.strictEqual(res.status, 400, 'String template should return 400');
        });
    });

    describe('Card Operations Edge Cases', () => {
        // Card add endpoint expects: { card: { name, type, content?, ... } }
        let testBoardName;

        before(async () => {
            testBoardName = `${testPrefix}_cards`;
            const res = await api.post('/api/core/v1/import/board', {
                name: testBoardName,
                template: { id: 'blank' }
            });
            if (res.ok) {
                createdBoards.push(testBoardName);
                await api.get(`/api/core/v1/boards/${testBoardName}/reload`);
            }
        });

        it('should reject card with empty name', async () => {
            if (!testBoardName) return;
            const res = await api.post(`/api/core/v1/boards/${testBoardName}/management/add/card`, {
                card: {
                    type: 'action',
                    name: ''
                }
            });
            // Empty name should fail validation
            assert.strictEqual(res.ok, false, 'Empty card name should be rejected');
        });

        it('should reject card without name field', async () => {
            if (!testBoardName) return;
            const res = await api.post(`/api/core/v1/boards/${testBoardName}/management/add/card`, {
                card: {
                    type: 'action'
                }
            });
            assert.strictEqual(res.ok, false, 'Missing card name should be rejected');
        });

        it('should handle duplicate card name', async () => {
            if (!testBoardName) return;
            // Add first card
            await api.post(`/api/core/v1/boards/${testBoardName}/management/add/card`, {
                card: {
                    type: 'action',
                    name: 'duplicate_card'
                }
            });

            // Try to add duplicate - should either reject or append
            const res = await api.post(`/api/core/v1/boards/${testBoardName}/management/add/card`, {
                card: {
                    type: 'action',
                    name: 'duplicate_card'
                }
            });

            // Current implementation appends to cards array (doesn't check uniqueness)
            assert.ok(res.status !== 500, 'Duplicate card should not crash');
        });

        it('should handle invalid card type', async () => {
            if (!testBoardName) return;
            const res = await api.post(`/api/core/v1/boards/${testBoardName}/management/add/card`, {
                card: {
                    type: 'invalid_type_xyz',
                    name: 'invalid_type_card'
                }
            });
            // Type is not validated at add time - just stored
            assert.ok(res.status !== 500, 'Invalid card type should be handled');
        });

        it('should handle card with content containing syntax error', async () => {
            if (!testBoardName) return;
            const res = await api.post(`/api/core/v1/boards/${testBoardName}/management/add/card`, {
                card: {
                    type: 'action',
                    name: 'syntax_error_card',
                    content: 'return {{{invalid syntax'
                }
            });
            // Syntax checked at runtime, not at add time
            assert.ok(res.status !== 500, 'Syntax error should not crash server at add time');
        });

        it('should handle very long card content (100KB)', async () => {
            if (!testBoardName) return;
            const longContent = `return "${'x'.repeat(100000)}";`;
            const res = await api.post(`/api/core/v1/boards/${testBoardName}/management/add/card`, {
                card: {
                    type: 'action',
                    name: 'long_content_card',
                    content: longContent
                }
            });
            assert.ok(res.status !== 500, 'Long content should be handled');
        });

        it('should return 404 for non-existent action', async () => {
            if (!testBoardName) return;
            const res = await api.post(`/api/core/v1/boards/${testBoardName}/actions/nonexistent_action_12345`, {});
            assert.strictEqual(res.status, 404, `Non-existent action should return 404, got ${res.status}`);
        });

        it('should handle card add request without card wrapper', async () => {
            if (!testBoardName) return;
            // Sending directly without { card: ... } wrapper
            const res = await api.post(`/api/core/v1/boards/${testBoardName}/management/add/card`, {
                type: 'action',
                name: 'wrong_format_card'
            });
            // Should fail because req.body.card is undefined
            assert.strictEqual(res.ok, false, 'Request without card wrapper should fail');
        });

        it('should handle card add to non-existent board', async () => {
            const res = await api.post('/api/core/v1/boards/nonexistent_board_12345/management/add/card', {
                card: {
                    type: 'action',
                    name: 'test_card'
                }
            });
            // Board fetch fails, returns 500 with "Error adding card"
            assert.strictEqual(res.status, 500, 'Non-existent board should return 500');
        });
    });

    describe('Board State Operations', () => {
        let stateBoardName;

        before(async () => {
            stateBoardName = `${testPrefix}_state`;
            const res = await api.post('/api/core/v1/import/board', {
                name: stateBoardName,
                template: { id: 'blank' }
            });
            if (res.ok) {
                createdBoards.push(stateBoardName);
                await api.get(`/api/core/v1/boards/${stateBoardName}/reload`);
            }
        });

        it('should handle state read on empty board', async () => {
            const res = await api.get(`/api/core/v1/protomemdb/states/${stateBoardName}`);
            assert.ok(res.status !== 500, 'Empty state read should not crash');
        });

        it('should handle autopilot toggle on board without cards', async () => {
            const onRes = await api.get(`/api/core/v1/boards/${stateBoardName}/autopilot/on`);
            assert.ok(onRes.status !== 500, 'Autopilot on should not crash');

            const offRes = await api.get(`/api/core/v1/boards/${stateBoardName}/autopilot/off`);
            assert.ok(offRes.status !== 500, 'Autopilot off should not crash');
        });
    });

    describe('Board Delete Edge Cases', () => {
        it('should return 404 when deleting non-existent board', async () => {
            // API returns 404 for non-existent resources (correct HTTP semantics)
            const res = await api.get('/api/core/v1/boards/nonexistent_board_12345/delete');
            assert.strictEqual(res.status, 404, 'Delete non-existent returns 404');
        });

        it('should return 404 on double delete', async () => {
            const name = `${testPrefix}_double_del`;
            await api.post('/api/core/v1/import/board', {
                name,
                template: { id: 'blank' }
            });

            // First delete - should succeed
            const firstRes = await api.get(`/api/core/v1/boards/${name}/delete`);
            assert.strictEqual(firstRes.ok, true, 'First delete should succeed');

            // Second delete - returns 404 (board no longer exists)
            const res = await api.get(`/api/core/v1/boards/${name}/delete`);
            assert.strictEqual(res.status, 404, 'Double delete returns 404');
        });
    });

    describe('Board Reload Edge Cases', () => {
        it('should return 404 when reloading non-existent board', async () => {
            // API returns 404 for non-existent resources (correct HTTP semantics)
            const res = await api.get('/api/core/v1/boards/nonexistent_board_12345/reload');
            assert.strictEqual(res.status, 404, 'Reload non-existent returns 404');
        });

        it('should handle multiple rapid reloads', async () => {
            const name = `${testPrefix}_rapid_reload`;
            await api.post('/api/core/v1/import/board', {
                name,
                template: { id: 'blank' }
            });
            createdBoards.push(name);

            // Rapid reloads
            const reloads = Array(10).fill(null).map(() =>
                api.get(`/api/core/v1/boards/${name}/reload`)
            );

            const results = await Promise.all(reloads);
            for (const res of results) {
                assert.ok(res.status !== 500, 'Rapid reload should not crash');
            }
        });
    });

    describe('UI Code Edge Cases', () => {
        let uiBoardName;

        before(async () => {
            uiBoardName = `${testPrefix}_ui`;
            const res = await api.post('/api/core/v1/import/board', {
                name: uiBoardName,
                template: { id: 'blank' }
            });
            if (res.ok) {
                createdBoards.push(uiBoardName);
            }
        });

        it('should handle get UI code for new board', async () => {
            const res = await api.get(`/api/core/v1/boards/${uiBoardName}/uicode`);
            assert.ok(res.status !== 500, 'Get UI code should not crash');
        });

        it('should handle set empty UI code', async () => {
            const res = await api.post(`/api/core/v1/boards/${uiBoardName}/uicode`, {
                code: ''
            });
            assert.ok(res.status !== 500, 'Empty UI code should not crash');
        });

        it('should handle set very long UI code', async () => {
            const longCode = '// ' + 'x'.repeat(50000);
            const res = await api.post(`/api/core/v1/boards/${uiBoardName}/uicode`, {
                code: longCode
            });
            assert.ok(res.status !== 500, 'Long UI code should not crash');
        });

        it('should handle UI code with syntax errors', async () => {
            const res = await api.post(`/api/core/v1/boards/${uiBoardName}/uicode`, {
                code: 'function {{{ invalid'
            });
            assert.ok(res.status !== 500, 'Syntax error in UI should not crash');
        });
    });

    describe('Automation Code Edge Cases', () => {
        let autoBoardName;

        before(async () => {
            autoBoardName = `${testPrefix}_auto`;
            const res = await api.post('/api/core/v1/import/board', {
                name: autoBoardName,
                template: { id: 'blank' }
            });
            if (res.ok) {
                createdBoards.push(autoBoardName);
            }
        });

        it('should handle get automation for new board', async () => {
            const res = await api.get(`/api/core/v1/boards/${autoBoardName}/automation`);
            assert.ok(res.status !== 500, 'Get automation should not crash');
        });

        it('should handle set empty automation', async () => {
            const res = await api.post(`/api/core/v1/boards/${autoBoardName}/automation`, {
                code: ''
            });
            assert.ok(res.status !== 500, 'Empty automation should not crash');
        });
    });
});
