#!/usr/bin/env node
/**
 * Vento Test Runner
 *
 * A flexible test runner that supports filtering by level and tags.
 *
 * Usage:
 *   node tests/runner.js [options]
 *
 * Options:
 *   --quick           Run quick tests (level <= 3)
 *   --system          Run system tests (level <= 7)
 *   --deep            Run deep tests (level >= 7)
 *   --level=N         Run tests at exactly level N
 *   --max-level=N     Run tests with level <= N
 *   --min-level=N     Run tests with level >= N
 *   --tags=a,b,c      Run tests matching any of these tags
 *   --exclude-tags=x  Exclude tests with these tags
 *   --list            List tests and their metadata (don't run)
 *   --verbose         Show more details
 *   --help            Show this help
 *
 * Examples:
 *   node tests/runner.js --quick
 *   node tests/runner.js --tags=boards,auth
 *   node tests/runner.js --max-level=5 --tags=concurrency
 *   node tests/runner.js --list
 */

require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { filterTests, getProfileLevels, getAllTests } = require('./utils/testMeta');

// Load all test registrations
require('./registry');

const args = process.argv.slice(2);

function parseArgs(args) {
    const options = {
        quick: false,
        system: false,
        deep: false,
        level: null,
        maxLevel: null,
        minLevel: null,
        tags: [],
        excludeTags: [],
        list: false,
        verbose: false,
        help: false,
        testPattern: null,
    };

    for (const arg of args) {
        if (arg === '--quick') options.quick = true;
        else if (arg === '--system') options.system = true;
        else if (arg === '--deep') options.deep = true;
        else if (arg === '--list') options.list = true;
        else if (arg === '--verbose') options.verbose = true;
        else if (arg === '--help' || arg === '-h') options.help = true;
        else if (arg.startsWith('--level=')) options.level = parseInt(arg.split('=')[1], 10);
        else if (arg.startsWith('--max-level=')) options.maxLevel = parseInt(arg.split('=')[1], 10);
        else if (arg.startsWith('--min-level=')) options.minLevel = parseInt(arg.split('=')[1], 10);
        else if (arg.startsWith('--tags=')) options.tags = arg.split('=')[1].split(',').map(t => t.trim());
        else if (arg.startsWith('--exclude-tags=')) options.excludeTags = arg.split('=')[1].split(',').map(t => t.trim());
        else if (arg.startsWith('--test-name-pattern=')) options.testPattern = arg.split('=')[1];
        else if (!arg.startsWith('--')) {
            // Positional argument - could be a file glob
        }
    }

    return options;
}

function showHelp() {
    console.log(`
Vento Test Runner

Usage:
  node tests/runner.js [options]
  yarn test:quick
  yarn test:system
  yarn test:deep

Profile shortcuts:
  --quick           Run quick tests (level <= 3) - fast smoke tests
  --system          Run system tests (level <= 7) - standard validation
  --deep            Run deep tests (level >= 7) - stress & edge cases

Level filters:
  --level=N         Run tests at exactly level N (0-9)
  --max-level=N     Run tests with level <= N
  --min-level=N     Run tests with level >= N

Tag filters:
  --tags=a,b,c      Run tests matching ANY of these tags (OR logic)
  --exclude-tags=x  Exclude tests with these tags

Other options:
  --list            List tests and their metadata (don't run)
  --verbose         Show more details about test selection
  --help            Show this help

Test levels guide:
  0-1: Smoke tests (basic health checks)
  2-3: Quick tests (fast, essential validations)
  4-5: Standard tests (normal functionality)
  6-7: Extended tests (edge cases, error handling)
  8-9: Deep tests (stress, performance, concurrency)

Common tags:
  boards, auth, users, settings, concurrency, performance,
  security, files, crud, edge-cases, stress

Examples:
  yarn test:quick                    # Fast smoke tests for rapid feedback
  yarn test:system                   # Standard tests for validation
  yarn test:deep                     # Exhaustive tests before release
  node tests/runner.js --tags=boards # Only board-related tests
  node tests/runner.js --max-level=5 --tags=auth  # Auth tests up to level 5
  node tests/runner.js --list        # See all registered tests
`);
}

