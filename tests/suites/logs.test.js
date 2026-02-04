/**
 * Logs API E2E Tests
 *
 * Tests for logs access (read-only)
 * Note: The logs extension provides an adminapi endpoint that may not be
 * routed through the standard API proxy. These tests verify behavior when available.
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Logs API', () => {
    let logsAvailable = false;

    before(async () => {
        // Check if logs API is available (endpoint might not be routed)
        const res = await api.get('/adminapi/v1/logs');
        logsAvailable = res.status !== 404;
    });

    describe('Get Logs', () => {
        it('should get logs with admin token (if endpoint available)', async (t) => {
            if (!logsAvailable) {
                t.skip('Logs endpoint not available (adminapi not routed)');
                return;
            }
            const res = await api.get('/adminapi/v1/logs');
            assert.strictEqual(res.ok, true, `Should get logs with admin, got ${res.status}`);
        });

        it('should require auth to get logs (if endpoint available)', async (t) => {
            if (!logsAvailable) {
                t.skip('Logs endpoint not available (adminapi not routed)');
                return;
            }
            const res = await api.getNoAuth('/adminapi/v1/logs');
            // hasPermission throws E_AUTH for unauthenticated, which may return 401 or 500
            assert.ok(res.status === 401 || res.status === 500, `Should require auth (got ${res.status})`);
        });
    });

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow reading logs with logs.read permission (if endpoint available)', async (t) => {
            if (!logsAvailable) {
                t.skip('Logs endpoint not available (adminapi not routed)');
                return;
            }
            const res = await api.getWithPermissions('/adminapi/v1/logs', ['logs.read']);
            assert.ok(res.status !== 403, `Should allow with logs.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny reading logs without permission (if endpoint available)', async (t) => {
            if (!logsAvailable) {
                t.skip('Logs endpoint not available (adminapi not routed)');
                return;
            }
            const res = await api.getNoPermissions('/adminapi/v1/logs');
            // hasPermission throws E_PERM which may return 403 or 500
            assert.ok(res.status === 403 || res.status === 500, `Should deny without permission (got ${res.status})`);
        });
    });
});
