/**
 * Icons API E2E Tests
 *
 * Tests for icons listing (read-only)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Icons API', () => {
    describe('List Icons', () => {
        it('should list available icons', async () => {
            const res = await api.get('/api/core/v1/icons');

            assert.strictEqual(res.ok, true, `Should list icons, got ${res.status}`);
        });

        it('should return icons array or object', async () => {
            const res = await api.get('/api/core/v1/icons');

            assert.strictEqual(res.ok, true);
            assert.ok(res.data !== undefined, 'Should have data');
        });

        it('should require auth to list icons', async () => {
            const res = await api.getNoAuth('/api/core/v1/icons');

            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow listing icons with icons.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/icons', ['icons.read']);
            assert.ok(res.status !== 403, `Should allow with icons.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing icons without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/icons');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });
    });
});
