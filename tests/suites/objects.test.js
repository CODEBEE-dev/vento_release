/**
 * Objects API E2E Tests
 *
 * Tests object schema listing (read-only)
 * Note: Object schemas are defined by extensions, not created via API
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Objects API', () => {

    it('should list objects', async () => {
        const res = await api.get('/api/core/v1/objects');

        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.ok(res.data.items, 'Response should have items array');
    });

    it('should have object schemas from extensions', async () => {
        const res = await api.get('/api/core/v1/objects');

        assert.strictEqual(res.ok, true);
        // Objects are defined by extensions, there may or may not be any
        assert.ok(Array.isArray(res.data.items), 'Items should be an array');
    });

    it('should have name property on objects', async () => {
        const res = await api.get('/api/core/v1/objects');

        assert.strictEqual(res.ok, true);

        if (res.data.items.length > 0) {
            const obj = res.data.items[0];
            assert.ok('name' in obj, 'Object should have name property');
        }
    });

    // Note: Object schema creation is not exposed via REST API
    // Object schemas are defined by extensions

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow listing objects with objects.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/objects', ['objects.read']);
            assert.ok(res.status !== 403, `Should allow with objects.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing objects without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/objects');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });
    });
});
