/**
 * API Endpoints for ESPHome External Components
 *
 * Provides REST API to fetch, inspect, and manage external components
 * from GitHub repositories.
 */

import { handler, getServiceToken } from 'protonode';
import { getLogger } from 'protobase';
import {
    fetchExternalComponent,
    parseSource,
    extractConfigSchema,
    generateExternalComponentYaml,
    FetchedRepository
} from './githubFetcher';

const logger = getLogger();

// Simple in-memory cache with TTL
const cache = new Map<string, { data: FetchedRepository; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): FetchedRepository | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

function setCache(key: string, data: FetchedRepository): void {
    cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Register external components API routes
 */
export default function registerExternalComponentsApi(app: any, context: any) {
    const { mqtt, topicSub, topicPub } = context;

    /**
     * GET /api/v1/esphome/external-components/fetch
     *
     * Fetch information about an external component repository
     *
     * Query params:
     * - source: GitHub source (github://user/repo or full URL)
     * - includeCode: Include full source code (default: false)
     * - includeExamples: Include example YAML files (default: true)
     * - components: Comma-separated list of specific components to fetch
     * - refresh: Force refresh cache (default: false)
     *
     * Response:
     * {
     *   source: "github://user/repo",
     *   owner: "user",
     *   repo: "repo",
     *   ref: "main",
     *   readme: "# README content...",
     *   components: [...],
     *   examples: [...],
     *   externalComponentsYaml: { source: "..." }
     * }
     */
    app.get('/api/v1/esphome/external-components/fetch', handler(async (req: any, res: any) => {
        const {
            source,
            includeCode = 'false',
            includeExamples = 'true',
            components,
            refresh = 'false'
        } = req.query;

        if (!source) {
            return res.status(400).json({
                error: 'Missing required parameter: source',
                example: '/api/v1/esphome/external-components/fetch?source=github://muxa/esphome-state-machine'
            });
        }

        try {
            // Check cache first (unless refresh requested)
            const cacheKey = `${source}:${includeCode}:${includeExamples}:${components || ''}`;
            if (refresh !== 'true') {
                const cached = getCached(cacheKey);
                if (cached) {
                    logger.info({ source }, 'Returning cached external component data');
                    return res.json({
                        ...cached,
                        cached: true,
                        externalComponentsYaml: generateExternalComponentYaml(cached)
                    });
                }
            }

            // Parse specific components if provided
            const specificComponents = components
                ? components.split(',').map((c: string) => c.trim())
                : undefined;

            // Fetch from GitHub
            const result = await fetchExternalComponent(source, {
                includeCode: includeCode === 'true',
                includeExamples: includeExamples === 'true',
                specificComponents
            });

            // Cache the result
            setCache(cacheKey, result);

            // Add config schemas if code was fetched
            const componentsWithSchemas = result.components.map(comp => ({
                ...comp,
                configSchema: comp.pythonConfig
                    ? extractConfigSchema(comp.pythonConfig)
                    : null
            }));

            return res.json({
                ...result,
                components: componentsWithSchemas,
                cached: false,
                externalComponentsYaml: generateExternalComponentYaml(result)
            });

        } catch (error: any) {
            logger.error({ source, error: error.message }, 'Failed to fetch external component');
            return res.status(500).json({
                error: 'Failed to fetch external component',
                message: error.message,
                source
            });
        }
    }));

    /**
     * GET /api/v1/esphome/external-components/readme
     *
     * Fetch only the README of an external component repository
     * Lightweight endpoint for documentation display
     */
    app.get('/api/v1/esphome/external-components/readme', handler(async (req: any, res: any) => {
        const { source } = req.query;

        if (!source) {
            return res.status(400).json({ error: 'Missing required parameter: source' });
        }

        try {
            const result = await fetchExternalComponent(source, {
                includeCode: false,
                includeExamples: false
            });

            return res.json({
                source: result.source,
                readme: result.readme,
                components: result.components.map(c => c.name)
            });

        } catch (error: any) {
            return res.status(500).json({
                error: 'Failed to fetch README',
                message: error.message
            });
        }
    }));

    /**
     * GET /api/v1/esphome/external-components/examples
     *
     * Fetch example YAML files from a repository
     */
    app.get('/api/v1/esphome/external-components/examples', handler(async (req: any, res: any) => {
        const { source } = req.query;

        if (!source) {
            return res.status(400).json({ error: 'Missing required parameter: source' });
        }

        try {
            const result = await fetchExternalComponent(source, {
                includeCode: false,
                includeExamples: true
            });

            return res.json({
                source: result.source,
                examples: result.examples
            });

        } catch (error: any) {
            return res.status(500).json({
                error: 'Failed to fetch examples',
                message: error.message
            });
        }
    }));

    /**
     * POST /api/v1/esphome/external-components/parse-source
     *
     * Parse a source string and return structured information
     * Useful for validating source formats
     */
    app.post('/api/v1/esphome/external-components/parse-source', handler(async (req: any, res: any) => {
        const { source } = req.body;

        if (!source) {
            return res.status(400).json({ error: 'Missing required field: source' });
        }

        try {
            const parsed = parseSource(source);
            return res.json({
                valid: true,
                parsed,
                githubUrl: `https://github.com/${parsed.owner}/${parsed.repo}`,
                esphomeSource: parsed.ref
                    ? `github://${parsed.owner}/${parsed.repo}@${parsed.ref}`
                    : `github://${parsed.owner}/${parsed.repo}`
            });

        } catch (error: any) {
            return res.status(400).json({
                valid: false,
                error: error.message,
                supportedFormats: [
                    'github://user/repo',
                    'github://user/repo@ref',
                    'https://github.com/user/repo',
                    '{ type: "git", url: "https://github.com/user/repo", ref: "..." }'
                ]
            });
        }
    }));

    /**
     * GET /api/v1/esphome/external-components/component/:owner/:repo/:component
     *
     * Fetch a specific component's code from a repository
     */
    app.get('/api/v1/esphome/external-components/component/:owner/:repo/:component', handler(async (req: any, res: any) => {
        const { owner, repo, component } = req.params;
        const { ref } = req.query;

        const source = ref
            ? `github://${owner}/${repo}@${ref}`
            : `github://${owner}/${repo}`;

        try {
            const result = await fetchExternalComponent(source, {
                includeCode: true,
                includeExamples: false,
                specificComponents: [component]
            });

            const comp = result.components.find(c => c.name === component);

            if (!comp) {
                return res.status(404).json({
                    error: 'Component not found',
                    component,
                    availableComponents: result.components.map(c => c.name)
                });
            }

            return res.json({
                source: result.source,
                component: comp,
                configSchema: comp.pythonConfig
                    ? extractConfigSchema(comp.pythonConfig)
                    : null,
                externalComponentsYaml: generateExternalComponentYaml(result, [component])
            });

        } catch (error: any) {
            return res.status(500).json({
                error: 'Failed to fetch component',
                message: error.message
            });
        }
    }));

    /**
     * GET /api/v1/esphome/external-components/list-known
     *
     * List known/curated external components
     * This can be extended to read from a config file or database
     */
    app.get('/api/v1/esphome/external-components/list-known', handler(async (req: any, res: any) => {
        // Known external components registry
        // This could be moved to a config file or database
        const knownComponents = [
            {
                name: 'State Machine',
                source: 'github://muxa/esphome-state-machine',
                description: 'Finite state machine for complex automations',
                category: 'automation',
                components: ['state_machine']
            },
            {
                name: 'Protofy Components',
                source: 'github://Protofy-xyz/esphome-components',
                description: 'Custom components from Protofy',
                category: 'various',
                components: ['esp32', 'pca9632', 'mux', 'network', 'modem', 'mcp9801']
            },
            {
                name: 'ESPHome Ratgdo',
                source: 'github://ratgdo/esphome-ratgdo',
                description: 'Garage door opener integration',
                category: 'cover',
                components: ['ratgdo']
            },
            {
                name: 'M5Stack Components',
                source: 'github://esphome/esphome-m5stack',
                description: 'M5Stack device support',
                category: 'hardware',
                components: ['m5stack']
            }
        ];

        return res.json({
            components: knownComponents,
            total: knownComponents.length
        });
    }));

    /**
     * POST /api/v1/esphome/external-components/generate-yaml
     *
     * Generate the external_components YAML section for given sources
     */
    app.post('/api/v1/esphome/external-components/generate-yaml', handler(async (req: any, res: any) => {
        const { sources } = req.body;

        if (!sources || !Array.isArray(sources)) {
            return res.status(400).json({
                error: 'Missing required field: sources (array)',
                example: {
                    sources: [
                        { source: 'github://muxa/esphome-state-machine' },
                        { source: 'github://Protofy-xyz/esphome-components', components: ['pca9632', 'mux'] }
                    ]
                }
            });
        }

        try {
            const yamlEntries = await Promise.all(
                sources.map(async (entry: any) => {
                    const parsed = parseSource(entry.source);
                    const result: any = {
                        source: entry.source.includes('@') || (typeof entry.source === 'object')
                            ? {
                                type: 'git',
                                url: `https://github.com/${parsed.owner}/${parsed.repo}`,
                                ...(parsed.ref && { ref: parsed.ref })
                            }
                            : entry.source
                    };

                    if (entry.components && entry.components.length > 0) {
                        result.components = entry.components;
                    }

                    if (entry.refresh !== undefined) {
                        result.refresh = entry.refresh;
                    }

                    return result;
                })
            );

            return res.json({
                external_components: yamlEntries
            });

        } catch (error: any) {
            return res.status(400).json({
                error: 'Failed to generate YAML',
                message: error.message
            });
        }
    }));

    logger.info('External components API registered');
}
