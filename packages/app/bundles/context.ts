import fs from 'fs';
import machineDefinitions from './stateMachines'
import coreContext from './coreContext'

// __BUNDLED__ is defined by esbuild at build time
declare const __BUNDLED__: boolean | undefined;
const isBundled = typeof __BUNDLED__ !== 'undefined' && __BUNDLED__;

const extensionsPath = '../../extensions';

// Development mode: discover and load contexts dynamically
function loadContextsDynamic(): Record<string, any> {
    const contexts: Record<string, any> = {
        machineDefinitions: {
            ...machineDefinitions
        },
        ...coreContext,
    };

    const folders = fs.readdirSync(extensionsPath);

    for (const folder of folders) {
        const tryPaths = [
            `@extensions/${folder}/context`,
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
    let bundledContext;
    try {
        bundledContext = require('@generated/bundledContext').bundledContext;
    } catch (err: any) {
        console.warn('[context] Failed to load bundled contexts:', err?.message || err);
        // Return base contexts even if bundled extensions fail
        return {
            machineDefinitions: {
                ...machineDefinitions
            },
            ...coreContext,
        };
    }

    const contexts: Record<string, any> = {
        machineDefinitions: {
            ...machineDefinitions
        },
        ...coreContext, // coreContext also loads synchronously now
    };

    // Log what we're loading and add to contexts
    Object.keys(bundledContext).forEach(folder => {
        const content = bundledContext[folder]?.default || bundledContext[folder];
        if (content && typeof content === 'object') {
            console.log(`@extensions/${folder}/context provides context:`);
            Object.keys(content).forEach((key) => {
                console.log("\tcontext." + folder + '.' + key)
            });
            contexts[folder] = content;
        }
    });

    return contexts;
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
export const initContext = async (): Promise<void> => {
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
