const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist');

// Bundled mode: src/ removed, dist/ already built
if (!fs.existsSync(SRC)) {
    if (fs.existsSync(DIST)) {
        console.log('[protonode] Bundled mode, already built. Skipping.');
        process.exit(0);
    }
    console.error('[protonode] Error: src/ not found and dist/ missing');
    process.exit(1);
}

// Clean dist
if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
}
fs.mkdirSync(DIST);

console.log('[protonode] Building...');

// Bundle and minify with esbuild
esbuild.buildSync({
    entryPoints: [path.join(__dirname, 'src/index.ts')],
    outfile: path.join(DIST, 'index.js'),
    bundle: true,
    minify: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    packages: 'external', // All node_modules external
    external: [
        // Self-reference
        'protonode',
        // Protofy packages
        'protobase',
        // Native/binary modules
        'bcryptjs',
        'bcrypt',
        // Express ecosystem
        'express',
        'cookie-parser',
        'cors',
        'express-list-endpoints',
        // MQTT
        'mqtt',
        // Pino (worker threads)
        'pino',
        'pino-http',
        'pino-pretty',
        // ts-morph (instanceof issues if bundled)
        'ts-morph',
        // JWT
        'jsonwebtoken',
        // Other
        'mrmime',
        'typescript',
    ],
});

const size = (fs.statSync(path.join(DIST, 'index.js')).size / 1024).toFixed(1);
console.log(`[protonode] Done! dist/index.js (${size} KB)`);

// Also build individual lib files for selective imports (client-safe modules)
const LIB_SRC = path.join(SRC, 'lib');
const LIB_DIST = path.join(DIST, 'lib');
fs.mkdirSync(LIB_DIST);

const libFiles = fs.readdirSync(LIB_SRC).filter(f => f.endsWith('.ts') && f !== 'index.ts');

for (const file of libFiles) {
    const name = file.replace('.ts', '');
    esbuild.buildSync({
        entryPoints: [path.join(LIB_SRC, file)],
        outfile: path.join(LIB_DIST, `${name}.js`),
        bundle: true,
        minify: true,
        platform: 'node',
        target: 'node18',
        format: 'cjs',
        packages: 'external',
        external: [
            'protonode', 'protobase', 'bcryptjs', 'bcrypt', 'express', 'cookie-parser',
            'cors', 'express-list-endpoints', 'mqtt', 'pino', 'pino-http', 'pino-pretty',
            'ts-morph', 'jsonwebtoken', 'mrmime', 'typescript',
        ],
    });
}
console.log(`[protonode] Built ${libFiles.length} lib modules`);
