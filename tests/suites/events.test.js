/**
 * Events API E2E Tests
 *
 * Tests event system operations
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Events API', () => {
    const testPath = `test/events/${Date.now()}`;

    it('should create an event', async () => {
        const res = await api.post('/api/core/v1/events', {
            path: testPath,
            from: 'test',
            user: 'system',
            payload: { message: 'Test event', timestamp: Date.now() }
        });

        assert.strictEqual(res.ok, true, `Expected success creating event, got status ${res.status}: ${JSON.stringify(res.data)}`);
    });

    it('should list events with pagination', async () => {
        const res = await api.get('/api/core/v1/events?itemsPerPage=10');

        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.ok(res.data.items, 'Response should have items array');
        assert.ok(Array.isArray(res.data.items), 'Items should be an array');
    });

    it('should filter events by path', async () => {
        const res = await api.get(`/api/core/v1/events?filter[path]=${encodeURIComponent(testPath)}`);

        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);

        if (res.data.items && res.data.items.length > 0) {
            const found = res.data.items.some(e => e.path === testPath);
            assert.ok(found, `Event with path "${testPath}" should be found`);
        }
    });

    it('should filter events by from field', async () => {
        const res = await api.get('/api/core/v1/events?filter[from]=test');

        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);

        if (res.data.items && res.data.items.length > 0) {
            const allFromTest = res.data.items.every(e => e.from === 'test');
            assert.ok(allFromTest, 'All events should have from=test');
        }
    });

    it('should order events by created date descending', async () => {
        const res = await api.get('/api/core/v1/events?orderBy=created&orderDirection=desc&itemsPerPage=5');

        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);

        if (res.data.items && res.data.items.length > 1) {
            // Verify descending order
            for (let i = 0; i < res.data.items.length - 1; i++) {
                const current = new Date(res.data.items[i].created).getTime();
                const next = new Date(res.data.items[i + 1].created).getTime();
                assert.ok(current >= next, 'Events should be ordered by created date descending');
            }
        }
    });

    it('should handle ephemeral events', async () => {
        const ephemeralPath = `test/ephemeral/${Date.now()}`;

        const res = await api.post('/api/core/v1/events', {
            path: ephemeralPath,
            from: 'test',
            user: 'system',
            payload: { message: 'Ephemeral event' },
            ephemeral: true
        });

        assert.strictEqual(res.ok, true, `Expected success creating ephemeral event, got status ${res.status}`);

        // Ephemeral events should not be stored, so searching should not find it
        // (or it might be stored briefly - this depends on implementation)
    });

    // Note: Events don't have individual delete, so no cleanup needed
    // Test events use unique paths with timestamps

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow listing events with events.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/events', ['events.read']);
            assert.ok(res.status !== 403, `Should allow with events.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing events without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/events');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow reading specific event with events.read permission', async () => {
            const res = await api.getWithPermissions(`/api/core/v1/events?filter[path]=${encodeURIComponent(testPath)}`, ['events.read']);
            assert.ok(res.status !== 403, `Should allow with events.read permission (got ${res.status})`);
        });

        it('should deny reading specific event without permission', async () => {
            const res = await api.getNoPermissions(`/api/core/v1/events?filter[path]=${encodeURIComponent(testPath)}`);
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });
    });
});
