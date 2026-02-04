/**
 * Files API Tests
 * Tests for file and directory operations
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Files API', () => {
    const testDir = `test_files_${Date.now()}`;
    const testFileName = 'test_file.txt';
    const testFileContent = 'Hello, this is test content!';
    let dirCreated = false;
    let fileCreated = false;

    // Functional tests

    it('should list data directory', async () => {
        const res = await api.get('/api/core/v1/files/data');
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.ok(Array.isArray(res.data), 'Response should be an array');
    });

    it('should create a directory', async () => {
        const res = await api.post(`/api/core/v1/directories/data/${testDir}`, {});
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.ok(res.data.result, 'Should have result property');
        dirCreated = true;
    });

    it('should list empty directory', async () => {
        const res = await api.get(`/api/core/v1/files/data/${testDir}`);
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.ok(Array.isArray(res.data), 'Response should be an array');
        assert.strictEqual(res.data.length, 0, 'Directory should be empty');
    });

    it('should write a file with content', async () => {
        const res = await api.post(`/api/core/v1/files/data/${testDir}/${testFileName}`, {
            content: testFileContent
        });
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        fileCreated = true;
    });

    it('should list directory with file', async () => {
        const res = await api.get(`/api/core/v1/files/data/${testDir}`);
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.ok(Array.isArray(res.data), 'Response should be an array');
        assert.strictEqual(res.data.length, 1, 'Directory should have one file');
        assert.strictEqual(res.data[0].name, testFileName, 'File name should match');
        assert.strictEqual(res.data[0].isDir, false, 'Should not be a directory');
    });

    it('should read file content', async () => {
        const res = await api.get(`/api/core/v1/files/data/${testDir}/${testFileName}`);
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        assert.strictEqual(res.data, testFileContent, 'File content should match');
    });

    it('should rename a file', async () => {
        const newFileName = 'renamed_file.txt';
        const res = await api.post('/api/core/v1/renameItem', {
            currentPath: `data/${testDir}/${testFileName}`,
            newName: newFileName
        });
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);

        // Verify rename worked
        const listRes = await api.get(`/api/core/v1/files/data/${testDir}`);
        assert.strictEqual(listRes.ok, true);
        assert.ok(listRes.data.some(f => f.name === newFileName), 'Renamed file should exist');
        assert.ok(!listRes.data.some(f => f.name === testFileName), 'Original file should not exist');
    });

    it('should delete a file', async () => {
        const res = await api.post(`/api/core/v1/deleteItems/data/${testDir}`, [
            { name: 'renamed_file.txt', isDirectory: false }
        ]);
        assert.strictEqual(res.ok, true, `Expected success, got status ${res.status}`);
        fileCreated = false;

        // Verify deletion
        const listRes = await api.get(`/api/core/v1/files/data/${testDir}`);
        assert.strictEqual(listRes.ok, true);
        assert.strictEqual(listRes.data.length, 0, 'Directory should be empty after deletion');
    });

    // Corner cases

    it('should return 404 for non-existent path', async () => {
        const res = await api.get('/api/core/v1/files/data/non_existent_path_12345');
        assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}`);
    });

    it('should handle empty file content', async () => {
        const emptyFileName = 'empty_file.txt';
        const writeRes = await api.post(`/api/core/v1/files/data/${testDir}/${emptyFileName}`, {
            content: ''
        });
        assert.strictEqual(writeRes.ok, true, 'Should create empty file');

        // Cleanup
        await api.post(`/api/core/v1/deleteItems/data/${testDir}`, [
            { name: emptyFileName, isDirectory: false }
        ]);
    });

    it('should handle special characters in filename', async () => {
        const specialFileName = 'test-file_123.txt';
        const writeRes = await api.post(`/api/core/v1/files/data/${testDir}/${specialFileName}`, {
            content: 'test'
        });
        assert.strictEqual(writeRes.ok, true, 'Should create file with special chars');

        // Cleanup
        await api.post(`/api/core/v1/deleteItems/data/${testDir}`, [
            { name: specialFileName, isDirectory: false }
        ]);
    });

    it('should reject rename with missing parameters', async () => {
        const res = await api.post('/api/core/v1/renameItem', {});
        assert.strictEqual(res.ok, false, 'Should fail without parameters');
        assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    });

    it('should reject delete with no items', async () => {
        const res = await api.post(`/api/core/v1/deleteItems/data/${testDir}`, []);
        assert.strictEqual(res.ok, false, 'Should fail with empty array');
        assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    });

    // Cleanup
    after(async () => {
        if (dirCreated) {
            try {
                await api.post(`/api/core/v1/deleteItems/data`, [
                    { name: testDir, isDirectory: true }
                ]);
            } catch (e) {
                console.error(`[cleanup] Failed to delete test directory: ${e.message}`);
            }
        }
    });

    // --- Permission Enforcement Tests ---
    describe('Permission Enforcement', () => {
        it('should allow listing files with files.read permission', async () => {
            const res = await api.getWithPermissions('/api/core/v1/files/data', ['files.read']);
            assert.ok(res.status !== 403, `Should allow with files.read permission (got ${res.status})`);
            assert.ok(res.status !== 401, `Token should be valid (got ${res.status})`);
        });

        it('should deny listing files without permission', async () => {
            const res = await api.getNoPermissions('/api/core/v1/files/data');
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow reading file with files.read permission', async () => {
            if (!dirCreated || !fileCreated) return;
            const res = await api.getWithPermissions(`/api/core/v1/files/data/${testDir}`, ['files.read']);
            assert.ok(res.status !== 403, `Should allow with files.read permission (got ${res.status})`);
        });

        it('should deny reading file without permission', async () => {
            const res = await api.getNoPermissions(`/api/core/v1/files/data/${testDir}`);
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow creating directory with files.create permission', async () => {
            const permDir = `perm_test_dir_${Date.now()}`;
            const res = await api.postWithPermissions(`/api/core/v1/directories/data/${permDir}`, {}, ['files.create']);
            assert.ok(res.status !== 403, `Should allow with files.create permission (got ${res.status})`);
            // Cleanup
            if (res.ok) {
                await api.post(`/api/core/v1/deleteItems/data`, [
                    { name: permDir, isDirectory: true }
                ]).catch(() => {});
            }
        });

        it('should deny creating directory without permission', async () => {
            const res = await api.postNoPermissions(`/api/core/v1/directories/data/denied_dir_${Date.now()}`, {});
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow writing file with files.create permission', async () => {
            const permFileName = `perm_file_${Date.now()}.txt`;
            const res = await api.postWithPermissions(`/api/core/v1/files/data/${testDir}/${permFileName}`, {
                content: 'test content'
            }, ['files.create']);
            assert.ok(res.status !== 403, `Should allow with files.create permission (got ${res.status})`);
            // Cleanup
            if (res.ok) {
                await api.post(`/api/core/v1/deleteItems/data/${testDir}`, [
                    { name: permFileName, isDirectory: false }
                ]).catch(() => {});
            }
        });

        it('should deny writing file without permission', async () => {
            const res = await api.postNoPermissions(`/api/core/v1/files/data/${testDir}/denied_file.txt`, {
                content: 'denied content'
            });
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);
        });

        it('should allow deleting file with files.delete permission', async () => {
            // Create a file to delete
            const deleteFileName = `delete_perm_file_${Date.now()}.txt`;
            await api.post(`/api/core/v1/files/data/${testDir}/${deleteFileName}`, {
                content: 'to be deleted'
            });

            const res = await api.postWithPermissions(`/api/core/v1/deleteItems/data/${testDir}`, [
                { name: deleteFileName, isDirectory: false }
            ], ['files.delete']);
            assert.ok(res.status !== 403, `Should allow with files.delete permission (got ${res.status})`);
        });

        it('should deny deleting file without permission', async () => {
            // Create a file to try to delete
            const denyDeleteFileName = `deny_delete_file_${Date.now()}.txt`;
            await api.post(`/api/core/v1/files/data/${testDir}/${denyDeleteFileName}`, {
                content: 'should not delete'
            });

            const res = await api.postNoPermissions(`/api/core/v1/deleteItems/data/${testDir}`, [
                { name: denyDeleteFileName, isDirectory: false }
            ]);
            assert.strictEqual(res.status, 403, `Should deny without permission (got ${res.status})`);

            // Cleanup with admin token
            await api.post(`/api/core/v1/deleteItems/data/${testDir}`, [
                { name: denyDeleteFileName, isDirectory: false }
            ]).catch(() => {});
        });
    });
});
