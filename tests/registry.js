/**
 * Test Registry
 *
 * Registers all test files with their metadata (level and tags).
 * Levels assigned based on ACTUAL execution time measurements.
 *
 * Level guide (based on real execution times):
 *   QUICK (level 1-3): Fast tests < 1 second
 *     1-2: < 500ms - instant smoke tests
 *     3: 500ms - 1s - quick validations
 *
 *   SYSTEM (level 4-6): Moderate tests 1-10 seconds
 *     4-5: 1s - 5s - standard functional tests
 *     6: 5s - 10s - extended tests
 *
 *   DEEP (level 7-9): Slow tests > 10 seconds
 *     7-8: 10s - 30s - stress tests
 *     9: > 30s - heavy stress/concurrency
 */

const { registerTest } = require('./utils/testMeta');

// ============================================================================
// QUICK TESTS - Level 1-2: Instant tests (< 500ms)
// ============================================================================

registerTest('objects.test.js', {
    level: 1,
    tags: ['objects', 'api', 'smoke'],
    description: 'Object schemas listing (63ms)'
});

registerTest('auth.test.js', {
    level: 1,
    tags: ['auth', 'smoke'],
    description: 'Basic auth checks (73ms)'
});

registerTest('icons.test.js', {
    level: 1,
    tags: ['icons', 'api', 'smoke'],
    description: 'Icons listing'
});

registerTest('workspaces.test.js', {
    level: 1,
    tags: ['workspaces', 'api', 'smoke'],
    description: 'Workspaces listing'
});

registerTest('logs.test.js', {
    level: 4,
    tags: ['logs', 'api', 'permissions'],
    description: 'Logs access with permission tests'
});

registerTest('tokens.test.js', {
    level: 1,
    tags: ['auth', 'tokens'],
    description: 'Token operations (75ms)'
});

registerTest('auth-required.test.js', {
    level: 1,
    tags: ['auth', 'security'],
    description: '401 checks (84ms)'
});

registerTest('settings.test.js', {
    level: 1,
    tags: ['settings', 'crud'],
    description: 'Settings CRUD (125ms)'
});

registerTest('automation.test.js', {
    level: 1,
    tags: ['boards', 'automation'],
    description: 'Automation config (144ms)'
});

registerTest('protomemdb.test.js', {
    level: 2,
    tags: ['database', 'state'],
    description: 'ProtoMemDB operations (199ms)'
});

registerTest('files-download.test.js', {
    level: 2,
    tags: ['files', 'download'],
    description: 'File download (204ms)'
});

registerTest('groups.test.js', {
    level: 2,
    tags: ['groups', 'crud'],
    description: 'Groups CRUD (208ms)'
});

registerTest('cards.test.js', {
    level: 2,
    tags: ['cards', 'api'],
    description: 'Cards operations (232ms)'
});

registerTest('apis.test.js', {
    level: 5,
    tags: ['apis', 'crud', 'permissions'],
    description: 'APIs CRUD with permission tests'
});

registerTest('chatbots.test.js', {
    level: 5,
    tags: ['chatbots', 'crud', 'permissions'],
    description: 'Chatbots CRUD with permission tests'
});

registerTest('assets.test.js', {
    level: 5,
    tags: ['assets', 'crud', 'permissions'],
    description: 'Assets CRUD with permission tests'
});

registerTest('devices.test.js', {
    level: 5,
    tags: ['devices', 'crud', 'permissions'],
    description: 'Devices CRUD with permission tests'
});

registerTest('packages.test.js', {
    level: 5,
    tags: ['packages', 'crud', 'permissions'],
    description: 'Packages CRUD with permission tests'
});

registerTest('approvals.test.js', {
    level: 2,
    tags: ['boards', 'approvals'],
    description: 'Approval workflow (267ms)'
});

registerTest('graphlayout.test.js', {
    level: 2,
    tags: ['boards', 'graphlayout'],
    description: 'Graph layout (294ms)'
});

registerTest('files.test.js', {
    level: 2,
    tags: ['files', 'crud'],
    description: 'File operations (303ms)'
});

registerTest('sensor-trigger.test.js', {
    level: 2,
    tags: ['templates', 'boards', 'iot'],
    description: 'Sensor trigger template (335ms)'
});

// ============================================================================
// QUICK TESTS - Level 3: Quick tests (500ms - 1s)
// ============================================================================

registerTest('auth-security.test.js', {
    level: 3,
    tags: ['auth', 'security'],
    description: 'JWT security (461ms)'
});

registerTest('blank.test.js', {
    level: 3,
    tags: ['templates', 'boards'],
    description: 'Blank template (463ms)'
});

registerTest('versions.test.js', {
    level: 3,
    tags: ['boards', 'versions'],
    description: 'Version management (468ms)'
});

registerTest('autopilot-api.test.js', {
    level: 3,
    tags: ['boards', 'autopilot'],
    description: 'Autopilot API (488ms)'
});

registerTest('corner-cases.test.js', {
    level: 3,
    tags: ['edge-cases'],
    description: 'Corner cases (497ms)'
});

registerTest('themes.test.js', {
    level: 3,
    tags: ['ui', 'themes'],
    description: 'Themes API (514ms)'
});

registerTest('permissions.test.js', {
    level: 3,
    tags: ['auth', 'permissions', 'security'],
    description: 'Permissions (523ms)'
});

registerTest('auth-edge-cases.test.js', {
    level: 3,
    tags: ['auth', 'edge-cases'],
    description: 'Auth edge cases (528ms)'
});

registerTest('error-handling.test.js', {
    level: 3,
    tags: ['api', 'error-handling'],
    description: 'Error handling (567ms)'
});

