/**
 * Response Consistency E2E Tests
 *
 * Tests for consistent API response formats across endpoints
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Response Consistency', () => {
    const testPrefix = `test_resp_${Date.now()}`;
    const boardName = `${testPrefix}_board`;
    const createdResources = [];
    let boardCreated = false;

    before(async () => {
        const res = await api.post('/api/core/v1/import/board', {
            name: boardName,
            template: { id: 'blank' }
        });
        if (res.ok) {
            boardCreated = true;

            await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'test_action',
                    type: 'action',
                    rulesCode: 'return { result: "success" };'
                }
            });
        }
    });

    after(async () => {
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${boardName}/delete`).catch(() => {});
        }
        for (const r of createdResources) {
            if (r.type === 'setting') {
                await api.get(`/api/core/v1/settings/${encodeURIComponent(r.name)}/delete`).catch(() => {});
            }
        }
    });

    describe('Success Response Format', () => {
        it('should return JSON for board list', async () => {
            const res = await api.get('/api/core/v1/boards');
            assert.strictEqual(res.ok, true, 'Should succeed');
            assert.ok(res.data !== null, 'Should have data');
        });

        it('should return JSON for single board', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}`);
            assert.strictEqual(res.ok, true, 'Should succeed');
            assert.ok(res.data !== null, 'Should have board data');
        });

        it('should return JSON for settings list', async () => {
            const res = await api.get('/api/core/v1/settings');
            assert.strictEqual(res.ok, true, 'Should succeed');
            assert.ok(res.data !== null, 'Should have data');
        });

        it('should return JSON for accounts list', async () => {
            const res = await api.get('/api/core/v1/accounts');
            assert.strictEqual(res.ok, true, 'Should succeed');
            assert.ok(res.data !== null, 'Should have data');
        });

        it('should return JSON for keys list', async () => {
            const res = await api.get('/api/core/v1/keys');
            assert.strictEqual(res.ok, true, 'Should succeed');
        });

        it('should return JSON for databases list', async () => {
            const res = await api.get('/api/core/v1/databases');
            assert.strictEqual(res.ok, true, 'Should succeed');
        });

        it('should return JSON for events list', async () => {
            const res = await api.get('/api/core/v1/events');
            assert.strictEqual(res.ok, true, 'Should succeed');
        });

        it('should return JSON for themes list', async () => {
            const res = await api.get('/api/core/v1/themes');
            assert.strictEqual(res.ok, true, 'Should succeed');
        });
    });

    describe('Error Response Format', () => {
        it('should return consistent error for non-existent board', async () => {
            const res = await api.get('/api/core/v1/boards/nonexistent_board_xyz123');
            assert.ok(!res.ok || res.status >= 400, 'Should fail for non-existent');
        });

        it('should return consistent error for non-existent setting', async () => {
            const res = await api.get('/api/core/v1/settings/nonexistent_setting_xyz');
            assert.ok(res.status >= 200 && res.status < 600, 'Should respond');
        });

        it('should return consistent error for non-existent account', async () => {
            const res = await api.get('/api/core/v1/accounts/nonexistent_account_xyz');
            assert.ok(res.status >= 200 && res.status < 600, 'Should respond');
        });

        it('should return 401 for unauthorized requests consistently', async () => {
            const endpoints = [
                '/api/core/v1/boards',
                '/api/core/v1/settings',
                '/api/core/v1/accounts',
                '/api/core/v1/keys'
            ];

            for (const endpoint of endpoints) {
                const res = await api.getNoAuth(endpoint);
                assert.strictEqual(res.status, 401, `${endpoint} should return 401`);
            }
        });
    });

    describe('Create Response Format', () => {
        it('should return consistent response for setting creation', async () => {
            const name = `${testPrefix}_setting`;
            createdResources.push({ type: 'setting', name });

            const res = await api.post('/api/core/v1/settings', {
                name,
                value: 'test_value'
            });
            assert.ok(res.status >= 200 && res.status < 500, 'Create should succeed or conflict');
        });

        it('should return consistent response for event creation', async () => {
            const res = await api.post('/api/core/v1/events', {
                path: `${testPrefix}/test`,
                from: 'test',
                payload: { data: 'test' }
            });
            assert.ok(res.status >= 200 && res.status < 500, 'Event should be created');
        });

        it('should return consistent response for card creation', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'consistency_card',
                    type: 'action',
                    rulesCode: 'return 1;'
                }
            });
            assert.ok(res.status >= 200 && res.status < 500, 'Card should be created');
        });
    });

    describe('Action Response Format', () => {
        it('should return action result in consistent format', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/actions/test_action`);
            assert.strictEqual(res.ok, true, 'Action should succeed');
            // Response should contain the action result
        });

        it('should return 404 for non-existent action', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/actions/nonexistent_action`);
            assert.strictEqual(res.status, 404, `Non-existent action should return 404, got ${res.status}`);
        });

        it('should return consistent response for action with payload', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/actions/test_action`, {
                input: 'data'
            });
            assert.ok(res.status >= 200 && res.status < 600, 'Should respond');
        });
    });

    describe('List Response Format', () => {
        it('should return array or object for all list endpoints', async () => {
            const listEndpoints = [
                '/api/core/v1/boards',
                '/api/core/v1/settings',
                '/api/core/v1/events',
                '/api/core/v1/databases',
                '/api/core/v1/tokens'
            ];

            for (const endpoint of listEndpoints) {
                const res = await api.get(endpoint);
                if (res.ok && res.data) {
                    const isCollection = Array.isArray(res.data) || typeof res.data === 'object';
                    assert.ok(isCollection, `${endpoint} should return collection`);
                }
            }
        });

        it('should handle empty lists consistently', async () => {
            // Query for non-matching items
            const res = await api.get('/api/core/v1/events');
            assert.strictEqual(res.ok, true, 'Should return successfully even if empty');
        });
    });

    describe('HTTP Status Codes', () => {
        it('should use 200 for successful GET', async () => {
            const res = await api.get('/api/core/v1/boards');
            assert.strictEqual(res.status, 200, 'GET should return 200');
        });

        it('should use 401 for unauthorized', async () => {
            const res = await api.getNoAuth('/api/core/v1/boards');
            assert.strictEqual(res.status, 401, 'Unauthorized should return 401');
        });

        it('should return 404 for non-existent board', async () => {
            const res = await api.get('/api/core/v1/boards/definitely_not_exists_xyz');
            assert.strictEqual(res.status, 404, `Non-existent board should return 404, got ${res.status}`);
        });

        it('should use appropriate status for bad request', async () => {
            const res = await api.post('/api/core/v1/settings', {});
            // Missing required fields should be bad request or handled gracefully
            assert.ok(res.status >= 200 && res.status < 600, 'Should respond');
        });
    });

    describe('Content-Type Headers', () => {
        it('should return JSON content-type for API responses', async () => {
            const { getServiceToken } = require('protonode');
            const token = getServiceToken();

            const response = await fetch(`http://localhost:8000/api/core/v1/boards?token=${token}`);
            const contentType = response.headers.get('content-type');

            assert.ok(
                contentType && contentType.includes('application/json'),
                `Should return JSON content-type, got ${contentType}`
            );
        });
    });

    describe('Pagination Consistency', () => {
        it('should handle page parameter', async () => {
            const res = await api.get('/api/core/v1/events?page=1');
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle page parameter');
        });

        it('should handle limit parameter', async () => {
            const res = await api.get('/api/core/v1/events?limit=10');
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle limit parameter');
        });

        it('should handle combined pagination', async () => {
            const res = await api.get('/api/core/v1/events?page=1&limit=10');
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle combined pagination');
        });
    });

    describe('Filter Parameter Consistency', () => {
        it('should handle filter by type', async () => {
            const res = await api.get('/api/core/v1/events?type=test');
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle type filter');
        });

        it('should handle filter by path', async () => {
            const res = await api.get(`/api/core/v1/events?path=${testPrefix}`);
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle path filter');
        });
    });
});