function listTests(options) {
    const allTests = getAllTests();

    // Build filters
    const filters = {};
    if (options.quick) Object.assign(filters, getProfileLevels('quick'));
    else if (options.system) Object.assign(filters, getProfileLevels('system'));
    else if (options.deep) Object.assign(filters, getProfileLevels('deep'));

    if (options.level !== null) {
        filters.minLevel = options.level;
        filters.maxLevel = options.level;
    }
    if (options.maxLevel !== null) filters.maxLevel = options.maxLevel;
    if (options.minLevel !== null) filters.minLevel = options.minLevel;
    if (options.tags.length > 0) filters.tags = options.tags;
    if (options.excludeTags.length > 0) filters.excludeTags = options.excludeTags;

    const matchingTests = Object.keys(filters).length > 0
        ? filterTests(filters)
        : Array.from(allTests.keys());

    console.log('\n=== Registered Tests ===\n');
    console.log('Level | Tags                           | File');
    console.log('-'.repeat(70));

    // Sort by level, then by filename
    const sortedTests = Array.from(allTests.entries())
        .sort((a, b) => a[1].level - b[1].level || a[0].localeCompare(b[0]));

    for (const [filename, meta] of sortedTests) {
        const isMatch = matchingTests.includes(filename);
        const marker = isMatch ? '✓' : ' ';
        const tagsStr = meta.tags.join(', ').substring(0, 30).padEnd(30);
        console.log(`  ${meta.level}   | ${tagsStr} | ${marker} ${filename}`);
    }

    console.log('-'.repeat(70));
    console.log(`Total: ${allTests.size} tests, ${matchingTests.length} matching filters\n`);

    if (Object.keys(filters).length > 0) {
        console.log('Active filters:', JSON.stringify(filters, null, 2));
    }
}

async function runTests(options) {
    // Build filters
    const filters = {};

    if (options.quick) {
        Object.assign(filters, getProfileLevels('quick'));
        console.log('🚀 Running QUICK tests (level <= 3)');
    } else if (options.system) {
        Object.assign(filters, getProfileLevels('system'));
        console.log('🔧 Running SYSTEM tests (level <= 7)');
    } else if (options.deep) {
        Object.assign(filters, getProfileLevels('deep'));
        console.log('🔬 Running DEEP tests (level >= 7)');
    }

    if (options.level !== null) {
        filters.minLevel = options.level;
        filters.maxLevel = options.level;
    }
    if (options.maxLevel !== null) filters.maxLevel = options.maxLevel;
    if (options.minLevel !== null) filters.minLevel = options.minLevel;
    if (options.tags.length > 0) {
        filters.tags = options.tags;
        console.log(`🏷️  Filtering by tags: ${options.tags.join(', ')}`);
    }
    if (options.excludeTags.length > 0) {
        filters.excludeTags = options.excludeTags;
        console.log(`🚫 Excluding tags: ${options.excludeTags.join(', ')}`);
    }

    // Get matching test files
    const matchingTests = Object.keys(filters).length > 0
        ? filterTests(filters)
        : Array.from(getAllTests().keys());

    if (matchingTests.length === 0) {
        console.log('\n❌ No tests match the specified filters.');
        process.exit(1);
    }

    // Convert to full paths
    const testDir = path.join(__dirname, 'suites');
    const templatesDir = path.join(__dirname, 'templates', 'boards');

    const testFiles = matchingTests.map(filename => {
        const suitePath = path.join(testDir, filename);
        if (fs.existsSync(suitePath)) return suitePath;

        const templatePath = path.join(templatesDir, filename);
        if (fs.existsSync(templatePath)) return templatePath;

        console.warn(`Warning: Test file not found: ${filename}`);
        return null;
    }).filter(Boolean);

    if (testFiles.length === 0) {
        console.log('\n❌ No test files found.');
        process.exit(1);
    }

    console.log(`\n📋 Running ${testFiles.length} test file(s):\n`);
    if (options.verbose) {
        testFiles.forEach(f => console.log(`   - ${path.basename(f)}`));
        console.log('');
    }

    // Build node test command
    const nodeArgs = [
        '--require', path.join(__dirname, 'index.js'),
        '--test',
        '--test-concurrency=1',
        ...testFiles
    ];

    if (options.testPattern) {
        nodeArgs.push(`--test-name-pattern=${options.testPattern}`);
    }

    // Run tests
    const child = spawn('node', nodeArgs, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
    });

    child.on('close', (code) => {
        process.exit(code);
    });
}

// Main
const options = parseArgs(args);

if (options.help) {
    showHelp();
    process.exit(0);
}

if (options.list) {
    require('./registry'); // Ensure all tests are registered
    listTests(options);
    process.exit(0);
}

// Validate environment
if (!process.env.TOKEN_SECRET) {
    console.error('ERROR: TOKEN_SECRET not found in .env');
    console.error('Make sure Vento has been started at least once.');
    process.exit(1);
}

runTests(options);
