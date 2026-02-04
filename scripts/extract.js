/*
    Extracts compiled vento to a given folder

    This script discovers what to copy by looking for extract.json files
    throughout the repository. Each extract.json defines what to copy
    from its directory.

    Files ignored by .gitignore are automatically excluded.
*/

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

// Directories to skip when searching for extract.json files
const SKIP_DIRECTORIES = [
    '.git',
    '.claude',
    'node_modules',
    '.next',
    '.turbo',
    'dist',
    'build',
    'out'
];

// Files that should never be copied
const NEVER_COPY = [
    'AGENTS.md',
    'CLAUDE.md',
    'extract.json'
];

// Files to always include even if in .gitignore (relative paths from repo root)
const ALWAYS_INCLUDE = [
    'apps/vento/addUser.js'
];

// Packages to remove from dependencies when cleaning package.json
const PACKAGES_TO_REMOVE = [
    'app',
    '@my/ui',
    '@my/config',
    'protolib',
    'protoflow',
    'visualui',
    'ui',
    'adminpanel',
    'chat',
    'docs',
    'launcher'
];

// Workspace patterns to remove from dependencies
const WORKSPACE_PATTERNS_TO_REMOVE = [
    /^workspace:/
];

// ============================================================================
// GITIGNORE PARSER
// ============================================================================

function parseGitignore(gitignorePath) {
    if (!fs.existsSync(gitignorePath)) {
        return [];
    }

    const content = fs.readFileSync(gitignorePath, 'utf-8');
    const rules = [];

    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        rules.push(trimmed);
    }

    return rules;
}

function gitignorePatternToRegex(pattern) {
    let negated = false;
    let p = pattern;

    if (p.startsWith('!')) {
        negated = true;
        p = p.slice(1);
    }

    // Remove leading slash (anchors to root)
    const anchored = p.startsWith('/');
    if (anchored) {
        p = p.slice(1);
    }

    // Remove trailing slash (directory indicator)
    if (p.endsWith('/')) {
        p = p.slice(0, -1);
    }

    // Escape regex special chars except * and ?
    let regex = p
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '<<<GLOBSTAR>>>')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]')
        .replace(/<<<GLOBSTAR>>>/g, '.*');

    // If not anchored and no slash in pattern, match anywhere
    if (!anchored && !pattern.includes('/')) {
        regex = '(^|.*/)'+ regex;
    } else {
        regex = '^' + regex;
    }

    // Match the path exactly or as a prefix (for directories)
    regex = regex + '($|/.*)';

    return { regex: new RegExp(regex), negated };
}

function isIgnoredByGitignore(filePath, rules) {
    let ignored = false;

    for (const rule of rules) {
        const { regex, negated } = gitignorePatternToRegex(rule);
        if (regex.test(filePath)) {
            ignored = !negated;
        }
    }

    return ignored;
}

function matchesPattern(filePath, patterns) {
    if (!patterns || patterns.length === 0) {
        return false;
    }

    // Normalize to forward slashes for comparison
    const normalizedPath = filePath.replace(/\\/g, '/');

    for (const pattern of patterns) {
        if (normalizedPath === pattern || normalizedPath.startsWith(pattern + '/')) {
            return true;
        }
    }

    return false;
}

// ============================================================================
// HELPERS
// ============================================================================

function findExtractJsonFiles(dir, results = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (!SKIP_DIRECTORIES.includes(entry.name)) {
                findExtractJsonFiles(fullPath, results);
            }
        } else if (entry.name === 'extract.json') {
            results.push(fullPath);
        }
    }

    return results;
}

function expandGlob(pattern, baseDir) {
    const files = [];

    if (pattern.includes('*')) {
        const parts = pattern.split('/');
        let currentDir = baseDir;
        let globPart = null;
        let prefix = [];

        for (let i = 0; i < parts.length; i++) {
            if (parts[i].includes('*')) {
                globPart = parts[i];
                break;
            }
            prefix.push(parts[i]);
            currentDir = path.join(currentDir, parts[i]);
        }

        if (!fs.existsSync(currentDir)) {
            return files;
        }

        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        const regex = new RegExp('^' + globPart.replace(/\*/g, '.*') + '$');

        for (const entry of entries) {
            if (regex.test(entry.name)) {
                const relativePath = prefix.length > 0
                    ? path.join(...prefix, entry.name)
                    : entry.name;

                if (entry.isDirectory()) {
                    // Recursively get all files in directory
                    const subFiles = getAllFiles(path.join(currentDir, entry.name));
                    for (const subFile of subFiles) {
                        files.push(path.join(relativePath, subFile));
                    }
                } else {
                    files.push(relativePath);
                }
            }
        }
    } else {
        const fullPath = path.join(baseDir, pattern);
        if (fs.existsSync(fullPath)) {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                const subFiles = getAllFiles(fullPath);
                for (const subFile of subFiles) {
                    files.push(path.join(pattern, subFile));
                }
            } else {
                files.push(pattern);
            }
        }
    }

    return files;
}

