const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    createProject: (project) => ipcRenderer.send('create-project', project),
    onProjectCreated: (callback) => ipcRenderer.on('create-project-done', (event, data) => callback(data)),

    onProjectStatus: (cb) => ipcRenderer.on('vento:project-status', (_e, payload) => cb(payload)),
    offProjectStatus: (cb) => ipcRenderer.removeListener('vento:project-status', cb),
    clearProjectStatusListeners: () => ipcRenderer.removeAllListeners('vento:project-status'),
});