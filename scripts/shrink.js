//scricpt to shrink the project by removing unnecessary files and directories
//useful to create a smaller package for distribution

const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const { execSync } = require('child_process');

const dirname = path.join(__dirname, '..')

// Remove all AGENTS.md and CLAUDE.md files recursively
function removeAgentsMdFiles(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
            removeAgentsMdFiles(fullPath);
        } else if (entry.isFile() && (entry.name === 'AGENTS.md' || entry.name === 'CLAUDE.md')) {
            fs.unlinkSync(fullPath);
            console.log(`Removed ${entry.name}: ${fullPath}`);
        }
    }
}
removeAgentsMdFiles(dirname);

// Remove .claude directory
const claudeDir = path.join(dirname, '.claude');
if (fs.existsSync(claudeDir)) {
    rimraf.sync(claudeDir);
    console.log('.claude directory has been removed');
}

// Remove node_modules directory
//only if not osx
if (process.platform === 'darwin') {
    console.log('Skipping node_modules removal on macOS');
} else {
    const nodeModulesPath = path.join(dirname, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
        rimraf.sync(nodeModulesPath);
        console.log('node_modules directory has been removed');
    }
}

//remove apps/dendrite/bin
const dendriteBinPath = path.join(dirname, 'apps', 'dendrite', 'bin');
if (fs.existsSync(dendriteBinPath)) {
    rimraf.sync(dendriteBinPath);
    console.log('apps/dendrite/bin directory has been removed');
}

//remove apps/cinny/node_modules
const cinnyNodeModulesPath = path.join(dirname, 'apps', 'cinny', 'node_modules');
if (fs.existsSync(cinnyNodeModulesPath)) {
    rimraf.sync(cinnyNodeModulesPath);
    console.log('apps/cinny/node_modules directory has been removed');
}

//remove apps/clients/expo/node_modules
const expoNodeModulesPath = path.join(dirname, 'apps', 'clients', 'expo', 'node_modules');
if (fs.existsSync(expoNodeModulesPath)) {
    rimraf.sync(expoNodeModulesPath);
    console.log('apps/clients/expo/node_modules directory has been removed');
}

//remove apps/adminpanel
const adminPanel = path.join(dirname, 'apps', 'adminpanel');
if (fs.existsSync(adminPanel)) {
    rimraf.sync(adminPanel);
    console.log('apps/adminpanel directory has been removed');
}

//remove apps/cinny
const cinny = path.join(dirname, 'apps', 'cinny');
if (fs.existsSync(cinny)) {
    rimraf.sync(cinny);
    console.log('apps/cinny directory has been removed');
}

//remove apps/clients
const clients = path.join(dirname, 'apps', 'clients');
if (fs.existsSync(clients)) {
    rimraf.sync(clients);
    console.log('apps/clients directory has been removed');
}

//remove apps/docs
const docs = path.join(dirname, 'apps', 'docs');
if (fs.existsSync(docs)) {
    rimraf.sync(docs);
    console.log('apps/docs directory has been removed');
}

//remove docs/
const docsRoot = path.join(dirname, 'docs');
if (fs.existsSync(docsRoot)) {
    rimraf.sync(docsRoot);
    console.log('docs/ directory has been removed');
}

//remove apps/launcher
const launcher = path.join(dirname, 'apps', 'launcher');
if (fs.existsSync(launcher)) {
    rimraf.sync(launcher);
    console.log('apps/launcher directory has been removed');
}

//remove apps/vento/src
const ventoSrc = path.join(dirname, 'apps', 'vento', 'src');
if (fs.existsSync(ventoSrc)) {
    rimraf.sync(ventoSrc);
    console.log('apps/vento/src directory has been removed');
}

//remove apps/vento/build.js
const ventoBuildJs = path.join(dirname, 'apps', 'vento', 'build.js');
if (fs.existsSync(ventoBuildJs)) {
    fs.unlinkSync(ventoBuildJs);
    console.log('apps/vento/build.js file has been removed');
}

//remove .yarn/cache
const yarnCachePath = path.join(dirname, '.yarn', 'cache');
if (fs.existsSync(yarnCachePath)) {
    rimraf.sync(yarnCachePath);
    console.log('.yarn/cache directory has been removed');
}