function getAllFiles(dir, relativeTo = dir) {
    const files = [];

    if (!fs.existsSync(dir)) {
        return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(relativeTo, fullPath);

        if (entry.isDirectory()) {
            if (!SKIP_DIRECTORIES.includes(entry.name)) {
                files.push(...getAllFiles(fullPath, relativeTo));
            }
        } else {
            if (!NEVER_COPY.includes(entry.name)) {
                files.push(relativePath);
            }
        }
    }

    return files;
}

// Workspaces to keep in the extracted package.json
const EXTRACTED_WORKSPACES = [
    'apps/mcp',
    'apps/vento',
    'apps/dendrite',
    'apps/agent',
    'packages/protobase',
    'packages/protonode',
    'scripts',
    'data/automations'
];

function collectExtensionDependencies(sourceFolder) {
    const extensionsDir = path.join(sourceFolder, 'extensions');
    const collectedDeps = {};

    if (!fs.existsSync(extensionsDir)) {
        return collectedDeps;
    }

    const entries = fs.readdirSync(extensionsDir, { withFileTypes: true });

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const pkgPath = path.join(extensionsDir, entry.name, 'package.json');
        if (!fs.existsSync(pkgPath)) continue;

        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

            if (pkg.dependencies) {
                for (const [dep, version] of Object.entries(pkg.dependencies)) {
                    // Skip packages to remove and workspace references
                    if (PACKAGES_TO_REMOVE.includes(dep)) continue;
                    if (WORKSPACE_PATTERNS_TO_REMOVE.some(pattern => pattern.test(version))) continue;

                    // Add to collected (first one wins if duplicates)
                    if (!collectedDeps[dep]) {
                        collectedDeps[dep] = version;
                    }
                }
            }
        } catch (e) {
            // Skip invalid package.json
        }
    }

    return collectedDeps;
}

function cleanPackageJson(content, fullClean = false, extensionDeps = {}) {
    const pkg = JSON.parse(content);

    // Always remove devDependencies
    delete pkg.devDependencies;

    // Replace build/package scripts with dummy if they exist
    if (pkg.scripts) {
        if (pkg.scripts.build) {
            pkg.scripts.build = 'echo "Already built"';
        }
        if (pkg.scripts.package) {
            pkg.scripts.package = 'echo "Already packaged"';
        }
    }

    // Full clean: also remove workspace dependencies and replace workspaces
    if (fullClean) {
        if (pkg.dependencies) {
            for (const dep of Object.keys(pkg.dependencies)) {
                const shouldRemove = PACKAGES_TO_REMOVE.includes(dep) ||
                    WORKSPACE_PATTERNS_TO_REMOVE.some(pattern => pattern.test(pkg.dependencies[dep]));

                if (shouldRemove) {
                    delete pkg.dependencies[dep];
                }
            }
        }

        // Add collected extension dependencies (existing deps take priority)
        pkg.dependencies = { ...extensionDeps, ...pkg.dependencies };

        // Replace workspaces with extracted subset
        pkg.workspaces = EXTRACTED_WORKSPACES;
    }

    return JSON.stringify(pkg, null, 2);
}

function copyFile(src, dest, fullClean = false, extensionDeps = {}) {
    const destDir = path.dirname(dest);

    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    // Always clean package.json (remove devDependencies), apply full clean if requested
    if (path.basename(src) === 'package.json') {
        const content = fs.readFileSync(src, 'utf-8');
        fs.writeFileSync(dest, cleanPackageJson(content, fullClean, extensionDeps));
    } else {
        fs.copyFileSync(src, dest);
    }
}

