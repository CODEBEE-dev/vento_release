
import { fork } from 'child_process';
import * as path from 'path';
import { watch } from 'chokidar';
import { on } from 'events';
import { getLogger } from 'protobase';
import boardContext from 'app/bundles/boardContext';

const logger = getLogger()

const processes = new Map();
// Track which processes have confirmed init
const initializedProcesses = new Set<string>();
// Queue of pending updates per file (sent before init confirmed)
const pendingUpdates = new Map<string, Array<{ chunk: any, key?: any, value?: any }>>();

let watchers = {}
export const Manager = {
    start: async (file, getContext, onExit, skipWatch?) => {
        const context = getContext ? await getContext() : {};
        if (processes.has(file)) {
            if (processes.get(file).killed) {
                processes.delete(file);
                initializedProcesses.delete(file);
                pendingUpdates.delete(file);
            } else {
                console.warn(`Manager: Process for "${file}" already running.`);
                return false;
            }
        }

        const absPath = path.resolve(file);
        const child = fork(absPath, [], {
            windowsHide: true
        });

        // Guardamos el proceso
        processes.set(file, child);
        // Initialize pending updates queue
        pendingUpdates.set(file, []);

        // Validate boardContext before sending
        const expandedBoardContext = { ...boardContext };
        if (Object.keys(expandedBoardContext).length === 0) {
            console.warn(`[Manager] Warning: boardContext is empty for ${file}. This may cause issues.`);
        }

        // Enviar estado inicial (incluye boardContext para evitar require en el fork)
        child.send({ type: 'init', context, boardContext: expandedBoardContext });

        // Escuchar mensajes del hijo
        child.on('message', (msg: any) => {
            if (msg?.type === 'init_confirmed') {
                // Child has processed init, mark as ready and flush pending updates
                initializedProcesses.add(file);
                const pending = pendingUpdates.get(file) || [];
                if (pending.length > 0) {
                    console.log(`[Manager] Flushing ${pending.length} pending updates for ${file}`);
                    pending.forEach(({ chunk, key, value }) => {
                        child.send({ type: 'update', chunk, key, value });
                    });
                }
                pendingUpdates.delete(file);
            } else {
                console.log(`[Manager] Message from ${file}:`, msg);
            }
        });

        // Limpieza si el hijo se cierra
        child.on('exit', (code) => {
            console.log(`[Manager] board file ${file} exited with code ${code}`);
            if(code) {
                logger.info(`Autopilot crashed for file: ${file} with code ${code}`);
            }
            processes.delete(file);
            initializedProcesses.delete(file);
            pendingUpdates.delete(file);
            onExit && onExit(file, code);
            //remove watcher
            if(watchers[file]) {
                watchers[file].close();
                delete watchers[file];
            }
        });

        if(skipWatch) {
            return true;
        }
        //set watcher for file changes
        let timer = null;
        watchers[file] = watch(file, { persistent: true, ignoreInitial: true })
            .on('change', (changedFile) => {
                console.log(`[Manager] File changed: ${changedFile}`);
                if (timer) {
                    clearTimeout(timer);
                }
                timer = setTimeout(() => {
                    if (!processes.has(file)) {
                        console.warn(`[Manager] No process found for file ${file}, skipping restart.`);
                        return;
                    }
                    console.log(`[Manager] Stopping board file ${file} due to change`);
                    Manager.stop(file);
                    setTimeout(() => {
                        console.log(`[Manager] Restarting board file ${file}`);
                        // Restart the process
                        Manager.start(file, getContext, onExit, false); // last param at true leads to boards only updating on the first change
                    }, 500);
                }, 1000);

            })
            .on('error', (error) => {
                console.error(`[Manager] Error watching file ${file}:`, error);
            });

        return true
    },

    stop: (file) => {
        const child = processes.get(file);
        if (child) {
            processes.delete(file);
            initializedProcesses.delete(file);
            pendingUpdates.delete(file);
            child.kill();
            return true
        } else {
            return false
        }
    },

    isRunning: (file) => {
        const child = processes.get(file);
        return !!child && !child.killed;
    },

    update: (file, chunk, key?, value?) => {
        const child = processes.get(file);
        if (child) {
            // If child hasn't confirmed init yet, queue the update
            if (!initializedProcesses.has(file)) {
                const pending = pendingUpdates.get(file);
                if (pending) {
                    pending.push({ chunk, key, value });
                    return;
                }
            }
            child.send({ type: 'update', chunk, key, value });
        }
    }
};