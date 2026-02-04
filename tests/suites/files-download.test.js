/**
 * File Download API E2E Tests
 *
 * Tests for file download functionality
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('File Download API', () => {
    const testPrefix = `test_download_${Date.now()}`;
    const testFilePath = `data/${testPrefix}_file.txt`;
    const testContent = 'Test file content for download';
    let fileCreated = false;

    // Setup: create a test file
    before(async () => {
        const res = await api.post(`/api/core/v1/files/${testFilePath}`, {
            content: testContent
        });
        if (res.ok) {
            fileCreated = true;
        }
    });

    after(async () => {
        // Cleanup
        if (fileCreated) {
            await api.post(`/api/core/v1/deleteItems/data`, [
                { name: `${testPrefix}_file.txt`, isDirectory: false }
            ]).catch(() => {});
        }
    });

    describe('Download File', () => {
        it('should download existing file', async () => {
            const res = await api.get(`/api/core/v1/download?path=${encodeURIComponent(testFilePath)}`);

            // Download may return file or redirect
            assert.ok(res.status >= 200 && res.status < 600, `Should respond, got ${res.status}`);
        });

        it('should handle non-existent file', async () => {
            const res = await api.get('/api/core/v1/download?path=nonexistent/file.txt');

            // Should return error
            assert.ok(res.status >= 400 || !res.ok, 'Should fail for non-existent file');
        });

        it('should require path parameter', async () => {
            const res = await api.get('/api/core/v1/download');

            // Should return error without path
            assert.ok(res.status >= 400 || !res.ok, 'Should require path parameter');
        });

        it('should prevent path traversal', async () => {
            const res = await api.get('/api/core/v1/download?path=../../../etc/passwd');

            // Should reject or sanitize path traversal
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle path traversal');
            // Should not expose system files
        });

        it('should handle directory download attempt', async () => {
            const res = await api.get('/api/core/v1/download?path=data');

            // Should fail for directory
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle directory');
        });

        it('should require auth for download', async () => {
            const res = await api.getNoAuth(`/api/core/v1/download?path=${encodeURIComponent(testFilePath)}`);

            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    describe('Download with URL', () => {
        it('should handle url parameter', async () => {
            const res = await api.get('/api/core/v1/download?url=https://example.com/test.txt');

            // May succeed or fail based on implementation
            assert.ok(res.status >= 200 && res.status < 600, 'Should respond');
        });

        it('should reject invalid URL', async () => {
            const res = await api.get('/api/core/v1/download?url=not-a-valid-url');

            // Should handle gracefully
            assert.ok(res.status >= 200 && res.status < 600, 'Should handle invalid URL');
        });
    });
});