function shouldCopyFile(filePath) {
    const basename = path.basename(filePath);
    return !NEVER_COPY.includes(basename);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    const args = process.argv.slice(2);
    const forceFlag = args.includes('--force') || args.includes('-f');
    const targetArg = args.find(arg => !arg.startsWith('-'));

    if (!targetArg) {
        console.error('Usage: node extract.js <target-folder> [--force]');
        console.error('');
        console.error('Options:');
        console.error('  --force, -f    Delete target folder without asking if it exists');
        process.exit(1);
    }

    const targetFolder = path.resolve(targetArg);
    const sourceFolder = path.resolve(__dirname, '..');

    console.log(`Extracting Vento from: ${sourceFolder}`);
    console.log(`                   to: ${targetFolder}`);
    console.log('');

    // Parse .gitignore
    const gitignoreRules = parseGitignore(path.join(sourceFolder, '.gitignore'));
    console.log(`Loaded ${gitignoreRules.length} gitignore rules`);

    // Collect dependencies from extensions/*
    const extensionDeps = collectExtensionDependencies(sourceFolder);
    console.log(`Collected ${Object.keys(extensionDeps).length} dependencies from extensions`);

    // Check if target exists
    if (fs.existsSync(targetFolder)) {
        if (forceFlag) {
            console.log('Target folder exists, removing (--force)...');
            fs.rmSync(targetFolder, { recursive: true, force: true });
        } else {
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await new Promise(resolve => {
                rl.question('Target folder exists. Delete it? (y/N): ', resolve);
            });
            rl.close();

            if (answer.toLowerCase() !== 'y') {
                console.log('Aborted.');
                process.exit(0);
            }

            console.log('Removing existing target folder...');
            fs.rmSync(targetFolder, { recursive: true, force: true });
        }
    }

    // Create target folder
    fs.mkdirSync(targetFolder, { recursive: true });

    // Find all extract.json files
    console.log('Searching for extract.json files...');
    const extractFiles = findExtractJsonFiles(sourceFolder);
    console.log(`Found ${extractFiles.length} extract.json files`);
    console.log('');

    // Process each extract.json
    for (const extractFile of extractFiles) {
        const extractDir = path.dirname(extractFile);
        const relativeDir = path.relative(sourceFolder, extractDir);
        const config = JSON.parse(fs.readFileSync(extractFile, 'utf-8'));

        console.log(`Processing: ${relativeDir || '(root)'}`);

        // Create directories specified in mkdir
        if (config.mkdir) {
            for (const dir of config.mkdir) {
                const targetDir = path.join(targetFolder, relativeDir, dir);
                console.log(`  mkdir: ${dir}`);
                fs.mkdirSync(targetDir, { recursive: true });
            }
        }

        // Copy files
        if (config.files) {
            for (const pattern of config.files) {
                const expandedFiles = expandGlob(pattern, extractDir);

                for (const file of expandedFiles) {
                    if (!shouldCopyFile(file)) {
                        continue;
                    }

                    // Build full relative path from repo root for gitignore check
                    // Normalize to forward slashes for gitignore matching (Windows uses backslashes)
                    const fullRelativePath = (relativeDir ? path.join(relativeDir, file) : file).replace(/\\/g, '/');

                    // Check explicit excludes first
                    if (matchesPattern(file, config.exclude)) {
                        continue;
                    }

                    // Check gitignore only if useGitignore is enabled for this extract.json
                    // But allow files that match include patterns or are in ALWAYS_INCLUDE
                    const isAlwaysIncluded = ALWAYS_INCLUDE.includes(fullRelativePath);
                    if (config.useGitignore &&
                        isIgnoredByGitignore(fullRelativePath, gitignoreRules) &&
                        !matchesPattern(file, config.include) &&
                        !isAlwaysIncluded) {
                        continue;
                    }

                    const srcPath = path.join(extractDir, file);
                    const destPath = path.join(targetFolder, relativeDir, file);

                    console.log(`  copy: ${file}`);
                    copyFile(srcPath, destPath, config.cleanPackageJson, extensionDeps);
                }
            }
        }
    }

    // Generate virtual extension with all viewLibs concatenated
    console.log('');
    console.log('Generating virtual extension with viewLibs...');
    const extensionsDir = path.join(sourceFolder, 'extensions');
    let viewLibContent = '';
    let viewLibCount = 0;

    if (fs.existsSync(extensionsDir)) {
        const extEntries = fs.readdirSync(extensionsDir, { withFileTypes: true });
        for (const entry of extEntries) {
            if (!entry.isDirectory()) continue;
            const viewLibPath = path.join(extensionsDir, entry.name, 'viewLib.js');
            if (fs.existsSync(viewLibPath)) {
                const content = fs.readFileSync(viewLibPath, 'utf-8');
                viewLibContent += `// From extension: ${entry.name}\n`;
                viewLibContent += content + '\n\n';
                viewLibCount++;
                console.log(`  included: ${entry.name}/viewLib.js`);
            }
        }
    }

    if (viewLibCount > 0) {
        const ventoExtDir = path.join(targetFolder, 'extensions', 'vento');
        fs.mkdirSync(ventoExtDir, { recursive: true });
        fs.writeFileSync(path.join(ventoExtDir, 'viewLib.js'), viewLibContent);
        console.log(`Generated extensions/vento/viewLib.js with ${viewLibCount} viewLibs`);
    } else {
        console.log('No viewLib.js files found in extensions');
    }

    console.log('');
    console.log('Extraction complete!');
    console.log(`Output: ${targetFolder}`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
