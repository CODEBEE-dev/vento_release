// download-apk.js - Download Android client APK from GitHub releases
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const apkPath = path.join(rootDir, 'data', 'public', 'clients', 'vento-client.apk');
const url = 'https://github.com/Protofy-xyz/Vento/releases/download/development/vento-client.apk';

async function downloadApk(options = {}) {
    const { force = false } = options;

    if (fs.existsSync(apkPath) && !force) {
        console.log('✅ Android client APK already present');
        return { success: true, skipped: true };
    }

    try {
        console.log('Downloading Android client...');
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }

        const data = await response.arrayBuffer();
        fs.writeFileSync(apkPath, Buffer.from(data));
        console.log('✅ Android client downloaded!');
        return { success: true };
    } catch (error) {
        console.error('Failed to download Android client:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = { downloadApk };

// Run directly
if (require.main === module) {
    const force = process.argv.includes('--force');
    downloadApk({ force }).then(result => {
        if (!result.success) process.exit(1);
    });
}
