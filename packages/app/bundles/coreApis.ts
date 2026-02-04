import fs from 'fs';
import path from 'path';

// __BUNDLED__ is defined by esbuild at build time
declare const __BUNDLED__: boolean | undefined;
const isBundled = typeof __BUNDLED__ !== 'undefined' && __BUNDLED__;

const extensionsPath = '../../extensions';

// Development mode: discover and load extensions dynamically
async function loadApisDynamic(): Promise<Record<string, any>> {
    const apis: Record<string, any> = {};
    const files = fs.readdirSync(extensionsPath);

    await Promise.all(
        files.map(async (extension) => {
            const filePath = path.join(extensionsPath, extension, 'coreApis');
            if (fs.existsSync(filePath + '.ts') || fs.existsSync(path.join(filePath, 'index.ts'))) {
                try {
                    const apiModule = await import('@extensions/' + extension + '/coreApis');
                    if (typeof apiModule.default === 'function') {
                        apis[extension] = apiModule.default;
                    } else {
                        console.warn(`API module in ${filePath} is not a function`);
                    }
                } catch (error) {
                    console.error(`Error loading API from ${filePath}:`, error);
                }
            }
        })
    );

    return apis;
}

// Production mode: import bundled extensions (injected by esbuild)
async function loadApisStatic(): Promise<Record<string, any>> {
    // This import path is resolved by esbuild alias '@generated'
    const { bundledCoreApis } = await import('@generated/bundledCoreApis');
    return bundledCoreApis;
}

export default async (app, context) => {
    let apis: Record<string, any>;

    if (isBundled) {
        console.log('Loading APIs from bundle (production mode)');
        apis = await loadApisStatic();
    } else {
        console.log('Loading APIs dynamically (development mode)');
        apis = await loadApisDynamic();
    }

    Object.keys(apis).forEach((apiName) => {
        try {
            const api = apis[apiName];
            if (typeof api === 'function') {
                console.log(`Initializing API: ${apiName}`);
                api(app, context);
            } else {
                console.warn(`API ${apiName} is not a function`);
            }
        } catch (error) {
            console.error(`Error initializing API ${apiName}:`, error);
        }
    });
}