registerTest('databases.test.js', {
    level: 3,
    tags: ['database', 'crud'],
    description: 'Database operations (583ms)'
});

registerTest('smart-ai-agent.test.js', {
    level: 3,
    tags: ['templates', 'boards', 'ai'],
    description: 'Smart AI agent template (589ms)'
});

registerTest('keys.test.js', {
    level: 3,
    tags: ['keys', 'crud'],
    description: 'API keys (620ms)'
});


registerTest('users.test.js', {
    level: 3,
    tags: ['users', 'crud'],
    description: 'Users CRUD (726ms)'
});

registerTest('ai-agent.test.js', {
    level: 3,
    tags: ['templates', 'boards', 'ai'],
    description: 'AI agent template (761ms)'
});

registerTest('rule-based-agent.test.js', {
    level: 3,
    tags: ['templates', 'boards', 'automation'],
    description: 'Rule-based agent template (816ms)'
});

registerTest('board-automation.test.js', {
    level: 3,
    tags: ['boards', 'automation'],
    description: 'Board automation (829ms)'
});

// ============================================================================
// SYSTEM TESTS - Level 4: Standard tests (1s - 2s)
// ============================================================================

registerTest('boards.test.js', {
    level: 4,
    tags: ['boards', 'crud'],
    description: 'Boards API (1018ms)'
});

registerTest('files-edge-cases.test.js', {
    level: 4,
    tags: ['files', 'edge-cases'],
    description: 'Files edge cases (1137ms)'
});

registerTest('workflow-board.test.js', {
    level: 4,
    tags: ['boards', 'workflow'],
    description: 'Board workflow (1155ms)'
});

registerTest('response-format.test.js', {
    level: 4,
    tags: ['api', 'validation'],
    description: 'Response format (1352ms)'
});

registerTest('users-edge-cases.test.js', {
    level: 4,
    tags: ['users', 'edge-cases'],
    description: 'Users edge cases (1531ms)'
});

registerTest('injection.test.js', {
    level: 4,
    tags: ['security', 'injection'],
    description: 'Injection prevention (1691ms)'
});

// ============================================================================
// SYSTEM TESTS - Level 5: Extended tests (2s - 5s)
// ============================================================================

registerTest('persistence.test.js', {
    level: 5,
    tags: ['database', 'persistence'],
    description: 'Data persistence (2052ms)'
});

registerTest('events.test.js', {
    level: 5,
    tags: ['events', 'crud'],
    description: 'Events API (2783ms)'
});

registerTest('boards-crud.test.js', {
    level: 5,
    tags: ['boards', 'crud'],
    description: 'Boards CRUD complete (2964ms)'
});

registerTest('validation.test.js', {
    level: 5,
    tags: ['validation', 'edge-cases'],
    description: 'Input validation (2996ms)'
});

registerTest('large-payloads.test.js', {
    level: 5,
    tags: ['performance', 'stress'],
    description: 'Large payloads (3982ms)'
});

registerTest('search-filter.test.js', {
    level: 5,
    tags: ['api', 'search'],
    description: 'Search and filter (4428ms)'
});

registerTest('card-dependencies.test.js', {
    level: 5,
    tags: ['cards', 'dependencies'],
    description: 'Card dependencies (4893ms)'
});

// ============================================================================
// SYSTEM TESTS - Level 6: Long tests (5s - 10s)
// ============================================================================

registerTest('streaming.test.js', {
    level: 6,
    tags: ['streaming', 'api'],
    description: 'Streaming API (5060ms)'
});

registerTest('pagination.test.js', {
    level: 6,
    tags: ['api', 'pagination'],
    description: 'Pagination (5390ms)'
});

registerTest('concurrency-advanced.test.js', {
    level: 6,
    tags: ['concurrency', 'stress'],
    description: 'Advanced concurrency (5793ms)'
});

registerTest('ephemeral.test.js', {
    level: 6,
    tags: ['state', 'ephemeral'],
    description: 'Ephemeral state (5831ms)'
});

registerTest('boundaries.test.js', {
    level: 6,
    tags: ['validation', 'edge-cases'],
    description: 'Boundary conditions (6183ms)'
});

registerTest('response-consistency.test.js', {
    level: 6,
    tags: ['api', 'validation'],
    description: 'Response consistency (6282ms)'
});

registerTest('action-timeouts.test.js', {
    level: 6,
    tags: ['executions', 'edge-cases'],
    description: 'Action timeouts (8506ms)'
});

// ============================================================================
// DEEP TESTS - Level 7-8: Stress tests (10s - 30s)
// ============================================================================

registerTest('executions-cancel.test.js', {
    level: 7,
    tags: ['executions', 'edge-cases'],
    description: 'Execution cancel (10253ms)'
});

registerTest('executions.test.js', {
    level: 7,
    tags: ['boards', 'executions'],
    description: 'Execution tracking (14748ms)'
});

registerTest('boards-edge-cases.test.js', {
    level: 7,
    tags: ['boards', 'edge-cases'],
    description: 'Boards edge cases'
});

// ============================================================================
// DEEP TESTS - Level 9: Heavy stress tests (> 30s)
// ============================================================================

registerTest('templates.test.js', {
    level: 9,
    tags: ['templates', 'boards'],
    description: 'Templates API (30609ms) - creates many boards'
});

registerTest('concurrency.test.js', {
    level: 9,
    tags: ['concurrency', 'stress', 'performance'],
    description: 'Concurrency tests (31997ms) - race conditions'
});

console.log(`📝 Registered ${require('./utils/testMeta').getAllTests().size} test files`);
