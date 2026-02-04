import fs from 'fs';

// __BUNDLED__ is defined by esbuild at build time
declare const __BUNDLED__: boolean | undefined;
const isBundled = typeof __BUNDLED__ !== 'undefined' && __BUNDLED__;

const extensionsPath = '../../extensions';

// Development mode: discover and load contexts dynamically
function loadContextsDynamic(): Record<string, any> {
    const contexts: Record<string, any> = {};
    const folders = fs.readdirSync(extensionsPath);

    for (const folder of folders) {
        const tryPaths = [
            `@extensions/${folder}/coreContext`,
        ];

        for (const tryPath of tryPaths) {
            try {
                const mod = require(tryPath);
                console.log(`${tryPath} provides context:`);
                const content = mod.default || mod;
                contexts[folder] = content;
                Object.keys(content).forEach((key) => {
                    console.log("\tcontext." + folder + '.' + key)
                });
                break;
            } catch (err: any) {
                if (!err.message.includes(tryPath)) {
                    console.error(`Error loading ${tryPath}:`, err);
                }
            }
        }
    }

    return contexts;
}

// Production mode: load bundled contexts synchronously using require()
function loadContextsStatic(): Record<string, any> {
    let bundledCoreContext;
    try {
        bundledCoreContext = require('@generated/bundledCoreContext').bundledCoreContext;
    } catch (err: any) {
        console.warn('[coreContext] Failed to load bundled core contexts:', err?.message || err);
        return {};
    }

    // Log what we're loading
    Object.keys(bundledCoreContext).forEach(folder => {
        const content = bundledCoreContext[folder]?.default || bundledCoreContext[folder];
        if (content && typeof content === 'object') {
            console.log(`@extensions/${folder}/coreContext provides context:`);
            Object.keys(content).forEach((key) => {
                console.log("\tcontext." + folder + '.' + key)
            });
        }
    });

    // Return with .default unwrapped
    const result: Record<string, any> = {};
    Object.keys(bundledCoreContext).forEach(folder => {
        result[folder] = bundledCoreContext[folder]?.default || bundledCoreContext[folder];
    });
    return result;
}

let contexts: Record<string, any> | null = null;

// Synchronous getter - works in both dev and production
const getContexts = (): Record<string, any> => {
    if (contexts === null) {
        // Both modes now use synchronous loading
        contexts = isBundled ? loadContextsStatic() : loadContextsDynamic();
    }
    return contexts;
};

// Kept for backwards compatibility, but no longer needed
export const initCoreContext = async (): Promise<void> => {
    // No-op: context is now loaded synchronously on first access
};

export default new Proxy({} as Record<string, any>, {
    get: (_, prop: string) => getContexts()[prop],
    ownKeys: () => Object.keys(getContexts()),
    getOwnPropertyDescriptor: (_, prop: string) => ({
        enumerable: true,
        configurable: true,
        value: getContexts()[prop]
    }),
    has: (_, prop: string) => prop in getContexts(),
});
