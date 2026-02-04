/**
 * Auth API E2E Tests
 *
 * Tests authentication endpoints
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Auth API', () => {

    it('should check if users exist', async () => {
        const res = await api.get('/api/core/v1/users/has');

        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.ok('hasUsers' in res.data, 'Response should have hasUsers field');
        assert.strictEqual(typeof res.data.hasUsers, 'boolean', 'hasUsers should be boolean');
    });

    it('should validate session with service token', async () => {
        const res = await api.get('/api/core/v1/auth/validate');

        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        // Service token session has user.id and user.type
        const session = res.data;
        assert.ok(session.user || session.id, 'Session should have user or id');
    });

    it('should reject login with invalid credentials', async () => {
        const res = await api.post('/api/core/v1/auth/login', {
            username: 'nonexistent@test.com',
            password: 'wrongpassword123'
        });

        // Should fail with 401 or return error
        assert.ok(!res.ok || res.data.error, 'Login with invalid credentials should fail');
    });

    it('should have correct session structure', async () => {
        const res = await api.get('/api/core/v1/auth/validate');

        assert.strictEqual(res.ok, true);

        // Session can have user object or direct properties
        const session = res.data;
        const user = session.user || session;
        assert.ok(user, 'Should have user data');
    });

});
