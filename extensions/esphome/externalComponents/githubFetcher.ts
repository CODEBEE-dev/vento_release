/**
 * GitHub Fetcher for ESPHome External Components
 *
 * Fetches content from GitHub repositories containing ESPHome components.
 * Supports multiple source formats:
 * - github://user/repo
 * - github://user/repo@ref
 * - { type: 'git', url: 'https://github.com/user/repo', ref: 'branch/tag/commit' }
 */

import { getLogger } from 'protobase';

const logger = getLogger();

export interface GitHubSource {
    type: 'github' | 'git';
    owner: string;
    repo: string;
    ref?: string;  // branch, tag, or commit hash
    path?: string; // subpath within repo
}

export interface FetchedFile {
    name: string;
    path: string;
    content: string;
    size: number;
    type: 'file' | 'dir';
}

export interface FetchedComponent {
    name: string;
    path: string;
    files: FetchedFile[];
    pythonConfig?: string;  // __init__.py content
    cppFiles?: FetchedFile[];
    headerFiles?: FetchedFile[];
}

export interface FetchedRepository {
    source: string;
    owner: string;
    repo: string;
    ref: string;
    defaultBranch: string;
    readme?: string;
    components: FetchedComponent[];
    examples: FetchedFile[];
    rawSource: GitHubSource;
}

/**
 * Parse an ESPHome external_components source string into structured format
 *
 * Supported formats:
 * - "github://user/repo"
 * - "github://user/repo@ref"
 * - "github://user/repo@ref/path"
 * - { type: 'git', url: 'https://github.com/user/repo', ref: 'xxx' }
 */
export function parseSource(source: string | object): GitHubSource {
    if (typeof source === 'object') {
        // Handle object format: { type: 'git', url: '...', ref: '...' }
        const obj = source as any;
        if (obj.type === 'git' && obj.url) {
            const match = obj.url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
            if (match) {
                return {
                    type: 'git',
                    owner: match[1],
                    repo: match[2].replace(/\.git$/, ''),
                    ref: obj.ref,
                    path: obj.path
                };
            }
        }
        throw new Error(`Unsupported source format: ${JSON.stringify(source)}`);
    }

    // Handle string format: "github://user/repo@ref/path"
    const githubMatch = source.match(/^github:\/\/([^\/]+)\/([^@\/]+)(?:@([^\/]+))?(?:\/(.+))?$/);
    if (githubMatch) {
        return {
            type: 'github',
            owner: githubMatch[1],
            repo: githubMatch[2],
            ref: githubMatch[3],
            path: githubMatch[4]
        };
    }

    // Handle direct GitHub URL
    const urlMatch = source.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
    if (urlMatch) {
        return {
            type: 'git',
            owner: urlMatch[1],
            repo: urlMatch[2].replace(/\.git$/, ''),
            ref: undefined
        };
    }

    throw new Error(`Cannot parse source: ${source}`);
}

/**
 * Fetch repository metadata from GitHub API
 */
async function fetchRepoMetadata(owner: string, repo: string): Promise<{ default_branch: string }> {
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const response = await fetch(url, {
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Vento-ESPHome-Fetcher'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch repo metadata: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Fetch directory contents from GitHub API
 */
async function fetchDirectoryContents(
    owner: string,
    repo: string,
    path: string,
    ref: string
): Promise<any[]> {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`;
    const response = await fetch(url, {
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Vento-ESPHome-Fetcher'
        }
    });

    if (!response.ok) {
        if (response.status === 404) {
            return [];
        }
        throw new Error(`Failed to fetch directory: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [data];
}

/**
 * Fetch raw file content from GitHub
 */
async function fetchRawFile(
    owner: string,
    repo: string,
    path: string,
    ref: string
): Promise<string> {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Vento-ESPHome-Fetcher'
        }
    });

    if (!response.ok) {
        if (response.status === 404) {
            return '';
        }
        throw new Error(`Failed to fetch file ${path}: ${response.status}`);
    }

    return response.text();
}

/**
 * Find ESPHome components directory in repository
 * ESPHome components can be in:
 * - /components/
 * - /esphome/components/
 * - /custom_components/
 * - root level (single component repo)
 */
async function findComponentsPath(
    owner: string,
    repo: string,
    ref: string,
    basePath?: string
): Promise<string[]> {
    const possiblePaths = basePath
        ? [basePath]
        : ['components', 'esphome/components', 'custom_components', ''];

    const foundPaths: string[] = [];

    for (const path of possiblePaths) {
        try {
            const contents = await fetchDirectoryContents(owner, repo, path, ref);
            if (contents.length > 0) {
                // Check if this directory contains component folders (has __init__.py)
                const hasComponents = contents.some(item =>
                    item.type === 'dir' ||
                    item.name === '__init__.py'
                );
                if (hasComponents) {
                    foundPaths.push(path);
                }
            }
        } catch (e) {
            // Path doesn't exist, continue
        }
    }

    return foundPaths;
}

/**
 * Fetch a single component's files
 */
async function fetchComponent(
    owner: string,
    repo: string,
    ref: string,
    componentPath: string,
    componentName: string
): Promise<FetchedComponent> {
    const files: FetchedFile[] = [];
    const cppFiles: FetchedFile[] = [];
    const headerFiles: FetchedFile[] = [];
    let pythonConfig: string | undefined;

    const contents = await fetchDirectoryContents(owner, repo, componentPath, ref);

    for (const item of contents) {
        if (item.type === 'file') {
            const content = await fetchRawFile(owner, repo, item.path, ref);
            const file: FetchedFile = {
                name: item.name,
                path: item.path,
                content,
                size: item.size,
                type: 'file'
            };

            files.push(file);

            if (item.name === '__init__.py') {
                pythonConfig = content;
            } else if (item.name.endsWith('.cpp') || item.name.endsWith('.c')) {
                cppFiles.push(file);
            } else if (item.name.endsWith('.h') || item.name.endsWith('.hpp')) {
                headerFiles.push(file);
            }
        }
    }

    return {
        name: componentName,
        path: componentPath,
        files,
        pythonConfig,
        cppFiles,
        headerFiles
    };
}

