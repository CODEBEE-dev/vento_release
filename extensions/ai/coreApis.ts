import { SystemModel, PlanModel } from "./aiSchemas";
import { AutoAPI, getRoot } from 'protonode';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import * as fspath from 'path';

const systemsDir = (root) => fspath.join(root, "/data/systems/");
const plansDir = (root) => fspath.join(root, "/data/plans/");

// Helper to ensure directory exists
const ensureDir = async (dir: string) => {
    try {
        await fs.access(dir, fs.constants.F_OK);
    } catch (error) {
        await fs.mkdir(dir, { recursive: true });
    }
};

// Custom storage for systems (data/systems/*.md)
const getSystemsDB = (path, req, session) => {
    const db = {
        async *iterator() {
            const dir = systemsDir(getRoot(req));
            await ensureDir(dir);

            const files = (await fs.readdir(dir)).filter(f => {
                return !fsSync.lstatSync(fspath.join(dir, f)).isDirectory() && f.endsWith('.md');
            });

            for (const file of files) {
                const name = file.replace('.md', '');
                const content = await fs.readFile(fspath.join(dir, file), 'utf8');
                yield [name, JSON.stringify({ name, content })];
            }
        },

        async del(key, value) {
            const filePath = fspath.join(systemsDir(getRoot(req)), key + ".md");
            try {
                await fs.unlink(filePath);
            } catch (error) {
                console.log("Error deleting file: " + filePath);
            }
        },

        async put(key, value) {
            const dir = systemsDir(getRoot(req));
            await ensureDir(dir);
            const filePath = fspath.join(dir, key + ".md");
            const data = JSON.parse(value);
            try {
                await fs.writeFile(filePath, data.content || '');
            } catch (error) {
                console.error("Error creating file: " + filePath, error);
            }
        },

        async get(key) {
            const filePath = fspath.join(systemsDir(getRoot(req)), key + ".md");
            try {
                const content = await fs.readFile(filePath, 'utf8');
                return JSON.stringify({ name: key, content });
            } catch (error) {
                throw new Error("File not found");
            }
        }
    };
    return db;
};

// Custom storage for plans (data/plans/*.md and folders)
const getPlansDB = (path, req, session) => {
    const db = {
        async *iterator() {
            const dir = plansDir(getRoot(req));
            await ensureDir(dir);

            const entries = await fs.readdir(dir);

            for (const entry of entries) {
                const fullPath = fspath.join(dir, entry);
                const stat = fsSync.lstatSync(fullPath);

                if (stat.isDirectory()) {
                    // It's a folder - list as a plan group
                    // Count .md files inside to show in description
                    const planFiles = fsSync.readdirSync(fullPath).filter(f => f.endsWith('.md'));
                    yield [entry, JSON.stringify({
                        name: entry,
                        isFolder: true,
                        planCount: planFiles.length,
                        content: `Folder with ${planFiles.length} plans: ${planFiles.map(f => f.replace('.md', '')).join(', ')}`
                    })];
                } else if (entry.endsWith('.md')) {
                    // It's a single plan file
                    const name = entry.replace('.md', '');
                    const content = await fs.readFile(fullPath, 'utf8');
                    yield [name, JSON.stringify({ name, content, isFolder: false })];
                }
            }
        },

        async del(key, value) {
            const filePath = fspath.join(plansDir(getRoot(req)), key + ".md");
            try {
                await fs.unlink(filePath);
            } catch (error) {
                console.log("Error deleting file: " + filePath);
            }
        },

        async put(key, value) {
            const dir = plansDir(getRoot(req));
            await ensureDir(dir);
            const filePath = fspath.join(dir, key + ".md");
            const data = JSON.parse(value);
            try {
                await fs.writeFile(filePath, data.content || '');
            } catch (error) {
                console.error("Error creating file: " + filePath, error);
            }
        },

        async get(key) {
            const dir = plansDir(getRoot(req));
            const folderPath = fspath.join(dir, key);
            const filePath = fspath.join(dir, key + ".md");

            // Check if it's a folder first
            try {
                const stat = fsSync.lstatSync(folderPath);
                if (stat.isDirectory()) {
                    const planFiles = fsSync.readdirSync(folderPath).filter(f => f.endsWith('.md'));
                    return JSON.stringify({
                        name: key,
                        isFolder: true,
                        planCount: planFiles.length,
                        content: `Folder with ${planFiles.length} plans: ${planFiles.map(f => f.replace('.md', '')).join(', ')}`
                    });
                }
            } catch (e) {
                // Not a folder, try as file
            }

            try {
                const content = await fs.readFile(filePath, 'utf8');
                return JSON.stringify({ name: key, content, isFolder: false });
            } catch (error) {
                throw new Error("File not found");
            }
        }
    };
    return db;
};

const SystemsAutoAPI = AutoAPI({
    modelName: 'systems',
    modelType: SystemModel,
    prefix: '/api/core/v1/',
    dbName: 'systems',
    getDB: getSystemsDB,
    permissions: {
        list: 'autopilot.read',
        read: 'autopilot.read',
        create: 'autopilot.execute',
        update: 'autopilot.execute',
        delete: 'autopilot.execute'
    }
});

const PlansAutoAPI = AutoAPI({
    modelName: 'plans',
    modelType: PlanModel,
    prefix: '/api/core/v1/',
    dbName: 'plans',
    getDB: getPlansDB,
    permissions: {
        list: 'autopilot.read',
        read: 'autopilot.read',
        create: 'autopilot.execute',
        update: 'autopilot.execute',
        delete: 'autopilot.execute'
    }
});

export default (app, context) => {
    SystemsAutoAPI(app, context);
    PlansAutoAPI(app, context);
};
