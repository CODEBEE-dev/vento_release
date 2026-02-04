/**
 * ProtoMemDB API Tests
 * Tests for in-memory state management
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('ProtoMemDB API', () => {
    const testChunk = 'states';
    const testGroup = `test_group_${Date.now()}`;
    const testTag = 'test_tag';
    const testName = 'test_value';
    const testValue = { message: 'Hello from test', timestamp: Date.now() };

    // Functional tests

    it('should get chunk state', async () => {
        const res = await api.get(`/api/core/v1/protomemdb/${testChunk}`);
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        // Chunk should return an object (possibly empty)
        assert.ok(typeof res.data === 'object', 'Response should be an object');
    });

    it('should set a value', async () => {
        const res = await api.post(`/api/core/v1/protomemdb/${testChunk}/${testGroup}/${testTag}/${testName}`, {
            value: testValue
        });
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
    });

    it('should get value by group', async () => {
        const res = await api.get(`/api/core/v1/protomemdb/${testChunk}/${testGroup}`);
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        // Should contain our test tag
        assert.ok(testTag in res.data, `Response should contain tag '${testTag}'`);
    });

    it('should get value by tag', async () => {
        const res = await api.get(`/api/core/v1/protomemdb/${testChunk}/${testGroup}/${testTag}`);
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        // Should contain our test name
        assert.ok(testName in res.data, `Response should contain name '${testName}'`);
    });

    it('should update existing value', async () => {
        const newValue = { message: 'Updated value', updated: true };
        const res = await api.post(`/api/core/v1/protomemdb/${testChunk}/${testGroup}/${testTag}/${testName}`, {
            value: newValue
        });
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);

        // Verify update
        const getRes = await api.get(`/api/core/v1/protomemdb/${testChunk}/${testGroup}/${testTag}`);
        assert.strictEqual(getRes.ok, true);
        assert.deepStrictEqual(getRes.data[testName], newValue, 'Value should be updated');
    });

    it('should handle multiple values in same group', async () => {
        const secondName = 'second_value';
        const secondValue = { data: 'second' };

        const res = await api.post(`/api/core/v1/protomemdb/${testChunk}/${testGroup}/${testTag}/${secondName}`, {
            value: secondValue
        });
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);

        // Verify both values exist
        const getRes = await api.get(`/api/core/v1/protomemdb/${testChunk}/${testGroup}/${testTag}`);
        assert.strictEqual(getRes.ok, true);
        assert.ok(testName in getRes.data, 'First value should exist');
        assert.ok(secondName in getRes.data, 'Second value should exist');
    });

    // Corner cases

    it('should handle non-existent chunk gracefully', async () => {
        const res = await api.get('/api/core/v1/protomemdb/non_existent_chunk_12345');
        assert.strictEqual(res.ok, true, 'Should return success for non-existent chunk');
        // Non-existent chunks typically return empty object
        assert.ok(typeof res.data === 'object', 'Should return an object');
    });

    it('should handle non-existent group gracefully', async () => {
        const res = await api.get(`/api/core/v1/protomemdb/${testChunk}/non_existent_group_12345`);
        // ProtoMemDB returns 200 with empty body for non-existent groups
        assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
        // data will be null for empty response
        assert.ok(res.data === null || res.data === undefined || Object.keys(res.data).length === 0,
            'Non-existent group should return empty data');
    });

    it('should handle empty value', async () => {
        const res = await api.post(`/api/core/v1/protomemdb/${testChunk}/${testGroup}/${testTag}/empty_value`, {
            value: ''
        });
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
    });

    it('should handle null value', async () => {
        const res = await api.post(`/api/core/v1/protomemdb/${testChunk}/${testGroup}/${testTag}/null_value`, {
            value: null
        });
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
    });

    it('should handle string value', async () => {
        const res = await api.post(`/api/core/v1/protomemdb/${testChunk}/${testGroup}/${testTag}/string_value`, {
            value: 'simple string'
        });
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);

        // Verify
        const getRes = await api.get(`/api/core/v1/protomemdb/${testChunk}/${testGroup}/${testTag}`);
        assert.strictEqual(getRes.ok, true);
        assert.strictEqual(getRes.data.string_value, 'simple string', 'String value should match');
    });

    it('should handle numeric value', async () => {
        const res = await api.post(`/api/core/v1/protomemdb/${testChunk}/${testGroup}/${testTag}/numeric_value`, {
            value: 42
        });
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);

        // Verify
        const getRes = await api.get(`/api/core/v1/protomemdb/${testChunk}/${testGroup}/${testTag}`);
        assert.strictEqual(getRes.ok, true);
        assert.strictEqual(getRes.data.numeric_value, 42, 'Numeric value should match');
    });

    // Note: ProtoMemDB is in-memory, values are lost on restart
    // No cleanup needed as test uses unique group name
});