//check if its running on windows and remove bin/node-linux and bin/node-macos
const binPathLinux = path.join(dirname, 'bin', 'node-linux');
const binPathMacos = path.join(dirname, 'bin', 'node-macos');
if (process.platform === 'win32') {
    if (fs.existsSync(binPathLinux)) {
        rimraf.sync(binPathLinux);
        console.log('bin/node-linux has been removed');
    }
    if (fs.existsSync(binPathMacos)) {
        rimraf.sync(binPathMacos);
        console.log('bin/node-macos has been removed');
    }
}

//remove .env
// const envPath = path.join(dirname, '.env');
// if (fs.existsSync(envPath)) {
//     fs.unlinkSync(envPath);
//     console.log('.env file has been removed');
// }

//remove data/databases/* (and all its subdirectories and files)
const dataPath = path.join(dirname, 'data', 'databases');
if (fs.existsSync(dataPath)) {
    fs.readdirSync(dataPath).forEach(file => {
        const filePath = path.join(dataPath, file);
        if (fs.lstatSync(filePath).isDirectory()) {
            rimraf.sync(filePath);
            console.log(`Removed directory: ${filePath}`);
        } else {
            fs.unlinkSync(filePath);
            console.log(`Removed file: ${filePath}`);
        }
    });
} else {
    console.log('data/databases directory does not exist');
}

//remove logs/* except for logs/.keep
const logsPath = path.join(dirname, 'logs');
if (fs.existsSync(logsPath)) {
    fs.readdirSync(logsPath).forEach(file => {
        const filePath = path.join(logsPath, file);
        if (file !== '.keep') { // Keep the .keep file
            if (fs.lstatSync(filePath).isDirectory()) {
                rimraf.sync(filePath);
                console.log(`Removed directory: ${filePath}`);
            } else {
                fs.unlinkSync(filePath);
                console.log(`Removed file: ${filePath}`);
            }
        }
    });
}

//remove apps/adminpanel/.tamagui
const tamaguiPath = path.join(dirname, 'apps', 'adminpanel', '.tamagui');
if (fs.existsSync(tamaguiPath)) {
    rimraf.sync(tamaguiPath);
    console.log('.tamagui directory in apps/adminpanel has been removed');
}

//remove settings
const settingsPath = path.join(dirname, 'data', 'settings');
if (fs.existsSync(settingsPath)) {
    fs.readdirSync(settingsPath).forEach(file => {
        const filePath = path.join(settingsPath, file);
        if (fs.lstatSync(filePath).isDirectory()) {
            rimraf.sync(filePath);
            console.log(`Removed directory: ${filePath}`);
        } else {
            fs.unlinkSync(filePath);
            console.log(`Removed file: ${filePath}`);
        }
    });
}

//delete preincluded assets
const assetsPath = path.join(dirname, 'data', 'assets');
if (fs.existsSync(assetsPath)) {
    fs.readdirSync(assetsPath).forEach(file => {
        const filePath = path.join(assetsPath, file);
        if (fs.lstatSync(filePath).isDirectory()) {
            rimraf.sync(filePath);
            console.log(`Removed directory: ${filePath}`);
        } else {
            fs.unlinkSync(filePath);
            console.log(`Removed file: ${filePath}`);
        }
    });
} else {
    console.log('data/assets directory does not exist');
}

//delete the contents of data/keys
const keysPath = path.join(dirname, 'data', 'keys');
if (fs.existsSync(keysPath)) {
    fs.readdirSync(keysPath).forEach(file => {
        const filePath = path.join(keysPath, file);
        if (fs.lstatSync(filePath).isDirectory()) {
            rimraf.sync(filePath);
            console.log(`Removed directory: ${filePath}`);
        } else {
            fs.unlinkSync(filePath);
            console.log(`Removed file: ${filePath}`);
        }
    });
} else {
    console.log('data/keys directory does not exist');
}


//remove data/dendrite/* except for data/dendrite/dendrite.yaml
const dendriteDataPath = path.join(dirname, 'data', 'dendrite');
if (fs.existsSync(dendriteDataPath)) {
    fs.readdirSync(dendriteDataPath).forEach(file => {
        if (file !== 'dendrite.yaml') { // Keep the dendrite.yaml file
            const filePath = path.join(dendriteDataPath, file);
            if (fs.lstatSync(filePath).isDirectory()) {
                rimraf.sync(filePath);
                console.log(`Removed directory: ${filePath}`);
            } else {
                fs.unlinkSync(filePath);
                console.log(`Removed file: ${filePath}`);
            }
        }
    });
} else {
    console.log('data/dendrite directory does not exist');
}
