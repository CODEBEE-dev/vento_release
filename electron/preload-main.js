const { contextBridge, ipcRenderer, shell } = require('electron');

(() => {
  const arg = process.argv.find(a => a.startsWith('--session='));
  if (!arg) return;

  const sessionStr = decodeURIComponent(arg.split('=')[1]);

  window.addEventListener('DOMContentLoaded', () => {
    try {
      localStorage.setItem('session', sessionStr);
      document.cookie = `session=${encodeURIComponent(sessionStr)}; path=/`;
      console.log('[preload] ✅ Session set in localStorage and cookie');
    } catch (err) {
      console.error('[preload] ❌ Failed to set session:', err);
    }
  });
})();

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => ipcRenderer.send('open-external-url', url),
  openWindow: (window) => ipcRenderer.send('open-window', { window }),
  refreshWindow: () => ipcRenderer.send('refresh-window'),
  toggleLogWindow: () => ipcRenderer.send('toggle-log-window'),
  downloadAsset: (url, assetName) => {
    ipcRenderer.send('download-asset', { url, assetName })
  }
});

contextBridge.exposeInMainWorld('logAPI', {
  onLog: (callback) => {
    ipcRenderer.on('log', (_event, message) => {
      callback(message);
    });
  }
});

contextBridge.exposeInMainWorld('webcam', {
  arm: async (durationMs = 8000) => {
    await ipcRenderer.invoke('webcam:arm-permission', { durationMs });
    return true;
  },
  listDevices: async () => navigator.mediaDevices.enumerateDevices(),
});
contextBridge.exposeInMainWorld('serial', {
  onChooserOpen: (handler) => {
    const wrapped = (_e, payload) => handler(payload);
    ipcRenderer.on('serial:chooser-open', wrapped);
    return () => ipcRenderer.off('serial:chooser-open', wrapped);
  },
  onChooserUpdate: (handler) => {
    const wrapped = (_e, payload) => handler(payload);
    ipcRenderer.on('serial:chooser-update', wrapped);
    return () => ipcRenderer.off('serial:chooser-update', wrapped);
  },
  choose: (reqId, portId) =>
    ipcRenderer.send('serial:chooser-select', { reqId, portId: String(portId) }),
  cancel: (reqId) =>
    ipcRenderer.send('serial:chooser-select', { reqId, portId: '' }),
});
