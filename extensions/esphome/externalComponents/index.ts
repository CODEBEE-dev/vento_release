/**
 * External Components Module
 *
 * Provides infrastructure for fetching, inspecting, and managing
 * ESPHome external components from GitHub repositories.
 *
 * Usage:
 * - API endpoints for fetching component info
 * - GitHub fetcher for downloading repos
 * - Config schema extraction from Python code
 */

export {
    fetchExternalComponent,
    parseSource,
    extractConfigSchema,
    generateExternalComponentYaml,
    type GitHubSource,
    type FetchedFile,
    type FetchedComponent,
    type FetchedRepository
} from './githubFetcher';

export { default as registerExternalComponentsApi } from './coreApis';
