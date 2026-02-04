/**
 * Authentication Edge Cases Tests
 * Based on actual auth.ts implementation
 *
 * Key findings from code:
 * - Login uses Zod schema (LoginSchema) for validation
 * - Username field is used, not email
 * - Service token can be used as password for impersonation
 * - User token can be used to login to own account
 * - Returns 401 with "Incorrect user or password" for most errors
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Authentication Edge Cases', () => {
    const testPrefix = `test_auth_${Date.now()}`;
    const createdUsers = [];

    after(async () => {
        for (const email of createdUsers) {
            try {
                await api.get(`/api/core/v1/accounts/${email}/delete`);
            } catch (e) { }
        }
    });

    describe('Login Validation (Zod Schema)', () => {
        // LoginSchema requires username and password fields

        it('should return 401 for empty username', async () => {
            const res = await api.postNoAuth('/api/core/v1/auth/login', {
                username: '',
                password: 'somepassword'
            });
            assert.strictEqual(res.status, 401, 'Empty username should return 401');
        });

        it('should return 401 for empty password', async () => {
            const res = await api.postNoAuth('/api/core/v1/auth/login', {
                username: 'test@test.com',
                password: ''
            });
            assert.strictEqual(res.status, 401, 'Empty password should return 401');
        });

        it('should return 401 for missing username field', async () => {
            const res = await api.postNoAuth('/api/core/v1/auth/login', {
                password: 'somepassword'
            });
            assert.strictEqual(res.status, 401, 'Missing username should return 401');
        });

        it('should return 401 for missing password field', async () => {
            const res = await api.postNoAuth('/api/core/v1/auth/login', {
                username: 'test@test.com'
            });
            assert.strictEqual(res.status, 401, 'Missing password should return 401');
        });

        it('should return 401 for empty body', async () => {
            const res = await api.postNoAuth('/api/core/v1/auth/login', {});
            assert.strictEqual(res.status, 401, 'Empty body should return 401');
        });

        it('should return 401 for non-existent user', async () => {
            const res = await api.postNoAuth('/api/core/v1/auth/login', {
                username: 'nonexistent_user_12345@test.com',
                password: 'wrongpassword'
            });
            assert.strictEqual(res.status, 401, 'Non-existent user should return 401');
            assert.ok(res.data.includes('Incorrect'), 'Should return "Incorrect user or password"');
        });

        it('should return 401 for wrong password', async () => {
            // First create a user
            const email = `${testPrefix}_wrongpw@test.com`;
            const createRes = await api.post('/api/core/v1/accounts', {
                username: email,
                password: 'CorrectPassword123!',
                type: 'user'
            });

            if (createRes.ok) {
                createdUsers.push(email);

                // Try to login with wrong password
                const res = await api.postNoAuth('/api/core/v1/auth/login', {
                    username: email,
                    password: 'WrongPassword123!'
                });
                assert.strictEqual(res.status, 401, 'Wrong password should return 401');
            }
        });

        it('should successfully login with correct credentials', async () => {
            const email = `${testPrefix}_correct@test.com`;
            const password = 'CorrectPassword123!';

            const createRes = await api.post('/api/core/v1/accounts', {
                username: email,
                password,
                type: 'user'
            });

            if (createRes.ok) {
                createdUsers.push(email);

                const res = await api.postNoAuth('/api/core/v1/auth/login', {
                    username: email,
                    password
                });

                assert.strictEqual(res.ok, true, 'Correct credentials should succeed');
                assert.ok(res.data.session, 'Should return session object');
                assert.ok(res.data.session.token, 'Session should have token');
                assert.strictEqual(res.data.session.user.id, email, 'Session should have correct user ID');
            }
        });
    });

    describe('Service Token as Password (Impersonation)', () => {
        // Code allows service token as password to impersonate any user

        it('should allow login with service token as password', async () => {
            // Get service token
            const tokenRes = await api.get('/api/core/v1/tokens/service/create');
            if (!tokenRes.ok) return;

            const serviceToken = tokenRes.data.token;

            // Try to login using service token as password
            const res = await api.postNoAuth('/api/core/v1/auth/login', {
                username: 'any_user@test.com',
                password: serviceToken
            });

            // According to code, this should succeed and create admin session
            assert.strictEqual(res.ok, true, 'Service token should allow impersonation');
            assert.strictEqual(res.data.session.user.type, 'admin', 'Impersonated session should be admin');
        });
    });

    describe('Token Validation', () => {
        // Note: /auth/validate returns 200 with the session - it doesn't require auth
        // Without valid token, it returns a "guest" session with loggedIn: false

        it('should validate session with valid token', async () => {
            const res = await api.get('/api/core/v1/auth/validate');
            assert.strictEqual(res.ok, true, 'Valid token should validate');
            assert.ok(res.data, 'Should return session data');
            assert.ok(res.data.user, 'Should have user in session');
            assert.strictEqual(res.data.loggedIn, true, 'Should be logged in');
            assert.ok(res.data.user.admin, 'Test user should be admin');
        });

        it('should return 401 without token', async () => {
            const res = await api.getNoAuth('/api/core/v1/auth/validate');
            assert.strictEqual(res.status, 401, 'Should return 401 without token');
        });

        it('should return 401 with invalid token', async () => {
            const res = await api.getWithToken('/api/core/v1/auth/validate', 'invalid-token-12345');
            assert.strictEqual(res.status, 401, 'Should return 401 with invalid token');
        });

        it('should return 401 with malformed JWT', async () => {
            const malformedJWT = 'eyJhbGciOiJIUzI1NiJ9.eyJpbnZhbGlkIjoicGF5bG9hZCJ9.invalid';
            const res = await api.getWithToken('/api/core/v1/auth/validate', malformedJWT);
            assert.strictEqual(res.status, 401, 'Should return 401 with malformed JWT');
        });
    });

    describe('User Existence Check', () => {
        it('should return hasUsers status', async () => {
            const res = await api.get('/api/core/v1/users/has');
            assert.strictEqual(res.ok, true, 'Should return user existence status');
            assert.ok('hasUsers' in res.data, 'Response should have hasUsers field');
            assert.strictEqual(typeof res.data.hasUsers, 'boolean', 'hasUsers should be boolean');
        });
    });

    describe('Register Endpoint', () => {
        // Register may be disabled via SiteConfig.signupEnabled

        it('should handle register attempt (may be disabled)', async () => {
            const res = await api.postNoAuth('/api/core/v1/auth/register', {
                username: `${testPrefix}_register@test.com`,
                password: 'Password123!',
                rePassword: 'Password123!'
            });

            // Either succeeds (signup enabled) or returns 403 (disabled)
            assert.ok(
                res.ok || res.status === 403,
                `Register should succeed or be disabled (403), got ${res.status}`
            );

            if (res.ok) {
                createdUsers.push(`${testPrefix}_register@test.com`);
            }
        });

        it('should reject register with mismatched passwords', async () => {
            const res = await api.postNoAuth('/api/core/v1/auth/register', {
                username: `${testPrefix}_mismatch@test.com`,
                password: 'Password123!',
                rePassword: 'DifferentPassword!'
            });

            // Should either fail validation or be disabled
            assert.ok(!res.ok, 'Mismatched passwords should not succeed');
        });

        it('should reject register for existing user', async () => {
            const email = `${testPrefix}_dup_reg@test.com`;

            // Create user first
            const createRes = await api.post('/api/core/v1/accounts', {
                username: email,
                password: 'Password123!',
                type: 'user'
            });

            if (createRes.ok) {
                createdUsers.push(email);

                // Try to register same user
                const res = await api.postNoAuth('/api/core/v1/auth/register', {
                    username: email,
                    password: 'Password123!',
                    rePassword: 'Password123!'
                });

                // Should fail with duplicate error or 403 if disabled
                assert.ok(!res.ok || res.status === 403, 'Duplicate registration should fail');
            }
        });
    });

    describe('SQL Injection Prevention', () => {
        // Database uses key-value store, not SQL, so these should simply fail auth

        const sqlPayloads = [
            "' OR '1'='1",
            "admin'--",
            "'; DROP TABLE users;--"
        ];

        for (const payload of sqlPayloads) {
            it(`should safely reject SQL injection in username: ${payload.substring(0, 15)}...`, async () => {
                const res = await api.postNoAuth('/api/core/v1/auth/login', {
                    username: payload,
                    password: 'test'
                });

                // Should return 401 (user not found), not 200 (injection success) or 500 (error)
                assert.strictEqual(res.status, 401, 'SQL injection should return 401');
            });
        }
    });

    describe('Concurrent Login Attempts', () => {
        it('should handle multiple concurrent logins', async () => {
            const email = `${testPrefix}_concurrent@test.com`;
            const password = 'Password123!';

            // Create user
            const createRes = await api.post('/api/core/v1/accounts', {
                username: email,
                password,
                type: 'user'
            });

            if (createRes.ok) {
                createdUsers.push(email);

                // Concurrent logins
                const logins = Array(10).fill(null).map(() =>
                    api.postNoAuth('/api/core/v1/auth/login', {
                        username: email,
                        password
                    })
                );

                const results = await Promise.all(logins);

                // All should succeed
                for (const res of results) {
                    assert.strictEqual(res.ok, true, 'Concurrent logins should all succeed');
                    assert.ok(res.data.session.token, 'Each should get a valid token');
                }
            }
        });
    });
});
