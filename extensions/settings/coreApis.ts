import { SettingModel } from "./";
import { AutoAPI, getRoot, handler } from 'protonode'
import { hasPermission } from 'protobase'
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import * as fspath from 'path';


const dataDir = (root) => fspath.join(root, "/data/settings/")
const initialData = {
    "ai.enabled": {
        "name": "ai.enabled",
        "value": "true",
    }
}

const connectDB = (dbPath: string, initialData?: Object, options?) => {
    try {
        const dirPath = dataDir(getRoot());
        Object.keys(initialData).map(key => {
            const setting = initialData[key]
            fs.writeFile(fspath.join(dirPath, setting.name), JSON.stringify(setting.value))
        })
    } catch (err) {
        console.error("cannot connect to settings db: ", err)
    }
}

const getDB = (path, req, session) => {
    const dirPath = dataDir(getRoot(req));
    fs.mkdir(dirPath, { recursive: true }).catch((err) => {
        console.error("Error ensuring settings folder exists", err);
    });

    const db = {
        async *iterator() {
            const files = (await fs.readdir(dirPath)).filter(f => {
                return !f.startsWith('.') && !fsSync.lstatSync(fspath.join(dirPath, f)).isDirectory()
            })
            // console.log("Files: ", files)
            for (const file of files) {
                //read file content
                try {
                    const fileContent = await fs.readFile(dirPath + file, 'utf8')
                    if (!fileContent || fileContent.trim() === '') {
                        console.warn(`Skipping empty settings file: ${file}`)
                        continue
                    }
                    yield [file, JSON.stringify({ value: JSON.parse(fileContent), name: file })]
                } catch (parseError) {
                    console.warn(`Skipping invalid settings file: ${file}`, parseError.message)
                    continue
                }
            }
        },

        async del(key, value) {
            if (key == 'all') {
                throw new Error("Cannot modify 'all' key")
            }
            console.log("Deleting key: ", JSON.stringify({ key, value }))
            const filePath = fspath.join(dirPath, key);
            try {
                await fs.unlink(filePath)
            } catch (error) {
                console.log("Error deleting file: " + filePath)
            }
        },

        async put(key, value) {
            if (key == 'all') {
                throw new Error("Cannot modify 'all' key")
            }
            // Validate key name for filesystem safety
            // Reject names with characters invalid for filenames on Windows/Unix
            const invalidChars = /[<>:"/\\|?*\x00-\x1f]/
            if (invalidChars.test(key)) {
                throw new Error(`Invalid setting name: contains invalid characters`)
            }
            const filePath = fspath.join(dirPath, key);
            const parsedValue = JSON.parse(value);
            try {
                console.log('writing: ', filePath, parsedValue)
                await fs.writeFile(filePath, JSON.stringify(parsedValue.value))
            } catch (error) {
                console.error("Error creating file: " + filePath, error)
                throw error // Re-throw so the API returns an error response
            }
        },

        async get(key) {

            const filePath = fspath.join(dirPath, key);
            try {
                const fileContent = await fs.readFile(filePath, 'utf8')
                return JSON.stringify({ value: JSON.parse(fileContent), name: key })  
            } catch (error) {
                throw new Error("File not found: " + filePath)
            }
        }
    };

    return db;
}

const SettingsAutoAPI = AutoAPI({
    modelName: 'settings',
    modelType: SettingModel,
    prefix: '/api/core/v1/',
    dbName: 'settings',
    connectDB: connectDB,
    getDB: getDB,
    initialData: initialData,
    permissions: {
        list: 'settings.read',
        read: 'settings.read',
        create: 'settings.update',
        update: 'settings.update',
        delete: 'settings.update'
    },
    allowUpsert: true
})

export default (app, context) => {
    SettingsAutoAPI(app, context)
    const getSettings = async (req) => {
        const db = getDB('settings', req, null);
        let combined = {};
        for await (const [file, content] of db.iterator()) {
            const { name, value } = JSON.parse(content)
            combined = { ...combined, [name]: value }
        }
        return combined
    }

    app.get('/api/core/v1/settings/all', handler(async (req, res, session) => {
        hasPermission(session, 'settings.read')
        //iterate over dirPath and combine all json files in a single response
        const settings = await getSettings(req);
        res.json(settings);
    }));

    app.get('/api/core/v1/settings.js', handler(async (req, res, session) => {
        hasPermission(session, 'settings.read')
        const settings = await getSettings(req);

        // cache: ajusta a tus necesidades
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');

        // seguridad básica si usas CSP: sólo si tu CSP lo permite
        // res.setHeader('Content-Security-Policy', "script-src 'self' ...");

        // Puedes incluir versión/hash si tienes un "settingsVersion" en DB
        const payload = JSON.stringify(settings);
        res.send(
            `;(function(){
        try {
          window.ventoSettings = ${payload};
          var ev = new CustomEvent('vento:settings-ready', { detail: window.ventoSettings });
          window.dispatchEvent(ev);
        } catch(e) { /* noop */ }
      })();`
        );
    }));
}