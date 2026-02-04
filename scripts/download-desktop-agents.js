// download-desktop-agents.js - Download desktop agent binaries from GitHub releases
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const desktopDir = path.join(rootDir, 'data', 'public', 'clients', 'desktop');
const baseUrl = 'https://github.com/Protofy-xyz/Vento/releases/download/development/';

const agents = [
    'ventoagent-darwin-amd64',
    'ventoagent-darwin-arm64',
    'ventoagent-linux-amd64',
    'ventoagent-linux-arm64',
    'ventoagent-linux-armv7',
    'ventoagent-windows-amd64.exe',
    'ventoagent-windows-arm64.exe'
];

async function downloadDesktopAgents(options = {}) {
    const { force = false } = options;

    // Ensure directory exists
    if (!fs.existsSync(desktopDir)) {
        fs.mkdirSync(desktopDir, { recursive: true });
    }

    let allSuccess = true;

    for (const agent of agents) {
        const destPath = path.join(desktopDir, agent);

        if (fs.existsSync(destPath) && !force) {
            continue; // Already exists
        }

        try {
            console.log(`Downloading ${agent}...`);
            const response = await fetch(`${baseUrl}${agent}`);

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.arrayBuffer();
            fs.writeFileSync(destPath, Buffer.from(data));
            console.log(`✅ ${agent} downloaded!`);
        } catch (error) {
            console.error(`Failed to download ${agent}: ${error.message}`);
            allSuccess = false;
        }
    }

    if (allSuccess) {
        console.log('✅ All desktop agents ready');
    }

    return { success: allSuccess };
}

module.exports = { downloadDesktopAgents };

// Run directly
if (require.main === module) {
    const force = process.argv.includes('--force');
    downloadDesktopAgents({ force }).then(result => {
        if (!result.success) process.exit(1);
    });
}
