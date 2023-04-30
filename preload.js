const {ipcRenderer , contextBridge } = require('electron');

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
    // we can also expose variables, not just functions
})

console.log('preload.js loaded');

/*contextBridge.exposeInMainWorld('electron', {
    openDialog:(method,config) => ipcRenderer.invoke('dialog', method, config)
});*/