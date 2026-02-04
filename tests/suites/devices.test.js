/**
 * Devices API E2E Tests
 *
 * Tests for device management CRUD operations and permission enforcement
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Devices API', () => {
    const testPrefix = `test_device_${Date.now()}`;
    const createdDevices = [];

    after(async () => {
        for (const deviceName of createdDevices) {
            await api.get(`/api/core/v1/devices/${encodeURIComponent(deviceName)}/delete`).catch(() => {});
        }
    });

    describe('List Devices', () => {
        it('should list all devices', async () => {
            const res = await api.get('/api/core/v1/devices');
            assert.strictEqual(res.ok, true, `Should list devices, got ${res.status}`);
            assert.ok(res.data.items !== undefined, 'Should have items array');
        });

        it('should require auth to list devices', async () => {
            const res = await api.getNoAuth('/api/core/v1/devices');
            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow listing devices with devices.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/devices', ['devices.read']);
            assert.ok(res.status !== 403, `Should allow with devices.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing devices without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/devices');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should deny creating device without permission', async () => {
            const res = await api.postNoPermissions('/api/core/v1/devices', {
                name: `denied_device_${Date.now()}`,
                type: 'test'
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow creating device with devices.create permission', async () => {
            const permDeviceName = `perm_device_${Date.now()}`;
            const res = await api.postWithPermissions('/api/core/v1/devices', {
                name: permDeviceName,
                type: 'test',
                config: {}
            }, ['devices.create']);
            assert.ok(res.status !== 403, `Should allow with devices.create permission (got ${res.status})`);
            if (res.ok) {
                await api.get(`/api/core/v1/devices/${encodeURIComponent(permDeviceName)}/delete`).catch(() => {});
            }
        });

        it('should allow updating device with devices.update permission', async () => {
            const updateDeviceName = `update_perm_device_${Date.now()}`;
            await api.post('/api/core/v1/devices', {
                name: updateDeviceName,
                type: 'test',
                config: {}
            });

            const res = await api.postWithPermissions(`/api/core/v1/devices/${encodeURIComponent(updateDeviceName)}`, {
                name: updateDeviceName,
                type: 'test',
                config: { updated: true }
            }, ['devices.update']);
            assert.ok(res.status !== 403, `Should allow with devices.update permission (got ${res.status})`);

            await api.get(`/api/core/v1/devices/${encodeURIComponent(updateDeviceName)}/delete`).catch(() => {});
        });

        it('should deny updating device without permission', async () => {
            const denyUpdateDeviceName = `deny_update_device_${Date.now()}`;
            await api.post('/api/core/v1/devices', {
                name: denyUpdateDeviceName,
                type: 'test',
                config: {}
            });

            const res = await api.postNoPermissions(`/api/core/v1/devices/${encodeURIComponent(denyUpdateDeviceName)}`, {
                name: denyUpdateDeviceName,
                config: { unauthorized: true }
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);

            await api.get(`/api/core/v1/devices/${encodeURIComponent(denyUpdateDeviceName)}/delete`).catch(() => {});
        });

        it('should allow deleting device with devices.delete permission', async () => {
            const deleteDeviceName = `delete_perm_device_${Date.now()}`;
            await api.post('/api/core/v1/devices', {
                name: deleteDeviceName,
                type: 'test',
                config: {}
            });

            const res = await api.getWithPermissions(`/api/core/v1/devices/${encodeURIComponent(deleteDeviceName)}/delete`, ['devices.delete']);
            assert.ok(res.status !== 403, `Should allow with devices.delete permission (got ${res.status})`);
        });

        it('should deny deleting device without permission', async () => {
            const denyDeleteDeviceName = `deny_delete_device_${Date.now()}`;
            await api.post('/api/core/v1/devices', {
                name: denyDeleteDeviceName,
                type: 'test',
                config: {}
            });

            const res = await api.getNoPermissions(`/api/core/v1/devices/${encodeURIComponent(denyDeleteDeviceName)}/delete`);
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);

            await api.get(`/api/core/v1/devices/${encodeURIComponent(denyDeleteDeviceName)}/delete`).catch(() => {});
        });
    });
});
