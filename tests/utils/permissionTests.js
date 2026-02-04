/**
 * Permission Test Helpers
 *
 * Reusable test blocks for verifying permission enforcement on API endpoints.
 * Use these in your test suites to ensure consistent permission testing.
 */

const assert = require('node:assert');
const api = require('./api');
const { createTokenWithPermissions, createTokenWithoutPermissions } = require('./tokens');

/**
 * Assert that a request with the correct permission succeeds
 * @param {string} method - HTTP method (GET, POST, DELETE)
 * @param {string} path - API path
 * @param {string} permission - Required permission
 * @param {object|null} body - Request body for POST
 * @param {string} description - Test description
 */
async function assertPermissionAllows(method, path, permission, body = null, description = '') {
    const token = createTokenWithPermissions([permission]);
    let res;

    if (method === 'GET') {
        res = await api.getWithToken(path, token);
    } else if (method === 'POST') {
        res = await api.postWithToken(path, body, token);
    } else if (method === 'DELETE') {
        // Use getWithToken for DELETE-style endpoints (Vento uses GET for delete)
        res = await api.getWithToken(path, token);
    }

    assert.ok(
        res.status !== 403,
        `${description || path}: User WITH permission '${permission}' should be allowed (got ${res.status})`
    );
    assert.ok(
        res.status !== 401,
        `${description || path}: Token should be valid (got 401 Unauthorized)`
    );

    return res;
}

/**
 * Assert that a request without the correct permission is denied (403)
 * @param {string} method - HTTP method (GET, POST, DELETE)
 * @param {string} path - API path
 * @param {object|null} body - Request body for POST
 * @param {string} description - Test description
 */
async function assertNoPermissionDenies(method, path, body = null, description = '') {
    const token = createTokenWithoutPermissions();
    let res;

    if (method === 'GET') {
        res = await api.getWithToken(path, token);
    } else if (method === 'POST') {
        res = await api.postWithToken(path, body, token);
    } else if (method === 'DELETE') {
        res = await api.getWithToken(path, token);
    }

    assert.strictEqual(
        res.status,
        403,
        `${description || path}: User WITHOUT permission should get 403 Forbidden (got ${res.status})`
    );

    return res;
}

/**
 * Run a complete permission test for an endpoint
 * Tests both positive (with permission) and negative (without permission) cases
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {string} permission - Required permission
 * @param {object|null} body - Request body for POST
 * @returns {Promise<{allowed: object, denied: object}>}
 */
async function testEndpointPermission(method, path, permission, body = null) {
    const allowed = await assertPermissionAllows(method, path, permission, body);
    const denied = await assertNoPermissionDenies(method, path, body);
    return { allowed, denied };
}

/**
 * Create a describe block with permission tests for an API resource
 * @param {object} config - Configuration object
 * @param {string} config.resource - Resource name (e.g., 'boards', 'users')
 * @param {string} config.basePath - Base API path (e.g., '/api/core/v1/boards')
 * @param {object} config.operations - Operations to test { read: path, create: {path, body}, ... }
 */
function createPermissionTestSuite(config) {
    const { resource, basePath, operations } = config;

    return {
        /**
         * Test read permission
         * @param {Function} it - Test runner 'it' function
         * @param {string} itemPath - Path to specific item (optional)
         */
        testRead: (it, itemPath = '') => {
            const path = itemPath || basePath;

            it(`should allow ${resource}.read with correct permission`, async () => {
                await assertPermissionAllows('GET', path, `${resource}.read`);
            });

            it(`should deny ${resource}.read without permission`, async () => {
                await assertNoPermissionDenies('GET', path);
            });
        },

        /**
         * Test create permission
         * @param {Function} it - Test runner 'it' function
         * @param {object} body - Request body for creation
         */
        testCreate: (it, body) => {
            it(`should allow ${resource}.create with correct permission`, async () => {
                await assertPermissionAllows('POST', basePath, `${resource}.create`, body);
            });

            it(`should deny ${resource}.create without permission`, async () => {
                await assertNoPermissionDenies('POST', basePath, body);
            });
        },

        /**
         * Test update permission
         * @param {Function} it - Test runner 'it' function
         * @param {string} itemPath - Path to specific item
         * @param {object} body - Request body for update
         */
        testUpdate: (it, itemPath, body) => {
            it(`should allow ${resource}.update with correct permission`, async () => {
                await assertPermissionAllows('POST', itemPath, `${resource}.update`, body);
            });

            it(`should deny ${resource}.update without permission`, async () => {
                await assertNoPermissionDenies('POST', itemPath, body);
            });
        },

        /**
         * Test delete permission
         * @param {Function} it - Test runner 'it' function
         * @param {string} deletePath - Path for delete operation
         */
        testDelete: (it, deletePath) => {
            it(`should allow ${resource}.delete with correct permission`, async () => {
                await assertPermissionAllows('GET', deletePath, `${resource}.delete`);
            });

            it(`should deny ${resource}.delete without permission`, async () => {
                await assertNoPermissionDenies('GET', deletePath);
            });
        }
    };
}

module.exports = {
    assertPermissionAllows,
    assertNoPermissionDenies,
    testEndpointPermission,
    createPermissionTestSuite
};
