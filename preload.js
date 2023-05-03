const {ipcRenderer , contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    openDialog:(method,config) => ipcRenderer.invoke('dialog', method, config),
    invoke:(channel, args) => ipcRenderer.invoke(channel, args),
    send:(channel, args) => ipcRenderer.send(channel, args),
    on:(channel, callback) => {
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
});