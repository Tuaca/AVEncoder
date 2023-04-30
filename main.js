const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

async function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        maxWidth: 850,
        maxHeight: 650,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModules: false,
            sandbox: true,
            preload: path.join(__dirname,'preload.js')
        }
    });
    await mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

console.log('it\'s main.js');

app.whenReady().then(() => {
    createWindow();
    ipcMain.handle('dialog',(event,method,params) => {
        return dialog[method](params);
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});