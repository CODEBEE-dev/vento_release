const path = require('path');
const fs = require('fs');

// Determine node executable based on platform
let node = process.platform === 'win32'
    ? path.join(process.env.NVM_SYMLINK || '', 'node.exe')
    : 'node';

// Fallback for Windows if NVM_SYMLINK not set
if (process.platform === 'win32' && !fs.existsSync(node)) {
    node = 'node';
}

const isFullDev = process.env.FULL_DEV === '1';

module.exports = {
    apps: isFullDev ? [
        // DEVELOPMENT MODE
        {
            name: 'vento-dev',
            script: 'src/index.ts',
            interpreter: node,
            interpreter_args: '--import tsx',
            kill_timeout: 5000,
            restart_delay: 2000,  // GPU processes need delay for cleanup
            autorestart: true,
            env: {
                NODE_ENV: 'development',
            },
            cwd: 'apps/vento',
            out_file: '../../logs/raw/vento-dev.stdout.log',
            error_file: '../../logs/raw/vento-dev.stderr.log',
        }
    ] : [
        // PRODUCTION MODE
        {
            name: 'vento',
            script: 'index.js',
            interpreter: node,
            kill_timeout: 5000,
            restart_delay: 2000,  // GPU processes need delay for cleanup
            autorestart: true,
            env: {
                NODE_ENV: 'production',
            },
            cwd: 'apps/vento',
            out_file: '../../logs/raw/vento.stdout.log',
            error_file: '../../logs/raw/vento.stderr.log',
        }
    ],
};
