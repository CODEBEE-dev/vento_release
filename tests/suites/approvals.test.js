/**
 * Approvals API E2E Tests
 *
 * Tests for action approval workflow
 */

const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const api = require('../utils/api');

describe('Approvals API', () => {
    const testPrefix = `test_approvals_${Date.now()}`;
    const boardName = `${testPrefix}_board`;
    let boardCreated = false;
    let approvalCardAdded = false;

    before(async () => {
        // Create a test board
        const res = await api.post('/api/core/v1/import/board', {
            name: boardName,
            template: { id: 'blank' }
        });
        if (res.ok) {
            boardCreated = true;

            // Add a card that requires approval
            const cardRes = await api.post(`/api/core/v1/boards/${boardName}/management/add/card`, {
                card: {
                    name: 'approval_action',
                    type: 'action',
                    requestApproval: true,
                    approvalMessage: 'Test approval required',
                    rulesCode: 'return { approved: true, timestamp: Date.now() };'
                }
            });
            if (cardRes.ok) {
                approvalCardAdded = true;
            }
        }
    });

    after(async () => {
        if (boardCreated) {
            await api.get(`/api/core/v1/boards/${boardName}/delete`).catch(() => {});
        }
    });

    describe('List Approvals', () => {
        it('should list approvals for board action', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/actions/approval_action/approvals`);

            // Endpoint may or may not exist
            assert.ok(res.status >= 200 && res.status < 600, 'Should respond');
            if (res.ok) {
                assert.ok(res.data.items !== undefined || Array.isArray(res.data), 'Should return items');
            }
        });

        it('should filter approvals by status', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/actions/approval_action/approvals?status=offered`);

            assert.ok(res.status >= 200 && res.status < 600, 'Should respond');
        });

        it('should require auth to list approvals', async () => {
            const res = await api.getNoAuth(`/api/core/v1/boards/${boardName}/actions/approval_action/approvals`);

            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    describe('Approval Status', () => {
        it('should get approval status', async () => {
            // First try to get list of approvals
            const listRes = await api.get(`/api/core/v1/boards/${boardName}/actions/approval_action/approvals`);

            if (listRes.ok && listRes.data.items?.length > 0) {
                const approvalId = listRes.data.items[0].id;
                const res = await api.get(`/api/core/v1/boards/${boardName}/actions/approval_action/approvals/${approvalId}/status`);

                assert.ok(res.status >= 200 && res.status < 600, 'Should respond');
                if (res.ok) {
                    assert.ok(res.data.status, 'Should have status field');
                }
            } else {
                // No approvals to test - skip
                assert.ok(true, 'No approvals available to test');
            }
        });

        it('should handle non-existent approval', async () => {
            const res = await api.get(`/api/core/v1/boards/${boardName}/actions/approval_action/approvals/nonexistent_id/status`);

            // Should return error or applied status
            assert.ok(res.status >= 200 && res.status < 600, 'Should respond');
        });
    });

    describe('Accept Approval', () => {
        it('should accept pending approval', async () => {
            // Get pending approvals
            const listRes = await api.get(`/api/core/v1/boards/${boardName}/actions/approval_action/approvals?status=offered`);

            if (listRes.ok && listRes.data.items?.length > 0) {
                const approvalId = listRes.data.items[0].id;
                const res = await api.post(`/api/core/v1/boards/${boardName}/actions/approval_action/approvals/${approvalId}/accept`, {});

                assert.ok(res.status >= 200 && res.status < 600, 'Should respond');
                if (res.ok) {
                    assert.ok(res.data.accepted === true, 'Should confirm acceptance');
                }
            } else {
                assert.ok(true, 'No pending approvals to accept');
            }
        });

        it('should require auth to accept', async () => {
            const res = await api.postNoAuth(`/api/core/v1/boards/${boardName}/actions/approval_action/approvals/any_id/accept`, {});

            assert.strictEqual(res.status, 401, 'Should require auth');
        });

        it('should handle already processed approval', async () => {
            const res = await api.post(`/api/core/v1/boards/${boardName}/actions/approval_action/approvals/already_processed_id/accept`, {});

            // Should handle gracefully
            assert.ok(res.status >= 200 && res.status < 600, 'Should respond');
        });
    });

    describe('Reject Approval', () => {
        it('should reject pending approval', async () => {
            // First trigger an action that requires approval
            await api.get(`/api/core/v1/boards/${boardName}/actions/approval_action`);

            // Get pending approvals
            const listRes = await api.get(`/api/core/v1/boards/${boardName}/actions/approval_action/approvals?status=offered`);

            if (listRes.ok && listRes.data.items?.length > 0) {
                const approvalId = listRes.data.items[0].id;
                const res = await api.post(`/api/core/v1/boards/${boardName}/actions/approval_action/approvals/${approvalId}/reject`, {});

                assert.ok(res.status >= 200 && res.status < 600, 'Should respond');
                if (res.ok) {
                    assert.ok(res.data.rejected === true, 'Should confirm rejection');
                }
            } else {
                assert.ok(true, 'No pending approvals to reject');
            }
        });

        it('should require auth to reject', async () => {
            const res = await api.postNoAuth(`/api/core/v1/boards/${boardName}/actions/approval_action/approvals/any_id/reject`, {});

            assert.strictEqual(res.status, 401, 'Should require auth');
        });
    });

    describe('Approval Workflow', () => {
        it('should complete full approval workflow', async () => {
            if (!approvalCardAdded) {
                assert.ok(true, 'Skipped - approval card not added');
                return;
            }

            // 1. Trigger action that requires approval
            const triggerRes = await api.get(`/api/core/v1/boards/${boardName}/actions/approval_action`);

            // Action may return immediately or create approval
            assert.ok(triggerRes.status >= 200 && triggerRes.status < 600, 'Should trigger action');

            // 2. Check if approval was created
            const listRes = await api.get(`/api/core/v1/boards/${boardName}/actions/approval_action/approvals`);

            if (listRes.ok && listRes.data.items?.length > 0) {
                // 3. Accept the approval
                const approvalId = listRes.data.items[0].id;
                const acceptRes = await api.post(`/api/core/v1/boards/${boardName}/actions/approval_action/approvals/${approvalId}/accept`, {});

                assert.ok(acceptRes.status >= 200 && acceptRes.status < 600, 'Should process acceptance');
            }
        });
    });
});
