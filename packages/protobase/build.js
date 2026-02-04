const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist');

// Bundled mode: src/ removed, dist/ already built
if (!fs.existsSync(SRC)) {
    if (fs.existsSync(DIST)) {
        console.log('[protobase] Bundled mode, already built. Skipping.');
        process.exit(0);
    }
    console.error('[protobase] Error: src/ not found and dist/ missing');
    process.exit(1);
}

// Clean dist
if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
}
fs.mkdirSync(DIST);

console.log('[protobase] Building...');

// Bundle and minify with esbuild
esbuild.buildSync({
    entryPoints: [path.join(__dirname, 'src/index.ts')],
    outfile: path.join(DIST, 'index.js'),
    bundle: true,
    minify: true,
    platform: 'neutral',
    target: 'es2020',
    format: 'cjs',
    external: [
        'bcryptjs',
        'handlebars',
        'jsonwebtoken',
        'moment',
        'pino',
        'pino-pretty',
        'zod',
    ],
});

const size = (fs.statSync(path.join(DIST, 'index.js')).size / 1024).toFixed(1);
console.log(`[protobase] Done! dist/index.js (${size} KB)`);
