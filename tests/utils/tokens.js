/**
 * Token Generation Utilities for Permission Testing
 *
 * Creates tokens with specific permissions for testing that:
 * 1. Users WITH the correct permission can access endpoints
 * 2. Users WITHOUT the correct permission are denied (403)
 */

require('dotenv').config();
const { genToken } = require('protobase');

/**
 * Generate a token with specific permissions (non-admin)
 * @param {string[]} permissions - Array of permissions like ['boards.read', 'users.create']
 * @param {object} options - Additional options
 * @param {string} options.id - User ID (default: 'test-user')
 * @param {string} options.type - User type (default: 'user')
 * @returns {string} JWT token
 */
function createTokenWithPermissions(permissions, options = {}) {
    const { id = 'test-user', type = 'user' } = options;
    return genToken({
        id,
        type,
        admin: false,  // Never admin - we're testing granular permissions
        permissions
    }, { expiresIn: '1h' });
}

/**
 * Generate a token with NO permissions (non-admin)
 * Useful for testing that endpoints properly reject unauthorized users
 * @param {object} options - Additional options
 * @returns {string} JWT token
 */
function createTokenWithoutPermissions(options = {}) {
    return createTokenWithPermissions([], options);
}

/**
 * Generate a viewer token (read-only access to common resources)
 * @returns {string} JWT token
 */
function createViewerToken() {
    return createTokenWithPermissions([
        'boards.read',
        'boards.execute',
        'cards.read',
        'cards.execute',
        'devices.read',
        'objects.read',
        'events.read',
        'messages.read',
        'protomemdb.read',
        'icons.read',
        'settings.read',
        'groups.read'
    ], { id: 'test-viewer', type: 'user' });
}

/**
 * Generate a standard user token (most common operations)
 * @returns {string} JWT token
 */
function createUserToken() {
    return createTokenWithPermissions([
        'boards.*',
        'cards.*',
        'objects.*',
        'apis.*',
        'chatbots.*',
        'stateMachines.*',
        'automations.*',
        'themes.*',
        'files.read',
        'files.create',
        'files.update',
        'devices.read',
        'devices.update',
        'settings.read',
        'settings.update',
        'events.read',
        'databases.read',
        'users.read',
        'groups.read'
    ], { id: 'test-user', type: 'user' });
}

/**
 * Convenience: Create tokens for testing a specific permission
 * Returns both a token WITH the permission and one WITHOUT
 * @param {string} permission - The permission to test (e.g., 'boards.read')
 * @returns {{ withPermission: string, withoutPermission: string }}
 */
function createPermissionTestTokens(permission) {
    return {
        withPermission: createTokenWithPermissions([permission]),
        withoutPermission: createTokenWithoutPermissions()
    };
}

/**
 * Create tokens for testing multiple permissions
 * @param {string[]} permissions - Permissions to test
 * @returns {{ withPermissions: string, withoutPermissions: string, withPartial: string }}
 */
function createMultiPermissionTestTokens(permissions) {
    return {
        withPermissions: createTokenWithPermissions(permissions),
        withoutPermissions: createTokenWithoutPermissions(),
        withPartial: permissions.length > 1
            ? createTokenWithPermissions([permissions[0]])
            : createTokenWithoutPermissions()
    };
}

module.exports = {
    createTokenWithPermissions,
    createTokenWithoutPermissions,
    createViewerToken,
    createUserToken,
    createPermissionTestTokens,
    createMultiPermissionTestTokens
};
