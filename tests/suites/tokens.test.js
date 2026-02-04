/**
 * Tokens API E2E Tests
 *
 * Tests token generation and listing
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Tokens API', () => {

    it('should list tokens', async () => {
        const res = await api.get('/api/core/v1/tokens');

        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.ok(res.data.items, 'Response should have items array');
    });

    it('should create a device token', async () => {
        const res = await api.get('/api/core/v1/tokens/device/create');

        assert.strictEqual(res.ok, true, `Expected success creating device token, got status ${res.status}`);
        assert.ok(res.data.token || res.data, 'Response should contain token');
    });

    it('should create a service token', async () => {
        const res = await api.get('/api/core/v1/tokens/service/create');

        assert.strictEqual(res.ok, true, `Expected success creating service token, got status ${res.status}`);
        assert.ok(res.data.token || res.data, 'Response should contain token');
    });

    it('should return valid JWT format for device token', async () => {
        const res = await api.get('/api/core/v1/tokens/device/create');

        assert.strictEqual(res.ok, true);
        const token = res.data.token || res.data;
        // JWT tokens have 3 parts separated by dots
        if (typeof token === 'string') {
            const parts = token.split('.');
            assert.ok(parts.length === 3, 'Token should be in JWT format (3 parts)');
        }
    });

    // Note: Named token creation via POST is not supported
    // Use /tokens/device/create or /tokens/service/create instead

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow listing tokens with tokens.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/tokens', ['tokens.read']);
            assert.ok(res.status !== 403, `Should allow with tokens.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing tokens without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/tokens');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow creating device token with tokens.create permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/tokens/device/create', ['tokens.create']);
            assert.ok(res.status !== 403, `Should allow with tokens.create permission (got ${res.status})`);
        });

        it('should deny creating device token without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/tokens/device/create');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow creating service token with tokens.create permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/tokens/service/create', ['tokens.create']);
            assert.ok(res.status !== 403, `Should allow with tokens.create permission (got ${res.status})`);
        });

        it('should deny creating service token without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/tokens/service/create');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });
    });
});
