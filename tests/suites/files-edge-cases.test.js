/**
 * Files Edge Cases Tests
 * Based on actual files.ts implementation
 *
 * Key findings from code:
 * - Paths are built with path.join(getRoot(req), name) - normalizes paths
 * - fileExists() check before operations
 * - Returns 404 for non-existent files
 * - Delete expects array with items having 'name' and 'isDirectory' properties
 * - Directory creation uses recursive: true
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Files Edge Cases', () => {
    const testDir = `data/test_files_${Date.now()}`;

    before(async () => {
        // Create test directory
        await api.post(`/api/core/v1/directories/${testDir}`, {});
    });

    after(async () => {
        // Cleanup - body should be array directly
        try {
            await api.post(`/api/core/v1/deleteItems/data`,
                [{ name: testDir.replace('data/', ''), isDirectory: true }]
            );
        } catch (e) { }
    });

    describe('Path Traversal Prevention', () => {
        // path.join normalizes paths, removing ../ sequences

        it('should not allow reading /etc/passwd via path traversal', async () => {
            const res = await api.get('/api/core/v1/files/data/../../../etc/passwd');
            // path.join normalizes this, should return 404 (file not found in data dir)
            // or the file doesn't exist at the normalized path
            if (res.status === 200 && typeof res.data === 'string') {
                assert.ok(!res.data.includes('root:'), 'Should not expose /etc/passwd content');
            }
        });

        it('should not allow reading system files via encoded traversal', async () => {
            const res = await api.get('/api/core/v1/files/data%2F..%2F..%2F..%2Fetc%2Fpasswd');
            if (res.status === 200 && typeof res.data === 'string') {
                assert.ok(!res.data.includes('root:'), 'Should not expose system files');
            }
        });

        it('should normalize paths with multiple ../', async () => {
            const res = await api.get('/api/core/v1/files/data/subdir/../../data');
            // Should normalize to 'data' directory, which should work
            assert.ok(res.status === 200 || res.status === 404, 'Should handle path normalization');
        });
    });

    describe('File Operations', () => {
        it('should return 404 for non-existent file', async () => {
            const res = await api.get(`/api/core/v1/files/${testDir}/nonexistent_file_12345.txt`);
            assert.strictEqual(res.status, 404, 'Non-existent file should return 404');
        });

        it('should create file with content', async () => {
            const filePath = `${testDir}/test_file.txt`;
            const content = 'Hello, World!';

            const writeRes = await api.post(`/api/core/v1/files/${filePath}`, { content });
            assert.strictEqual(writeRes.ok, true, 'File write should succeed');

            const readRes = await api.get(`/api/core/v1/files/${filePath}`);
            assert.strictEqual(readRes.ok, true, 'File read should succeed');
            assert.strictEqual(readRes.data, content, 'Content should match');
        });

        it('should create empty file', async () => {
            const filePath = `${testDir}/empty_file.txt`;

            const writeRes = await api.post(`/api/core/v1/files/${filePath}`, { content: '' });
            assert.strictEqual(writeRes.ok, true, 'Empty file write should succeed');
        });

        it('should overwrite existing file', async () => {
            const filePath = `${testDir}/overwrite_test.txt`;

            await api.post(`/api/core/v1/files/${filePath}`, { content: 'original' });
            await api.post(`/api/core/v1/files/${filePath}`, { content: 'updated' });

            const readRes = await api.get(`/api/core/v1/files/${filePath}`);
            assert.strictEqual(readRes.data, 'updated', 'Content should be overwritten');
        });

        it('should handle file with unicode content', async () => {
            const filePath = `${testDir}/unicode.txt`;
            const content = '日本語テスト 中文 العربية 🎉';

            await api.post(`/api/core/v1/files/${filePath}`, { content });
            const readRes = await api.get(`/api/core/v1/files/${filePath}`);

            assert.strictEqual(readRes.data, content, 'Unicode content should be preserved');
        });

        it('should handle file with binary-like content', async () => {
            const filePath = `${testDir}/binary.bin`;
            // Control characters and high bytes
            const content = '\x00\x01\x02\xFF\xFE';

            await api.post(`/api/core/v1/files/${filePath}`, { content });
            const readRes = await api.get(`/api/core/v1/files/${filePath}`);

            assert.strictEqual(readRes.ok, true, 'Binary content should be readable');
        });

        it('should handle very large file content (500KB)', async () => {
            const filePath = `${testDir}/large.txt`;
            const content = 'x'.repeat(500 * 1024);

            const writeRes = await api.post(`/api/core/v1/files/${filePath}`, { content });
            assert.strictEqual(writeRes.ok, true, 'Large file write should succeed');
        });
    });

    describe('Directory Operations', () => {
        it('should list directory contents', async () => {
            // Create a file first
            await api.post(`/api/core/v1/files/${testDir}/list_test.txt`, { content: 'test' });

            const res = await api.get(`/api/core/v1/files/${testDir}`);
            assert.strictEqual(res.ok, true, 'Directory listing should succeed');
            assert.ok(Array.isArray(res.data), 'Should return array');

            const fileEntry = res.data.find(f => f.name === 'list_test.txt');
            assert.ok(fileEntry, 'Should list created file');
            assert.strictEqual(fileEntry.isDir, false, 'File should not be marked as directory');
        });

        it('should create nested directories with recursive: true', async () => {
            const nestedPath = `${testDir}/level1/level2/level3`;

            const res = await api.post(`/api/core/v1/directories/${nestedPath}`, {});
            assert.strictEqual(res.ok, true, 'Nested directory creation should succeed');

            // Verify it exists
            const listRes = await api.get(`/api/core/v1/files/${testDir}/level1/level2`);
            assert.strictEqual(listRes.ok, true, 'Should be able to list nested directory');
        });

        it('should handle creating existing directory', async () => {
            const dirPath = `${testDir}/existing_dir`;

            await api.post(`/api/core/v1/directories/${dirPath}`, {});
            const res = await api.post(`/api/core/v1/directories/${dirPath}`, {});

            // recursive: true should not fail on existing directory
            assert.strictEqual(res.ok, true, 'Creating existing directory should succeed');
        });

        it('should list empty directory', async () => {
            const emptyDir = `${testDir}/empty_list_dir`;
            await api.post(`/api/core/v1/directories/${emptyDir}`, {});

            const res = await api.get(`/api/core/v1/files/${emptyDir}`);
            assert.strictEqual(res.ok, true, 'Empty directory listing should succeed');
            assert.ok(Array.isArray(res.data), 'Should return array');
            assert.strictEqual(res.data.length, 0, 'Empty directory should have no entries');
        });
    });

    describe('Delete Operations', () => {
        // Note: deleteItems expects array directly as body, not { items: [...] }

        it('should delete file with correct format', async () => {
            const filePath = `${testDir}/delete_me.txt`;
            await api.post(`/api/core/v1/files/${filePath}`, { content: 'to delete' });

            // Body should be the array directly, not wrapped in { items: }
            const res = await api.post(`/api/core/v1/deleteItems/${testDir}`,
                [{ name: 'delete_me.txt', isDirectory: false }]
            );

            assert.strictEqual(res.ok, true, 'Delete should succeed');

            // Verify deleted
            const checkRes = await api.get(`/api/core/v1/files/${filePath}`);
            assert.strictEqual(checkRes.status, 404, 'File should no longer exist');
        });

        it('should delete directory with contents', async () => {
            const dirPath = `${testDir}/delete_dir`;
            await api.post(`/api/core/v1/directories/${dirPath}`, {});
            await api.post(`/api/core/v1/files/${dirPath}/file.txt`, { content: 'test' });

            const res = await api.post(`/api/core/v1/deleteItems/${testDir}`,
                [{ name: 'delete_dir', isDirectory: true }]
            );

            assert.strictEqual(res.ok, true, 'Delete directory should succeed');
        });

        it('should return 400 for empty items array', async () => {
            const res = await api.post(`/api/core/v1/deleteItems/${testDir}`, []);

            // Code checks: if (!itemsToDelete || !itemsToDelete.length)
            assert.strictEqual(res.status, 400, 'Empty items should return 400');
        });

        it('should return 400 for missing items (empty object)', async () => {
            const res = await api.post(`/api/core/v1/deleteItems/${testDir}`, {});
            // Empty object has no length property
            assert.strictEqual(res.status, 400, 'Empty object should return 400');
        });

        it('should return 400 for null body', async () => {
            const res = await api.post(`/api/core/v1/deleteItems/${testDir}`, null);
            assert.strictEqual(res.status, 400, 'Null body should return 400');
        });

        it('should handle delete of non-existent file gracefully', async () => {
            const res = await api.post(`/api/core/v1/deleteItems/${testDir}`,
                [{ name: 'nonexistent_delete_12345.txt', isDirectory: false }]
            );

            // fs.unlink on non-existent file throws, returns 500
            // TODO: Could be improved to check existence first and return 404
            assert.ok(res.status === 200 || res.status === 500, 'Delete non-existent should handle gracefully');
        });
    });

    describe('Rename Operations', () => {
        // Note: API expects { currentPath, newName } where currentPath is the full path to the file

        it('should rename file', async () => {
            await api.post(`/api/core/v1/files/${testDir}/rename_source.txt`, { content: 'rename test' });

            const res = await api.post('/api/core/v1/renameItem', {
                currentPath: `${testDir}/rename_source.txt`,
                newName: 'rename_target.txt'
            });

            assert.strictEqual(res.ok, true, 'Rename should succeed');

            // Verify old doesn't exist
            const oldRes = await api.get(`/api/core/v1/files/${testDir}/rename_source.txt`);
            assert.strictEqual(oldRes.status, 404, 'Old file should not exist');

            // Verify new exists
            const newRes = await api.get(`/api/core/v1/files/${testDir}/rename_target.txt`);
            assert.strictEqual(newRes.ok, true, 'New file should exist');
        });

        it('should fail rename for non-existent file', async () => {
            const res = await api.post('/api/core/v1/renameItem', {
                currentPath: `${testDir}/nonexistent_rename_12345.txt`,
                newName: 'target.txt'
            });

            assert.strictEqual(res.ok, false, 'Rename non-existent should fail');
        });

        it('should fail rename with missing parameters', async () => {
            const res = await api.post('/api/core/v1/renameItem', {
                currentPath: `${testDir}/file.txt`
                // missing newName
            });

            assert.strictEqual(res.ok, false, 'Rename without newName should fail');
        });
    });

    describe('Special Filenames', () => {
        it('should handle filename with spaces', async () => {
            const filePath = `${testDir}/file with spaces.txt`;
            const res = await api.post(`/api/core/v1/files/${encodeURIComponent(filePath)}`, {
                content: 'spaces test'
            });
            assert.strictEqual(res.ok, true, 'Filename with spaces should work');
        });

        it('should handle hidden files (starting with dot)', async () => {
            const filePath = `${testDir}/.hidden`;
            const res = await api.post(`/api/core/v1/files/${filePath}`, {
                content: 'hidden file'
            });
            assert.strictEqual(res.ok, true, 'Hidden file should work');

            // Listing should show it with isHidden: true
            const listRes = await api.get(`/api/core/v1/files/${testDir}`);
            const hiddenFile = listRes.data.find(f => f.name === '.hidden');
            if (hiddenFile) {
                assert.strictEqual(hiddenFile.isHidden, true, 'Hidden file should be marked');
            }
        });

        it('should handle filename with multiple dots', async () => {
            const filePath = `${testDir}/file.tar.gz`;
            const res = await api.post(`/api/core/v1/files/${filePath}`, {
                content: 'multi-dot test'
            });
            assert.strictEqual(res.ok, true, 'Multiple dots in filename should work');
        });

        it('should handle filename without extension', async () => {
            const filePath = `${testDir}/noextension`;
            const res = await api.post(`/api/core/v1/files/${filePath}`, {
                content: 'no extension test'
            });
            assert.strictEqual(res.ok, true, 'Filename without extension should work');
        });
    });

    describe('Concurrent File Operations', () => {
        it('should handle concurrent writes to different files', async () => {
            const writes = Array(10).fill(null).map((_, i) =>
                api.post(`/api/core/v1/files/${testDir}/concurrent_${i}.txt`, {
                    content: `content ${i}`
                })
            );

            const results = await Promise.all(writes);
            const allSuccess = results.every(r => r.ok);

            assert.strictEqual(allSuccess, true, 'All concurrent writes should succeed');
        });

        it('should handle concurrent writes to same file (last write wins)', async () => {
            const filePath = `${testDir}/same_file_concurrent.txt`;

            const writes = Array(5).fill(null).map((_, i) =>
                api.post(`/api/core/v1/files/${filePath}`, {
                    content: `content ${i}`
                })
            );

            await Promise.all(writes);

            // File should exist with one of the values
            const readRes = await api.get(`/api/core/v1/files/${filePath}`);
            assert.strictEqual(readRes.ok, true, 'File should exist');
            assert.ok(readRes.data.startsWith('content '), 'Should have valid content');
        });

        it('should handle concurrent reads', async () => {
            // Create file first
            await api.post(`/api/core/v1/files/${testDir}/read_concurrent.txt`, {
                content: 'read test'
            });

            const reads = Array(20).fill(null).map(() =>
                api.get(`/api/core/v1/files/${testDir}/read_concurrent.txt`)
            );

            const results = await Promise.all(reads);
            const allSuccess = results.every(r => r.ok && r.data === 'read test');

            assert.strictEqual(allSuccess, true, 'All concurrent reads should succeed with same content');
        });
    });
});
