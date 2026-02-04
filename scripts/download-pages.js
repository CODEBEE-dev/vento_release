// download-pages.js - Download compiled pages from GitHub releases
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const rootDir = path.resolve(__dirname, '..');
const pagesDir = path.join(rootDir, 'data', 'pages');
const url = 'https://github.com/Protofy-xyz/Vento/releases/download/development/vento-pages.zip';

async function downloadPages(options = {}) {
    const { force = false } = options;

    if (fs.existsSync(pagesDir) && !force) {
        console.log('✅ Pages already present');
        return { success: true, skipped: true };
    }

    if (!fs.existsSync(pagesDir)) {
        fs.mkdirSync(pagesDir, { recursive: true });
    }

    const maxRetries = 3;
    const retryDelay = 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Downloading pages (attempt ${attempt}/${maxRetries})...`);
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
            }

            console.log('Download complete, extracting...');
            const zip = await response.arrayBuffer();
            const zipFile = new AdmZip(Buffer.from(zip));
            zipFile.extractAllTo(rootDir);
            console.log('✅ Pages extracted successfully!');
            return { success: true };
        } catch (error) {
            console.error(`Attempt ${attempt} failed: ${error.message}`);
            if (attempt < maxRetries) {
                console.log(`Retrying in ${retryDelay / 1000}s...`);
                await new Promise(r => setTimeout(r, retryDelay));
            } else {
                console.error('All download attempts failed.');
                return { success: false, error: error.message };
            }
        }
    }
}

module.exports = { downloadPages };

// Run directly
if (require.main === module) {
    const force = process.argv.includes('--force');
    downloadPages({ force }).then(result => {
        if (!result.success) process.exit(1);
    });
}
