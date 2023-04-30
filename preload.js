const {ipcRenderer , contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    openDialog:(method,config) => ipcRenderer.invoke('dialog', method, config),
    invoke:(channel, args) => ipcRenderer.invoke(channel, args)
});