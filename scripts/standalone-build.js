#!/usr/bin/env node
/**
 * standalone-build.js
 *
 * Builds the standalone Electron app with a random output directory
 * to avoid "device busy" issues on Windows.
 *
 * Usage: node scripts/standalone-build.js [win|mac|linux]
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const platform = process.argv[2] || 'win';
const randomId = Math.random().toString(36).substring(2, 8);
const outputDir = `../vento-${randomId}`;
const rootDir = path.join(__dirname, '..');
const extractedDir = path.join(rootDir, 'vento-extracted');

console.log(`\n📦 Building standalone for ${platform}...`);
console.log(`📂 Output directory: ${outputDir}\n`);

const platformFlags = {
  win: '--win --x64',
  mac: '--mac --arm64',
  linux: '--linux --x64'
};

const flags = platformFlags[platform] || platformFlags.win;

// Node binary name per platform
const nodeBin = os.platform() === 'win32' ? 'node.exe' : 'node';

async function main() {
  // Build
  console.log('🔨 Running yarn build...');
  execSync('yarn build', { stdio: 'inherit', cwd: rootDir });

  // Extract
  console.log('\n📤 Extracting vento...');
  execSync('yarn standalone-extract', { stdio: 'inherit', cwd: rootDir });

  // Download Node.js binary directly into vento-extracted
  // Run from rootDir (which has node_modules) but target extractedDir
  console.log('\n⬇️  Downloading Node.js binary into vento-extracted...');
  execSync(`yarn download-binaries --target "${extractedDir}"`, { stdio: 'inherit', cwd: rootDir });

  // Path to the downloaded node
  const nodeExe = path.join(extractedDir, 'bin', nodeBin);
  const yarnCjs = path.join(extractedDir, '.yarn', 'releases', 'yarn-4.1.0.cjs');

  if (!fs.existsSync(nodeExe)) {
    console.error(`❌ Node binary not found at ${nodeExe}`);
    process.exit(1);
  }

  // Add node binary dir to PATH so child processes find the right node
  const nodeBinDir = path.join(extractedDir, 'bin');
  const pathSep = os.platform() === 'win32' ? ';' : ':';
  const envWithNode = {
    ...process.env,
    PATH: nodeBinDir + pathSep + process.env.PATH
  };

  const nodeCmd = `"${nodeExe}"`;
  const yarnCmd = `"${yarnCjs}"`;

  console.log('\n📦 Installing dependencies in vento-extracted (using downloaded Node)...');
  execSync(`${nodeCmd} ${yarnCmd} install`, { stdio: 'inherit', cwd: extractedDir, env: envWithNode });
  console.log('✅ Dependencies installed.');

  console.log('\n📦 Running prepare-dev in vento-extracted (this may take a while)...');
  execSync(`${nodeCmd} ${yarnCmd} prepare-dev`, { stdio: 'inherit', cwd: extractedDir, env: envWithNode });
  console.log('✅ prepare-dev complete.');

  // Package with random output dir
  console.log('\n📦 Packaging with electron-builder...');
  const cmd = `electron-builder -c electron-builder.standalone.yml ${flags} -c.directories.output=${outputDir}`;
  execSync(cmd, { stdio: 'inherit', cwd: rootDir });

  // Create empty directories that electron-builder doesn't copy (because they only have dotfiles)
  console.log('\n📁 Creating empty data directories...');
  const ventoDataDir = path.join(rootDir, outputDir, 'win-unpacked', 'resources', 'vento', 'data');
  const emptyDirs = ['databases', 'keys', 'models', 'settings', 'system', 'tmp', 'versions'];
  for (const dir of emptyDirs) {
    const dirPath = path.join(ventoDataDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`  ✅ Created: data/${dir}`);
    }
  }
  // Also create logs/raw
  const logsRawDir = path.join(rootDir, outputDir, 'win-unpacked', 'resources', 'vento', 'logs', 'raw');
  if (!fs.existsSync(logsRawDir)) {
    fs.mkdirSync(logsRawDir, { recursive: true });
    console.log(`  ✅ Created: logs/raw`);
  }

  console.log(`\n✅ Build complete! Output: ${outputDir}`);
}

main().catch(err => {
  console.error('\n❌ Build failed:', err.message);
  process.exit(1);
});
