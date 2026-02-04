/**
 * Test Metadata System
 *
 * Provides a way to annotate test files with:
 * - level: 0-9 (0=fastest/most basic, 9=slowest/deepest)
 * - tags: array of string labels for categorization
 *
 * Level categories:
 * - quick: level <= 3 (fast, basic smoke tests)
 * - system: level <= 7 (standard system tests)
 * - deep: level >= 7 (deep, exhaustive tests including stress/edge cases)
 */

// Global registry of test metadata
const testRegistry = new Map();

/**
 * Register metadata for a test file
 * @param {string} filename - The test filename (e.g., 'boards.test.js')
 * @param {object} meta - Metadata object
 * @param {number} meta.level - Test level 0-9
 * @param {string[]} meta.tags - Array of tags
 * @param {string} [meta.description] - Optional description
 */
function registerTest(filename, meta) {
    if (typeof meta.level !== 'number' || meta.level < 0 || meta.level > 9) {
        throw new Error(`Invalid test level for ${filename}: must be 0-9`);
    }
    if (!Array.isArray(meta.tags)) {
        throw new Error(`Invalid tags for ${filename}: must be an array`);
    }
    testRegistry.set(filename, {
        level: meta.level,
        tags: meta.tags,
        description: meta.description || ''
    });
}

/**
 * Get metadata for a test file
 * @param {string} filename
 * @returns {object|null}
 */
function getTestMeta(filename) {
    return testRegistry.get(filename) || null;
}

/**
 * Get all registered tests
 * @returns {Map}
 */
function getAllTests() {
    return testRegistry;
}

/**
 * Filter tests by level and/or tags
 * @param {object} filters
 * @param {number} [filters.maxLevel] - Maximum level to include
 * @param {number} [filters.minLevel] - Minimum level to include
 * @param {string[]} [filters.tags] - Tags to match (OR logic)
 * @param {string[]} [filters.excludeTags] - Tags to exclude
 * @returns {string[]} Array of matching test filenames
 */
function filterTests(filters = {}) {
    const results = [];

    for (const [filename, meta] of testRegistry) {
        // Level filters
        if (filters.maxLevel !== undefined && meta.level > filters.maxLevel) {
            continue;
        }
        if (filters.minLevel !== undefined && meta.level < filters.minLevel) {
            continue;
        }

        // Tag filters (OR logic - match any)
        if (filters.tags && filters.tags.length > 0) {
            const hasMatchingTag = filters.tags.some(tag => meta.tags.includes(tag));
            if (!hasMatchingTag) {
                continue;
            }
        }

        // Exclude tags
        if (filters.excludeTags && filters.excludeTags.length > 0) {
            const hasExcludedTag = filters.excludeTags.some(tag => meta.tags.includes(tag));
            if (hasExcludedTag) {
                continue;
            }
        }

        results.push(filename);
    }

    return results;
}

/**
 * Get level range for a profile
 * @param {'quick'|'system'|'deep'} profile
 * @returns {{minLevel?: number, maxLevel?: number}}
 */
function getProfileLevels(profile) {
    switch (profile) {
        case 'quick':
            return { maxLevel: 3 };
        case 'system':
            return { maxLevel: 7 };
        case 'deep':
            return { minLevel: 7 };
        default:
            return {};
    }
}

module.exports = {
    registerTest,
    getTestMeta,
    getAllTests,
    filterTests,
    getProfileLevels
};
