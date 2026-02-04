import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { registerDBProvider, ProtoDB, getRoot } from 'protonode';
import * as fspath from 'path';

// __BUNDLED__ is defined by esbuild at build time
declare const __BUNDLED__: boolean | undefined;
const isBundled = typeof __BUNDLED__ !== 'undefined' && __BUNDLED__;

const extensionsPath = '../../extensions';
const dirPath = fspath.join(getRoot(), "/data/settings/")

// Static providers will be populated at runtime in bundled mode
let staticProviders: Record<string, typeof ProtoDB> | null = null;

// Load static providers (only in bundled mode)
async function getStaticProviders(): Promise<Record<string, typeof ProtoDB>> {
    if (staticProviders === null) {
        if (isBundled) {
            // Dynamic import that esbuild will bundle
            const { ProtoSqliteDB } = await import('@extensions/sqlite/dbProvider');
            staticProviders = {
                'sqlite': ProtoSqliteDB,
            };
        } else {
            staticProviders = {};
        }
    }
    return staticProviders;
}

function findModule(baseDir: string): string | null {
    const fullPath = path.join(baseDir, `dbProvider.ts`);
    if (fs.existsSync(fullPath)) return fullPath;
    return null;
}

export default async function loadDBProvider(customProvider?: string): Promise<boolean> {

    const dbProviderConfigPath = fspath.join(dirPath, 'DB_PROVIDER');
    let providerName: string;

    try {
        const dbProviderConfigContent = await fs.promises.readFile(dbProviderConfigPath, 'utf8');
        providerName = JSON.parse(dbProviderConfigContent)
    } catch {
        providerName = 'sqlite'; // Default db provider if no config
    }
    providerName = customProvider ?? providerName;

    // Try static provider first (for bundled production mode)
    const providers = await getStaticProviders();
    if (providers[providerName]) {
        const protoDB = providers[providerName];
        console.log(`Using bundled DB provider: ${providerName}`);

        registerDBProvider({
            initDB: (...args: any[]) => (protoDB as any).initDB?.(...args),
            connect: (...args: any[]) => (protoDB as any).connect?.(...args),
            closeDBS: () => (protoDB as any).closeDBS?.(),
        });

        return true;
    }

    // Fall back to dynamic loading (for development or custom providers)
    const fullPath = findModule(path.join(extensionsPath, providerName));
    if (!fullPath) {
        console.warn(`${providerName}/dbProvider not found`);
        return false;
    }

    try {
        const providerModule = await import(pathToFileURL(fullPath).href);
        const protoDB: any = Object.values(providerModule).find(
            (value: any) => typeof value === 'function' && value.prototype instanceof ProtoDB
        );

        if (!protoDB) {
            console.warn(`${providerName}/dbProvider doesn't export a ProtoDB class`);
            return false;
        }

        registerDBProvider({
            initDB: (...args: any[]) => protoDB.initDB?.(...args),
            connect: (...args: any[]) => protoDB.connect?.(...args),
            closeDBS: () => protoDB.closeDBS?.(),
        });

        return true;
    } catch (e) {
        console.error(`Error loading DB provider ${providerName}:`, e);
        return false;
    }
}
