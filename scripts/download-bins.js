const fs = require('fs');
const https = require('https');
const path = require('path');
const os = require('os');
const { chmodSync, renameSync, unlinkSync, mkdirSync, existsSync } = fs;

module.exports = async function downloadBins(AdmZip, tar, targetDir = null) {
  // targetDir allows overriding the output directory (for standalone builds)
  const baseDir = targetDir || path.join(__dirname, '..');
  const version = 'v20.17.0';
  const baseUrl = `https://nodejs.org/dist/${version}`;

  const targets = {
    win: {
      url: `${baseUrl}/node-${version}-win-x64.zip`,
      out: 'node.exe',
      extract: async (archivePath, outputPath) => {
        const zip = new AdmZip(archivePath);
        const entry = zip.getEntries().find(e => e.entryName.endsWith('node.exe'));
        if (!entry) throw new Error('❌ node.exe not found in zip');
        zip.extractEntryTo(entry.entryName, path.dirname(outputPath), false, true);
        renameSync(path.join(path.dirname(outputPath), 'node.exe'), outputPath);
      }
    },
    linuxX64: {
      url: `${baseUrl}/node-${version}-linux-x64.tar.gz`,
      out: 'node',
      extract: async (archivePath, outputPath) => {
        await tar.x({
          file: archivePath,
          cwd: path.dirname(outputPath),
          filter: p => p.endsWith('/bin/node'),
          strip: 1,
        });
        const extracted = path.join(path.dirname(outputPath), 'bin', 'node');
        renameSync(extracted, outputPath);
        chmodSync(outputPath, 0o755);
      }
    },
    linuxArm64: {
      url: `${baseUrl}/node-${version}-linux-arm64.tar.gz`,
      out: 'node',
      extract: async (archivePath, outputPath) => {
        await tar.x({
          file: archivePath,
          cwd: path.dirname(outputPath),
          filter: p => p.endsWith('/bin/node'),
          strip: 1,
        });
        const extracted = path.join(path.dirname(outputPath), 'bin', 'node');
        renameSync(extracted, outputPath);
        chmodSync(outputPath, 0o755);
      }
    },
    mac: {
      url: `${baseUrl}/node-${version}-darwin-arm64.tar.gz`,
      out: 'node',
      extract: async (archivePath, outputPath) => {
        await tar.x({
          file: archivePath,
          cwd: path.dirname(outputPath),
          filter: p => p.endsWith('/bin/node'),
          strip: 1,
        });
        const extracted = path.join(path.dirname(outputPath), 'bin', 'node');
        renameSync(extracted, outputPath);
        chmodSync(outputPath, 0o755);
      }
    }
  };

  async function download(url, dest) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      https.get(url, response => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', reject);
    });
  }

  async function setupPlatform(key, config) {
    const archivePath = path.join(baseDir, 'bin', path.basename(config.url));
    const finalPath = path.join(baseDir, 'bin', config.out);

    if (fs.existsSync(finalPath)) {
      console.log(`✅ ${key} already exists -> ${config.out}`);
      return;
    }

    console.log(`⬇️  Downloading ${key} into ${archivePath}...`);
    await download(config.url, archivePath);

    console.log(`📦 Extracting ${key}...`);
    try {
      await config.extract(archivePath, finalPath);
    } catch (err) {
      console.error(`❌ Error extracting ${key}:`, err);
      return;
    }

    console.log(`🧹 Deleting temporary file ${path.basename(archivePath)}`);
    unlinkSync(archivePath);
    console.log(`✅ ${key} ready -> ${config.out}`);
  }

  async function main() {
    const binDir = path.join(baseDir, 'bin');
    if (!existsSync(binDir)) mkdirSync(binDir, { recursive: true });
    const arch = process.arch;
    //check if running on Windows
    if (process.platform === 'win32') {
      await setupPlatform('win', targets.win);
    } else if (process.platform === 'linux') {
       if (arch === 'arm64') {
        await setupPlatform('linux-arm64 (RPi5)', targets.linuxArm64);
      } else if (arch === 'x64') {
        await setupPlatform('linux-x64', targets.linuxX64);
      // } else if (arch === 'arm') {
      //   await setupPlatform('linux-armv7l', targets.linuxArmv7l);
      } else {
        throw new Error(`Unsupported Linux arch: ${arch}`);
      }
    } else if (process.platform === 'darwin') {
      await setupPlatform('mac', targets.mac);
    }
  }
  return main().catch(err => {
    console.error('❌ General Error:', err);
  });

}

// Si se ejecuta directamente desde consola: node scripts/download-bins.js [--target <dir>]
if (require.main === module) {
  const AdmZip = require('adm-zip');
  const tar = require('tar');

  // Parse --target argument
  const args = process.argv.slice(2);
  const targetIndex = args.indexOf('--target');
  const targetDir = targetIndex !== -1 && args[targetIndex + 1]
    ? args[targetIndex + 1]
    : null;

  module.exports(AdmZip, tar, targetDir).then(() => {
    console.log('✅ Done');
    process.exit(0);
  }).catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
}

