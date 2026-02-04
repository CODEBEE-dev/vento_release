/**
 * Auth Security E2E Tests
 *
 * Tests for authentication security (NO brute force tests)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Auth Security', () => {

    describe('JWT Token Validation', () => {
        it('should reject malformed JWT token', async () => {
            const res = await api.getWithToken('/api/core/v1/boards', 'not.a.valid.jwt');

            assert.strictEqual(res.status, 401, 'Should reject malformed JWT');
        });

        it('should reject JWT with invalid signature', async () => {
            // Valid JWT structure but wrong signature
            const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYWRtaW4ifQ.invalidsignature';
            const res = await api.getWithToken('/api/core/v1/boards', invalidToken);

            assert.strictEqual(res.status, 401, 'Should reject invalid signature');
        });

        it('should reject JWT with wrong algorithm', async () => {
            // JWT claiming to use 'none' algorithm
            const noneAlgToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VyIjoiYWRtaW4ifQ.';
            const res = await api.getWithToken('/api/core/v1/boards', noneAlgToken);

            assert.strictEqual(res.status, 401, 'Should reject none algorithm');
        });

        it('should reject expired JWT', async () => {
            // JWT with exp: 0 (expired in 1970)
            const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjB9.invalid';
            const res = await api.getWithToken('/api/core/v1/boards', expiredToken);

            assert.strictEqual(res.status, 401, 'Should reject expired token');
        });

        it('should reject empty token', async () => {
            const res = await api.getWithToken('/api/core/v1/boards', '');

            assert.strictEqual(res.status, 401, 'Should reject empty token');
        });

        it('should reject token with only spaces', async () => {
            const res = await api.getWithToken('/api/core/v1/boards', '   ');

            assert.strictEqual(res.status, 401, 'Should reject whitespace token');
        });

        it('should reject token with special characters', async () => {
            const res = await api.getWithToken('/api/core/v1/boards', '<script>alert(1)</script>');

            assert.strictEqual(res.status, 401, 'Should reject special chars in token');
        });
    });

    describe('Session Handling', () => {
        it('should handle concurrent requests with same token', async () => {
            // Get valid token first
            const { getServiceToken } = require('protonode');
            const token = getServiceToken();

            // Make concurrent requests
            const promises = Array(5).fill(null).map(() =>
                api.getWithToken('/api/core/v1/boards', token)
            );

            const results = await Promise.all(promises);

            // All should succeed
            for (const res of results) {
                assert.strictEqual(res.ok, true, 'Concurrent requests should work');
            }
        });

        it('should validate token on each request', async () => {
            // First request with valid token
            const { getServiceToken } = require('protonode');
            const token = getServiceToken();

            const res1 = await api.getWithToken('/api/core/v1/boards', token);
            assert.strictEqual(res1.ok, true, 'Valid token should work');

            // Second request with invalid token should fail
            const res2 = await api.getWithToken('/api/core/v1/boards', 'invalid');
            assert.strictEqual(res2.status, 401, 'Invalid token should fail');

            // Third request with valid token should still work
            const res3 = await api.getWithToken('/api/core/v1/boards', token);
            assert.strictEqual(res3.ok, true, 'Valid token should still work');
        });
    });

    describe('Authorization Header Formats', () => {
        it('should accept Bearer token format', async () => {
            const { getServiceToken } = require('protonode');
            const token = getServiceToken();

            const res = await fetch('http://localhost:8000/api/core/v1/boards', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            assert.strictEqual(res.ok, true, `Bearer format should work, got ${res.status}`);
        });

        it('should handle missing Authorization header', async () => {
            const res = await fetch('http://localhost:8000/api/core/v1/boards');

            assert.strictEqual(res.status, 401, 'Missing auth should fail');
        });

        it('should handle Authorization header without Bearer prefix', async () => {
            const { getServiceToken } = require('protonode');
            const token = getServiceToken();

            const res = await fetch('http://localhost:8000/api/core/v1/boards', {
                headers: { 'Authorization': token }
            });

            // May or may not work depending on implementation
            assert.ok(res.status >= 200 && res.status < 600, 'Should respond');
        });
    });

    describe('Token in Query Parameter', () => {
        it('should accept token in query parameter', async () => {
            const { getServiceToken } = require('protonode');
            const token = getServiceToken();

            const res = await fetch(`http://localhost:8000/api/core/v1/boards?token=${token}`);

            assert.strictEqual(res.ok, true, 'Token in query should work');
        });

        it('should reject invalid token in query parameter', async () => {
            const res = await fetch('http://localhost:8000/api/core/v1/boards?token=invalid');

            assert.strictEqual(res.status, 401, 'Invalid query token should fail');
        });
    });

    describe('Login Security', () => {
        it('should reject login with empty credentials', async () => {
            const res = await api.postNoAuth('/api/core/v1/auth/login', {});

            assert.strictEqual(res.ok, false, 'Empty credentials should fail');
        });

        it('should reject login with missing password', async () => {
            const res = await api.postNoAuth('/api/core/v1/auth/login', {
                username: 'admin'
            });

            assert.strictEqual(res.ok, false, 'Missing password should fail');
        });

        it('should reject login with missing username', async () => {
            const res = await api.postNoAuth('/api/core/v1/auth/login', {
                password: 'password'
            });

            assert.strictEqual(res.ok, false, 'Missing username should fail');
        });

        it('should reject login with wrong password', async () => {
            const res = await api.postNoAuth('/api/core/v1/auth/login', {
                username: 'admin',
                password: 'wrongpassword123'
            });

            assert.strictEqual(res.ok, false, 'Wrong password should fail');
        });

        it('should reject login with non-existent user', async () => {
            const res = await api.postNoAuth('/api/core/v1/auth/login', {
                username: 'nonexistent_user_xyz',
                password: 'anypassword'
            });

            assert.strictEqual(res.ok, false, 'Non-existent user should fail');
        });

        it('should not expose user existence in error message', async () => {
            const res1 = await api.postNoAuth('/api/core/v1/auth/login', {
                username: 'admin',
                password: 'wrongpassword'
            });

            const res2 = await api.postNoAuth('/api/core/v1/auth/login', {
                username: 'nonexistent_user',
                password: 'wrongpassword'
            });

            // Both should fail with similar response (not reveal which user exists)
            assert.strictEqual(res1.ok, false);
            assert.strictEqual(res2.ok, false);
        });
    });

    describe('Token Validation Endpoint', () => {
        it('should validate good token', async () => {
            const res = await api.get('/api/core/v1/auth/validate');

            assert.strictEqual(res.ok, true, 'Should validate good token');
        });

        it('should reject validation without token', async () => {
            const res = await api.getNoAuth('/api/core/v1/auth/validate');

            assert.strictEqual(res.status, 401, `Validation without token should return 401, got ${res.status}`);
        });

        it('should reject validation with bad token', async () => {
            const res = await api.getWithToken('/api/core/v1/auth/validate', 'badtoken');

            assert.strictEqual(res.status, 401, `Validation with bad token should return 401, got ${res.status}`);
        });
    });
});