/**
 * Fetch example files from repository
 */
async function fetchExamples(
    owner: string,
    repo: string,
    ref: string
): Promise<FetchedFile[]> {
    const examples: FetchedFile[] = [];
    const possiblePaths = ['examples', 'example', 'yaml', ''];

    for (const basePath of possiblePaths) {
        try {
            const contents = await fetchDirectoryContents(owner, repo, basePath, ref);

            for (const item of contents) {
                if (item.type === 'file' && (item.name.endsWith('.yaml') || item.name.endsWith('.yml'))) {
                    // Skip if it's a config/CI file
                    if (item.name.startsWith('.') || item.name === 'ci.yaml') continue;

                    const content = await fetchRawFile(owner, repo, item.path, ref);
                    examples.push({
                        name: item.name,
                        path: item.path,
                        content,
                        size: item.size,
                        type: 'file'
                    });
                }
            }
        } catch (e) {
            // Path doesn't exist, continue
        }
    }

    return examples;
}

/**
 * Main function: Fetch complete repository information for ESPHome external component
 */
export async function fetchExternalComponent(
    source: string | object,
    options: {
        includeCode?: boolean;
        includeExamples?: boolean;
        specificComponents?: string[];
    } = {}
): Promise<FetchedRepository> {
    const {
        includeCode = true,
        includeExamples = true,
        specificComponents
    } = options;

    // Parse the source
    const parsed = parseSource(source);
    const { owner, repo, path } = parsed;

    logger.info({ owner, repo, ref: parsed.ref }, 'Fetching external component');

    // Get repo metadata to find default branch if ref not specified
    const metadata = await fetchRepoMetadata(owner, repo);
    const ref = parsed.ref || metadata.default_branch;

    // Fetch README
    let readme: string | undefined;
    for (const readmeName of ['README.md', 'readme.md', 'README.rst', 'README']) {
        readme = await fetchRawFile(owner, repo, readmeName, ref);
        if (readme) break;
    }

    // Find and fetch components
    const componentPaths = await findComponentsPath(owner, repo, ref, path);
    const components: FetchedComponent[] = [];

    for (const basePath of componentPaths) {
        const contents = await fetchDirectoryContents(owner, repo, basePath, ref);

        for (const item of contents) {
            // Each directory in components/ is potentially a component
            if (item.type === 'dir') {
                // Filter by specific components if provided
                if (specificComponents && !specificComponents.includes(item.name)) {
                    continue;
                }

                if (includeCode) {
                    const component = await fetchComponent(owner, repo, ref, item.path, item.name);
                    components.push(component);
                } else {
                    // Just include metadata without fetching all files
                    components.push({
                        name: item.name,
                        path: item.path,
                        files: []
                    });
                }
            } else if (item.name === '__init__.py' && basePath === '') {
                // Single component repo (component at root level)
                const component = await fetchComponent(owner, repo, ref, '', repo);
                components.push(component);
                break;
            }
        }
    }

    // Fetch examples
    const examples = includeExamples ? await fetchExamples(owner, repo, ref) : [];

    // Build source string for YAML
    const sourceString = parsed.ref
        ? `github://${owner}/${repo}@${parsed.ref}`
        : `github://${owner}/${repo}`;

    return {
        source: sourceString,
        owner,
        repo,
        ref,
        defaultBranch: metadata.default_branch,
        readme,
        components,
        examples,
        rawSource: parsed
    };
}

/**
 * Extract component configuration schema from __init__.py
 * This parses the ESPHome component's CONFIG_SCHEMA
 */
export function extractConfigSchema(pythonContent: string): object | null {
    // This is a simplified parser - ESPHome uses cv (config validation) module
    // Full parsing would require Python AST parsing

    const configSchemaMatch = pythonContent.match(/CONFIG_SCHEMA\s*=\s*(.+?)(?=\n\n|\n[A-Z]|\nasync\s|ndef\s)/s);
    if (!configSchemaMatch) return null;

    // Extract key configuration options
    const schema: Record<string, any> = {};

    // Find cv.Required and cv.Optional patterns
    const requiredMatches = pythonContent.matchAll(/cv\.Required\(([^)]+)\)/g);
    const optionalMatches = pythonContent.matchAll(/cv\.Optional\(([^)]+)\)/g);

    for (const match of requiredMatches) {
        const key = match[1].replace(/['"]/g, '').split(',')[0].trim();
        schema[key] = { required: true };
    }

    for (const match of optionalMatches) {
        const key = match[1].replace(/['"]/g, '').split(',')[0].trim();
        schema[key] = { required: false };
    }

    return Object.keys(schema).length > 0 ? schema : null;
}

/**
 * Generate ESPHome YAML external_components entry from fetched data
 */
export function generateExternalComponentYaml(
    fetched: FetchedRepository,
    componentNames?: string[]
): object {
    const entry: any = {
        source: fetched.rawSource.ref
            ? {
                type: 'git',
                url: `https://github.com/${fetched.owner}/${fetched.repo}`,
                ref: fetched.rawSource.ref
            }
            : `github://${fetched.owner}/${fetched.repo}`
    };

    // Add specific components if provided
    const components = componentNames || fetched.components.map(c => c.name);
    if (components.length > 0 && components.length < fetched.components.length) {
        entry.components = components;
    }

    return entry;
}
