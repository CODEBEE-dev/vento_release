import fs from 'fs';

// __BUNDLED__ is defined by esbuild at build time
declare const __BUNDLED__: boolean | undefined;
const isBundled = typeof __BUNDLED__ !== 'undefined' && __BUNDLED__;

const extensionsPath = '../../extensions';

// Development mode: discover and load contexts dynamically
function loadContextsDynamic(): Record<string, any> {
    const contexts: Record<string, any> = {};

    try {
        const folders = fs.readdirSync(extensionsPath);

        for (const folder of folders) {
            const tryPaths = [
                `@extensions/${folder}/boardContext`,
            ];

            for (const tryPath of tryPaths) {
                try {
                    const mod = require(tryPath);
                    console.log(`${tryPath} provides board context:`);
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
    } catch (err) {
        // Extensions directory doesn't exist (e.g., in bundled mode)
    }

    return contexts;
}

// Production mode: load bundled contexts synchronously using require()
function loadContextsStatic(): Record<string, any> {
    try {
        const { bundledBoardContext } = require('@generated/bundledBoardContext');

        const contexts: Record<string, any> = {};
        Object.keys(bundledBoardContext).forEach(folder => {
            const content = bundledBoardContext[folder]?.default || bundledBoardContext[folder];
            if (content && typeof content === 'object') {
                console.log(`@extensions/${folder}/boardContext provides board context:`);
                Object.keys(content).forEach((key) => {
                    console.log("\tcontext." + folder + '.' + key)
                });
                contexts[folder] = content;
            }
        });
        return contexts;
    } catch (err: any) {
        // Log the error instead of silently returning empty
        console.warn('[boardContext] Failed to load bundled board contexts:', err?.message || err);
        console.warn('[boardContext] This may cause issues in forked board processes.');
        return {};
    }
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
export const initBoardContext = async (): Promise<void> => {
    // No-op: context is now loaded synchronously on first access
};

// Named export for getting board context
export const getBoardContext = getContexts;

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
