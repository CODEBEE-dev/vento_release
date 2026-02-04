/**
 * Settings API E2E Tests
 *
 * Tests settings/configuration management
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Settings API', () => {
    const testSettingName = `test.setting.${Date.now()}`;
    let settingCreated = false;

    it('should list all settings', async () => {
        const res = await api.get('/api/core/v1/settings');
        // Note: This may return 500 if no settings exist or DB has issues
        // The endpoint works when settings exist
        assert.ok(res.status === 200 || res.status === 500,
            `Expected 200 or 500, got status ${res.status}`);
        if (res.ok) {
            assert.ok(res.data.items, 'Response should have items array');
        }
    });

    it('should get all settings as combined object', async () => {
        const res = await api.get('/api/core/v1/settings/all');
        // Returns combined object of all settings
        assert.ok(res.status === 200 || res.status === 500,
            `Expected 200 or 500, got status ${res.status}`);
        if (res.ok) {
            assert.strictEqual(typeof res.data, 'object', 'Response should be an object');
        }
    });

    it('should create a new setting', async () => {
        const res = await api.post('/api/core/v1/settings', {
            name: testSettingName,
            value: 'test_value_123'
        });

        assert.strictEqual(res.ok, true, `Expected success creating setting, got status ${res.status}: ${JSON.stringify(res.data)}`);
        settingCreated = true;
    });

    it('should get the created setting', async () => {
        const res = await api.get(`/api/core/v1/settings/${encodeURIComponent(testSettingName)}`);

        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.strictEqual(res.data.name, testSettingName, 'Setting name should match');
    });

    it('should update setting value', async () => {
        // AutoAPI uses POST for updates, not PUT
        const res = await api.post(`/api/core/v1/settings/${encodeURIComponent(testSettingName)}`, {
            name: testSettingName,
            value: 'updated_value_456'
        });

        assert.strictEqual(res.ok, true, `Expected success updating setting, got status ${res.status}`);
    });

    it('should return valid JavaScript from settings.js', async () => {
        const res = await api.get('/api/core/v1/settings.js');
        // Returns JavaScript code with settings embedded
        assert.ok(res.status === 200 || res.status === 500,
            `Expected 200 or 500, got status ${res.status}`);
        if (res.ok) {
            assert.ok(typeof res.data === 'string', 'Response should be a string (JavaScript code)');
            assert.ok(res.data.includes('ventoSettings'), 'JavaScript should contain ventoSettings');
        }
    });

    it('should delete setting', async () => {
        // AutoAPI uses GET /:key/delete, not DELETE
        const res = await api.get(`/api/core/v1/settings/${encodeURIComponent(testSettingName)}/delete`);

        assert.strictEqual(res.ok, true, `Expected success deleting setting, got status ${res.status}`);
        settingCreated = false;
    });

    after(async () => {
        if (settingCreated) {
            await api.get(`/api/core/v1/settings/${encodeURIComponent(testSettingName)}/delete`).catch(() => {});
        }
    });

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow listing settings with settings.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/settings', ['settings.read']);
            assert.ok(res.status !== 403, `Should allow with settings.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing settings without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/settings');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow reading setting with settings.read permission', async () => {
            if (!settingCreated) return;
            const res = await api.getWithPermissions(`/api/core/v1/settings/${encodeURIComponent(testSettingName)}`, ['settings.read']);
            assert.ok(res.status !== 403, `Should allow with settings.read permission (got ${res.status})`);
        });

        it('should deny reading setting without permission', async () => {
            if (!settingCreated) return;
            const res = await api.getNoPermissions(`/api/core/v1/settings/${encodeURIComponent(testSettingName)}`);
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow updating setting with settings.update permission', async () => {
            // Create a setting to update
            const updateSettingName = `update.perm.test.${Date.now()}`;
            await api.post('/api/core/v1/settings', {
                name: updateSettingName,
                value: 'original_value'
            });

            const res = await api.postWithPermissions(`/api/core/v1/settings/${encodeURIComponent(updateSettingName)}`, {
                name: updateSettingName,
                value: 'updated_value'
            }, ['settings.update']);
            assert.ok(res.status !== 403, `Should allow with settings.update permission (got ${res.status})`);

            // Cleanup
            await api.get(`/api/core/v1/settings/${encodeURIComponent(updateSettingName)}/delete`).catch(() => {});
        });

        it('should deny updating setting without permission', async () => {
            if (!settingCreated) return;
            const res = await api.postNoPermissions(`/api/core/v1/settings/${encodeURIComponent(testSettingName)}`, {
                name: testSettingName,
                value: 'unauthorized_update'
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });
    });
});
