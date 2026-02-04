/**
 * API Client for Vento E2E Tests
 * Uses service token for authentication
 */

require('dotenv').config();
const { getServiceToken } = require('protonode');
const { createTokenWithPermissions, createTokenWithoutPermissions, createPermissionTestTokens } = require('./tokens');

const BASE_URL = process.env.VENTO_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT = 30000; // 30 seconds timeout for all requests

/**
 * Make an authenticated HTTP request to Vento API
 * @param {string} method - HTTP method (GET, POST, DELETE, etc.)
 * @param {string} path - API path (e.g., '/api/core/v1/boards')
 * @param {object|null} body - Request body for POST/PUT
 * @returns {Promise<{status: number, data: any, ok: boolean}>}
 */
async function request(method, path, body = null) {
    const token = getServiceToken();
    const separator = path.includes('?') ? '&' : '?';
    const url = `${BASE_URL}${path}${separator}token=${token}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        let data = null;
        const text = await response.text();

        if (text) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    data = JSON.parse(text);
                } catch {
                    data = text;
                }
            } else {
                data = text;
            }
        }

        return {
            status: response.status,
            ok: response.ok,
            data
        };
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return { status: 408, ok: false, data: { error: 'Request timeout' } };
        }
        return { status: 0, ok: false, data: { error: error.message } };
    }
}

/**
 * Make an unauthenticated HTTP request (for testing auth requirements)
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {object|null} body - Request body
 * @param {string|null} customToken - Optional custom/invalid token to test
 * @returns {Promise<{status: number, data: any, ok: boolean}>}
 */
async function requestNoAuth(method, path, body = null, customToken = null) {
    let url = `${BASE_URL}${path}`;
    if (customToken) {
        const separator = path.includes('?') ? '&' : '?';
        url = `${url}${separator}token=${customToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        let data = null;
        const text = await response.text();

        if (text) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    data = JSON.parse(text);
                } catch {
                    data = text;
                }
            } else {
                data = text;
            }
        }

        return {
            status: response.status,
            ok: response.ok,
            data
        };
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return { status: 408, ok: false, data: { error: 'Request timeout' } };
        }
        return { status: 0, ok: false, data: { error: error.message } };
    }
}

module.exports = {
    /**
     * GET request
     * @param {string} path - API path
     */
    get: (path) => request('GET', path),

    /**
     * POST request
     * @param {string} path - API path
     * @param {object} body - Request body
     */
    post: (path, body) => request('POST', path, body),

    /**
     * PUT request
     * @param {string} path - API path
     * @param {object} body - Request body
     */
    put: (path, body) => request('PUT', path, body),

    /**
     * DELETE request
     * @param {string} path - API path
     */
    del: (path) => request('DELETE', path),

    /**
     * GET request without authentication (for testing auth requirements)
     * @param {string} path - API path
     * @param {string|null} customToken - Optional invalid token to test
     */
    getNoAuth: (path, customToken = null) => requestNoAuth('GET', path, null, customToken),

    /**
     * POST request without authentication (for testing auth requirements)
     * @param {string} path - API path
     * @param {object} body - Request body
     * @param {string|null} customToken - Optional invalid token to test
     */
    postNoAuth: (path, body, customToken = null) => requestNoAuth('POST', path, body, customToken),

    /**
     * GET request with a specific token (for testing invalid/expired tokens)
     * @param {string} path - API path
     * @param {string} token - Token to use
     */
    getWithToken: (path, token) => requestNoAuth('GET', path, null, token),

    /**
     * POST request with a specific token (for testing invalid/expired tokens)
     * @param {string} path - API path
     * @param {object} body - Request body
     * @param {string} token - Token to use
     */
    postWithToken: (path, body, token) => requestNoAuth('POST', path, body, token),

    /**
     * Base URL for reference
     */
    BASE_URL,

    // ==========================================================================
    // Permission Testing Helpers
    // ==========================================================================

    /**
     * GET request with specific permissions (non-admin token)
     * @param {string} path - API path
     * @param {string[]} permissions - Permissions to include in token
     */
    getWithPermissions: (path, permissions) => {
        const token = createTokenWithPermissions(permissions);
        return requestNoAuth('GET', path, null, token);
    },

    /**
     * POST request with specific permissions (non-admin token)
     * @param {string} path - API path
     * @param {object} body - Request body
     * @param {string[]} permissions - Permissions to include in token
     */
    postWithPermissions: (path, body, permissions) => {
        const token = createTokenWithPermissions(permissions);
        return requestNoAuth('POST', path, body, token);
    },

    /**
     * DELETE request with specific permissions (non-admin token)
     * @param {string} path - API path
     * @param {string[]} permissions - Permissions to include in token
     */
    delWithPermissions: (path, permissions) => {
        const token = createTokenWithPermissions(permissions);
        return requestNoAuth('DELETE', path, null, token);
    },

    /**
     * GET request with NO permissions (authenticated but unauthorized)
     * @param {string} path - API path
     */
    getNoPermissions: (path) => {
        const token = createTokenWithoutPermissions();
        return requestNoAuth('GET', path, null, token);
    },

    /**
     * POST request with NO permissions (authenticated but unauthorized)
     * @param {string} path - API path
     * @param {object} body - Request body
     */
    postNoPermissions: (path, body) => {
        const token = createTokenWithoutPermissions();
        return requestNoAuth('POST', path, body, token);
    },

    /**
     * Test permission enforcement on an endpoint
     * Returns results for both authorized and unauthorized requests
     * @param {string} method - HTTP method
     * @param {string} path - API path
     * @param {string} permission - Required permission
     * @param {object|null} body - Request body for POST
     * @returns {Promise<{authorized: object, unauthorized: object}>}
     */
    testPermission: async (method, path, permission, body = null) => {
        const { withPermission, withoutPermission } = createPermissionTestTokens(permission);

        const makeRequest = (token) => requestNoAuth(method, path, body, token);

        const [authorized, unauthorized] = await Promise.all([
            makeRequest(withPermission),
            makeRequest(withoutPermission)
        ]);

        return { authorized, unauthorized };
    },

    // Re-export token utilities for direct use
    tokens: {
        createTokenWithPermissions,
        createTokenWithoutPermissions,
        createPermissionTestTokens
    }
};
